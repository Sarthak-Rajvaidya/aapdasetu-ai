"""
Disaster Readiness Score.

Computed entirely from real stored data — never an arbitrary number. The
same weights are shown in the dashboard UI so the formula is transparent
to the user (see /api/dashboard and the frontend dashboard page).

    Knowledge            = average quiz score
    Decision Making      = average simulation decision-accuracy
    Emergency Response   = average simulation safety-awareness score
    Disaster Awareness   = average course completion percentage

    Overall Readiness    = equal-weighted average of the four pillars
"""
from sqlalchemy.orm import Session

from app.models import models


def _avg(values):
    values = [v for v in values if v is not None]
    return round(sum(values) / len(values)) if values else 0


def compute_readiness(db: Session, user: models.User) -> dict:
    quiz_scores = [q.score for q in user.quiz_attempts]
    sim_decision = [s.decision_accuracy for s in user.simulation_attempts]
    sim_safety = [s.safety_awareness for s in user.simulation_attempts]
    course_progress = [cp.progress for cp in user.course_progress]

    knowledge = _avg(quiz_scores)
    decision_making = _avg(sim_decision)
    emergency_response = _avg(sim_safety)
    disaster_awareness = _avg(course_progress)

    overall = _avg([knowledge, decision_making, emergency_response, disaster_awareness])

    return {
        "overall": overall,
        "knowledge": knowledge,
        "decision_making": decision_making,
        "emergency_response": emergency_response,
        "disaster_awareness": disaster_awareness,
    }
