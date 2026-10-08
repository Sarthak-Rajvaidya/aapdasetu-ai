import json
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.database import get_db
from app.models import models
from app.schemas import schemas
from app.services import scoring
from app.services.achievements import evaluate_achievements
from app.rag.retriever import retriever
from app.rag.prompt import build_prompt, extractive_fallback_answer
from app.services.llm import generate as llm_generate

router = APIRouter(prefix="/api/simulations", tags=["simulations"])

SIM_DATA_DIR = Path(__file__).resolve().parent.parent / "simulations_data"


def _load_scenario(slug: str) -> dict:
    path = SIM_DATA_DIR / f"{slug}.json"
    if not path.exists():
        raise HTTPException(404, "Simulation scenario not found")
    return json.loads(path.read_text(encoding="utf-8"))


def _public_scenario(scenario: dict) -> dict:
    """Strips answer-revealing fields (correct/mistake/safety/resource flags) before sending to the client."""
    public = {k: v for k, v in scenario.items() if k != "steps"}
    public["steps"] = [
        {
            "id": step["id"],
            "title": step["title"],
            "narrative": step["narrative"],
            "options": [{"id": o["id"], "text": o["text"]} for o in step["options"]],
        }
        for step in scenario["steps"]
    ]
    return public


@router.get("")
def list_simulations(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    sims = db.query(models.Simulation).all()
    best_scores = {}
    for attempt in db.query(models.SimulationAttempt).filter(models.SimulationAttempt.user_id == current_user.id):
        best_scores[attempt.simulation_id] = max(best_scores.get(attempt.simulation_id, 0), attempt.score)

    return [
        {
            "id": s.id,
            "slug": s.slug,
            "codename": s.codename,
            "disaster_type": s.disaster_type,
            "difficulty": s.difficulty,
            "estimated_duration_minutes": s.estimated_duration_minutes,
            "description": s.description,
            "best_score": best_scores.get(s.id),
        }
        for s in sims
    ]


@router.get("/{slug}")
def get_simulation(slug: str, db: Session = Depends(get_db), _current_user: models.User = Depends(get_current_user)):
    sim = db.query(models.Simulation).filter(models.Simulation.slug == slug).first()
    if not sim:
        raise HTTPException(404, "Simulation not found")
    scenario = _load_scenario(slug)
    return _public_scenario(scenario)


@router.post("/{slug}/submit", response_model=schemas.SimulationResultOut)
def submit_simulation(
    slug: str,
    payload: schemas.SimulationSubmission,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    sim = db.query(models.Simulation).filter(models.Simulation.slug == slug).first()
    if not sim:
        raise HTTPException(404, "Simulation not found")

    scenario = _load_scenario(slug)
    decisions = [(d.step_id, d.option_id, d.time_taken_seconds) for d in payload.decisions]

    result = scoring.score_attempt(scenario, decisions, payload.total_time_seconds)
    recommended_training = scoring.recommended_training_for(sim.disaster_type, result["score"])

    attempt = models.SimulationAttempt(
        user_id=current_user.id,
        simulation_id=sim.id,
        score=result["score"],
        decision_accuracy=result["decision_accuracy"],
        response_time_score=result["response_time_score"],
        safety_awareness=result["safety_awareness"],
        resource_management=result["resource_management"],
        correct_decisions=result["correct_decisions"],
        total_decisions=result["total_decisions"],
        mistakes=result["mistakes"],
        decisions_log=[{"step_id": d[0], "option_id": d[1]} for d in decisions],
        completion_time_seconds=payload.total_time_seconds,
        difficulty=sim.difficulty,
    )

    # Grounded AI feedback: retrieve relevant safety docs for this disaster type
    # and (if available) an LLM synthesizes a short note; otherwise we build a
    # deterministic, still-grounded note from the actual recorded mistakes.
    chunks = retriever.retrieve(f"{sim.disaster_type} safety mistakes", k=2, disaster_hint=sim.disaster_type)
    if result["mistakes"]:
        feedback_question = (
            f"The learner completed the {sim.disaster_type} simulation with a score of "
            f"{result['score']}%. Their recorded mistakes were: {'; '.join(result['mistakes'])}. "
            f"Write 2-3 sentences of specific, encouraging feedback grounded in the safety context."
        )
        llm_reply = llm_generate(build_prompt(feedback_question, chunks))
        ai_feedback = llm_reply or (
            f"You scored {result['score']}% on {sim.disaster_type} readiness. "
            f"Key area to review: {result['mistakes'][0]}"
        )
    else:
        ai_feedback = (
            f"Strong run — {result['score']}% with no recorded safety mistakes. "
            f"Your decisions matched established {sim.disaster_type.lower()} safety guidance throughout."
        )
    attempt.ai_feedback = ai_feedback

    db.add(attempt)
    db.commit()

    new_achievements = evaluate_achievements(db, current_user)

    return schemas.SimulationResultOut(
        score=result["score"],
        decision_accuracy=result["decision_accuracy"],
        response_time_score=result["response_time_score"],
        safety_awareness=result["safety_awareness"],
        resource_management=result["resource_management"],
        correct_decisions=result["correct_decisions"],
        total_decisions=result["total_decisions"],
        mistakes=result["mistakes"],
        critical_mistake=result["critical_mistake"],
        recommended_training=recommended_training,
        ai_feedback=ai_feedback,
        new_achievements=new_achievements,
    )
