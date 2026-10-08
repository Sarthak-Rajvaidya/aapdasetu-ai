from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.database import get_db
from app.models import models
from app.schemas import schemas
from app.rag.retriever import retriever
from app.rag.prompt import build_prompt, extractive_fallback_answer
from app.services.llm import generate as llm_generate
from app.services.readiness import compute_readiness

router = APIRouter(prefix="/api/ai", tags=["ai-assistant"])

SUGGESTED_PROMPTS = [
    "What should I keep in an emergency kit?",
    "What should I do during an earthquake?",
    "How should I prepare for flooding?",
    "When should I evacuate during a wildfire?",
    "What should I do after an earthquake?",
]


def _weakest_disaster_context(db: Session, user: models.User) -> str | None:
    """Builds a short, privacy-safe context string from the user's OWN data only."""
    attempts = user.simulation_attempts
    if not attempts:
        return None
    worst = min(attempts, key=lambda a: a.safety_awareness)
    if worst.safety_awareness >= 80:
        return None
    disaster_type = worst.simulation.disaster_type if worst.simulation else "a recent simulation"
    return (
        f"This user's weakest recorded simulation performance is {disaster_type} "
        f"(safety awareness {worst.safety_awareness}%). Only mention this if it is "
        f"directly relevant to their question."
    )


@router.get("/suggested-prompts")
def suggested_prompts():
    return {"prompts": SUGGESTED_PROMPTS}


@router.post("/chat", response_model=schemas.ChatResponse)
def chat(
    payload: schemas.ChatRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    session = None
    if payload.session_id:
        session = (
            db.query(models.ChatSession)
            .filter(models.ChatSession.id == payload.session_id, models.ChatSession.user_id == current_user.id)
            .first()
        )
    if not session:
        session = models.ChatSession(user_id=current_user.id, title=payload.message[:60])
        db.add(session)
        db.commit()
        db.refresh(session)

    db.add(models.ChatMessage(session_id=session.id, role="user", content=payload.message))
    db.commit()

    chunks = retriever.retrieve(payload.message, k=3)
    user_context = _weakest_disaster_context(db, current_user)

    llm_reply = llm_generate(build_prompt(payload.message, chunks, user_context))
    if llm_reply:
        reply, provider = llm_reply, "gemini"
    else:
        reply, provider = extractive_fallback_answer(payload.message, chunks), "extractive-fallback"

    sources = [{"title": c.title, "disaster_type": c.disaster_type} for c in chunks]

    db.add(models.ChatMessage(session_id=session.id, role="assistant", content=reply, sources=sources))
    db.commit()

    return schemas.ChatResponse(session_id=session.id, reply=reply, sources=sources, provider=provider)


@router.get("/sessions")
def list_sessions(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    sessions = (
        db.query(models.ChatSession)
        .filter(models.ChatSession.user_id == current_user.id)
        .order_by(models.ChatSession.created_at.desc())
        .all()
    )
    return [{"id": s.id, "title": s.title, "created_at": s.created_at} for s in sessions]


@router.get("/sessions/{session_id}")
def get_session(session_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    session = (
        db.query(models.ChatSession)
        .filter(models.ChatSession.id == session_id, models.ChatSession.user_id == current_user.id)
        .first()
    )
    if not session:
        return {"error": "not found"}
    return {
        "id": session.id,
        "title": session.title,
        "messages": [
            {"role": m.role, "content": m.content, "sources": m.sources, "created_at": m.created_at}
            for m in session.messages
        ],
    }
