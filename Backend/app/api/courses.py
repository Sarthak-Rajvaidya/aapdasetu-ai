
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.database import get_db
from app.models import models
from app.schemas import schemas


router = APIRouter(
    prefix="/api/courses",
    tags=["courses"],
)


def _get_course_or_404(
    slug: str,
    db: Session,
) -> models.Course:
    """Find a course by its unique slug."""
    course = (
        db.query(models.Course)
        .filter(models.Course.slug == slug)
        .first()
    )

    if course is None:
        raise HTTPException(
            status_code=404,
            detail=f"Course '{slug}' was not found.",
        )

    return course


def _get_user_course_progress(
    course_id: int,
    user_id: int,
    db: Session,
):
    """Return this user's progress record for a course, if it exists."""
    return (
        db.query(models.CourseProgress)
        .filter(
            models.CourseProgress.user_id == user_id,
            models.CourseProgress.course_id == course_id,
        )
        .first()
    )


def _course_summary(course, progress=None) -> dict:
    """Build the response used by the course library."""
    return {
        "id": course.id,
        "slug": course.slug,
        "title": course.title,
        "description": course.description,
        "disaster_type": course.disaster_type,
        "progress": int(progress.progress or 0) if progress else 0,
        "completed": bool(progress.completed) if progress else False,
    }


@router.get("")
def list_courses(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Return all courses and the authenticated user's progress.

    Authentication:
        Bearer JWT token

    Response:
        [
            {
                "id": 1,
                "slug": "cyclone",
                "title": "Cyclone Preparedness",
                "description": "...",
                "disaster_type": "cyclone",
                "progress": 25,
                "completed": false
            }
        ]
    """
    courses = (
        db.query(models.Course)
        .order_by(models.Course.id.asc())
        .all()
    )

    progress_records = (
        db.query(models.CourseProgress)
        .filter(
            models.CourseProgress.user_id == current_user.id
        )
        .all()
    )

    progress_by_course = {
        record.course_id: record
        for record in progress_records
    }

    return [
        _course_summary(
            course,
            progress_by_course.get(course.id),
        )
        for course in courses
    ]


@router.get("/{slug}")
def get_course(
    slug: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Return course details and the current user's progress.

    Note:
        This endpoint returns course metadata and section progress.
        It does not return lesson content or quiz questions because
        those fields are not part of the supplied model contract.
    """
    course = _get_course_or_404(slug, db)

    progress = _get_user_course_progress(
        course_id=course.id,
        user_id=current_user.id,
        db=db,
    )

    return {
        "id": course.id,
        "slug": course.slug,
        "title": course.title,
        "description": course.description,
        "disaster_type": course.disaster_type,
        "total_sections": int(course.total_sections or 0),
        "progress": int(progress.progress or 0) if progress else 0,
        "viewed_sections": list(progress.viewed_sections or []) if progress else [],
        "completed": bool(progress.completed) if progress else False,
    }


@router.post(
    "/{slug}/progress",
    response_model=schemas.CourseProgressOut,
)
def upsert_progress(
    slug: str,
    payload: schemas.CourseProgressUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Create or update course progress for the authenticated user.

    Progress is cumulative:
      - Progress cannot decrease.
      - Previously viewed sections are retained.
      - Completion is recorded when progress reaches 100%.

    The user ID always comes from the verified JWT.
    """
    course = _get_course_or_404(slug, db)

    requested_progress = int(payload.progress)

    if not 0 <= requested_progress <= 100:
        raise HTTPException(
            status_code=422,
            detail="Progress must be between 0 and 100.",
        )

    requested_sections = payload.viewed_sections or []

    if not isinstance(requested_sections, list):
        raise HTTPException(
            status_code=422,
            detail="viewed_sections must be a list.",
        )

    # Avoid accepting nested objects or arbitrary data as section identifiers.
    if any(
        not isinstance(section, (str, int))
        or isinstance(section, bool)
        for section in requested_sections
    ):
        raise HTTPException(
            status_code=422,
            detail="Each viewed section must be a string or integer identifier.",
        )

    record = _get_user_course_progress(
        course_id=course.id,
        user_id=current_user.id,
        db=db,
    )

    if record is None:
        record = models.CourseProgress(
            user_id=current_user.id,
            course_id=course.id,
            progress=0,
            viewed_sections=[],
            completed=False,
        )
        db.add(record)
        db.flush()

    previous_progress = int(record.progress or 0)

    # Never allow progress to regress.
    record.progress = max(
        previous_progress,
        requested_progress,
    )

    # Preserve existing viewed sections and remove duplicates.
    existing_sections = list(record.viewed_sections or [])
    merged_sections = list(
        dict.fromkeys(existing_sections + requested_sections)
    )
    record.viewed_sections = merged_sections

    if record.progress >= 100 and not record.completed:
        record.completed = True

        # Use a UTC timestamp without assuming the DB column supports
        # timezone-aware datetime objects.
        record.completed_at = datetime.utcnow()

    try:
        db.commit()
        db.refresh(record)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to save course progress.",
        )

    return schemas.CourseProgressOut(
        course_slug=course.slug,
        progress=int(record.progress or 0),
        completed=bool(record.completed),
        viewed_sections=list(record.viewed_sections or []),
    )
