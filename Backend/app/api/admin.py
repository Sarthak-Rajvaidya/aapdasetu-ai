from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import require_admin
from app.db.database import get_db
from app.models import models

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/analytics")
def analytics(db: Session = Depends(get_db), _admin: models.User = Depends(require_admin)):
    """Aggregate-only analytics. No individual user's private data is exposed here."""
    total_users = db.query(models.User).count()
    total_courses_completed = db.query(models.CourseProgress).filter(models.CourseProgress.completed.is_(True)).count()
    total_simulation_attempts = db.query(models.SimulationAttempt).count()
    total_quiz_attempts = db.query(models.QuizAttempt).count()
    total_predictions = db.query(models.PredictionHistory).count()
    total_ai_messages = db.query(models.ChatMessage).filter(models.ChatMessage.role == "user").count()

    avg_sim_score = db.query(func.avg(models.SimulationAttempt.score)).scalar() or 0
    avg_quiz_score = db.query(func.avg(models.QuizAttempt.score)).scalar() or 0

    hardest_disaster_row = (
        db.query(models.Simulation.disaster_type, func.avg(models.SimulationAttempt.score).label("avg_score"))
        .join(models.SimulationAttempt, models.SimulationAttempt.simulation_id == models.Simulation.id)
        .group_by(models.Simulation.disaster_type)
        .order_by("avg_score")
        .first()
    )

    return {
        "total_users": total_users,
        "total_courses_completed": total_courses_completed,
        "total_simulation_attempts": total_simulation_attempts,
        "total_quiz_attempts": total_quiz_attempts,
        "total_predictions": total_predictions,
        "total_ai_messages": total_ai_messages,
        "average_simulation_score": round(avg_sim_score, 1),
        "average_quiz_score": round(avg_quiz_score, 1),
        "hardest_disaster_type": hardest_disaster_row[0] if hardest_disaster_row else None,
    }
