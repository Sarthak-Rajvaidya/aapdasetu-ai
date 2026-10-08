from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.database import get_db
from app.models import models
from app.services.achievements import ensure_catalog_seeded

router = APIRouter(prefix="/api/achievements", tags=["achievements"])


@router.get("")
def list_achievements(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    ensure_catalog_seeded(db)
    all_achievements = db.query(models.Achievement).all()
    unlocked_ids = {
        ua.achievement_id
        for ua in db.query(models.UserAchievement).filter(models.UserAchievement.user_id == current_user.id)
    }
    return [
        {
            "code": a.code,
            "title": a.title,
            "description": a.description,
            "icon": a.icon,
            "unlocked": a.id in unlocked_ids,
        }
        for a in all_achievements
    ]
