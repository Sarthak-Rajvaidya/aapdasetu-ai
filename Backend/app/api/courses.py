from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.database import get_db
from app.models import models
from app.schemas import schemas

router = APIRouter(prefix="/api/courses", tags=["courses"])


@router.get("")
def list_courses(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    courses = db.query(models.Course).all()
    progress_by_course = {
        cp.course_id: cp
        for cp in db.query(models.CourseProgress).filter(models.CourseProgress.user_id == current_user.id)
    }
    return [
        {
            "id": c.id,
            "slug": c.slug,
            "title": c.title,
            "description": c.description,
            "disaster_type": c.disaster_type,
            "progress": progress_by_course[c.id].progress if c.id in progress_by_course else 0,
            "completed": progress_by_course[c.id].completed if c.id in progress_by_course else False,
        }
        for c in courses
    ]


@router.get("/{slug}")
def get_course(slug: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    course = db.query(models.Course).filter(models.Course.slug == slug).first()
    if not course:
        raise HTTPException(404, "Course not found")
    progress = (
        db.query(models.CourseProgress)
        .filter(models.CourseProgress.user_id == current_user.id, models.CourseProgress.course_id == course.id)
        .first()
    )
    return {
        "id": course.id,
        "slug": course.slug,
        "title": course.title,
        "description": course.description,
        "disaster_type": course.disaster_type,
        "total_sections": course.total_sections,
        "progress": progress.progress if progress else 0,
        "viewed_sections": progress.viewed_sections if progress else [],
        "completed": progress.completed if progress else False,
    }


@router.post("/{slug}/progress", response_model=schemas.CourseProgressOut)
def upsert_progress(
    slug: str,
    payload: schemas.CourseProgressUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Upserts progress for the AUTHENTICATED user only — the frontend cannot
    submit progress on behalf of anyone else, since user identity comes
    from the JWT, not from the request body.
    """
    course = db.query(models.Course).filter(models.Course.slug == slug).first()
    if not course:
        raise HTTPException(404, "Course not found")

    record = (
        db.query(models.CourseProgress)
        .filter(models.CourseProgress.user_id == current_user.id, models.CourseProgress.course_id == course.id)
        .first()
    )
    if not record:
        record = models.CourseProgress(user_id=current_user.id, course_id=course.id)
        db.add(record)

    record.progress = max(record.progress or 0, payload.progress)  # progress never regresses
    merged_sections = set(record.viewed_sections or []) | set(payload.viewed_sections)
    record.viewed_sections = list(merged_sections)
    if record.progress >= 100 and not record.completed:
        record.completed = True
        record.completed_at = datetime.utcnow()

    db.commit()
    db.refresh(record)

    return schemas.CourseProgressOut(
        course_slug=course.slug,
        progress=record.progress,
        completed=record.completed,
        viewed_sections=record.viewed_sections,
    )
