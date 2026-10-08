from collections import Counter

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.database import get_db
from app.models import models
from app.schemas import schemas
from app.services.achievements import evaluate_achievements

router = APIRouter(prefix="/api/quizzes", tags=["quizzes"])

_RECOMMENDED_COURSE = {
    "Earthquake": "earthquake",
    "Flood": "flood",
    "Wildfire": "wildfire",
    "Tornado": "tornado",
    "Cyclone": "cyclone",
}


@router.get("")
def list_quizzes(db: Session = Depends(get_db), _current_user: models.User = Depends(get_current_user)):
    quizzes = db.query(models.Quiz).all()
    return [
        {"id": q.id, "slug": q.slug, "title": q.title, "disaster_type": q.disaster_type,
         "total_questions": len(q.questions)}
        for q in quizzes
    ]


@router.get("/{slug}")
def get_quiz(slug: str, db: Session = Depends(get_db), _current_user: models.User = Depends(get_current_user)):
    """Returns questions WITHOUT the correct answer index, so it can't be read off the network tab."""
    quiz = db.query(models.Quiz).filter(models.Quiz.slug == slug).first()
    if not quiz:
        raise HTTPException(404, "Quiz not found")
    sanitized_questions = [
        {"index": i, "question": q["question"], "options": q["options"], "topic": q.get("topic")}
        for i, q in enumerate(quiz.questions)
    ]
    return {"id": quiz.id, "slug": quiz.slug, "title": quiz.title, "disaster_type": quiz.disaster_type,
            "questions": sanitized_questions}


@router.post("/{slug}/submit", response_model=schemas.QuizResultOut)
def submit_quiz(
    slug: str,
    payload: schemas.QuizSubmission,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    quiz = db.query(models.Quiz).filter(models.Quiz.slug == slug).first()
    if not quiz:
        raise HTTPException(404, "Quiz not found")

    correct_count = 0
    weak_topics = Counter()
    total = len(quiz.questions)

    for ans in payload.answers:
        if ans.question_index < 0 or ans.question_index >= total:
            continue
        q = quiz.questions[ans.question_index]
        if ans.selected_option == q["correct_index"]:
            correct_count += 1
        else:
            weak_topics[q.get("topic", "general")] += 1

    score = round(100 * correct_count / total) if total else 0

    attempt = models.QuizAttempt(
        user_id=current_user.id,
        quiz_id=quiz.id,
        score=score,
        correct_count=correct_count,
        total_questions=total,
        weak_topics=[t for t, _ in weak_topics.most_common()],
        time_taken_seconds=payload.time_taken_seconds,
    )
    db.add(attempt)
    db.commit()

    evaluate_achievements(db, current_user)

    recommended = None
    if score < 80:
        recommended = _RECOMMENDED_COURSE.get(quiz.disaster_type)

    return schemas.QuizResultOut(
        score=score,
        correct_count=correct_count,
        total_questions=total,
        weak_topics=attempt.weak_topics,
        recommended_course=recommended,
    )
