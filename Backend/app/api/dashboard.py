from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.database import get_db
from app.models import models
from app.schemas import schemas
from app.services.readiness import compute_readiness
from app.services import scoring


router = APIRouter(
    prefix="/api/dashboard",
    tags=["dashboard"],
)


# =========================================================
# HELPERS
# =========================================================

def _safe_number(value, default=0.0):
    """
    Safely convert a value into a float.
    Prevents dashboard failures when a nullable DB field is None.
    """
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _percentage(value):
    """
    Clamp percentage values between 0 and 100.
    """
    return round(max(0.0, min(100.0, _safe_number(value))), 2)


def _iso_date(value):
    """
    Convert datetime/date into ISO format for frontend charts.
    """
    if value is None:
        return None

    try:
        return value.isoformat()
    except AttributeError:
        return str(value)


def _activity_icon(activity_type):
    """
    Icon name used by dashboard.js.
    """
    icons = {
        "simulation": "bi bi-lightning-charge-fill",
        "quiz": "bi bi-journal-check",
        "course": "bi bi-book-fill",
        "achievement": "bi bi-trophy-fill",
    }

    return icons.get(
        activity_type,
        "bi bi-activity",
    )


# =========================================================
# DASHBOARD
# =========================================================

@router.get(
    "",
    response_model=schemas.DashboardOut,
)
def dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Production dashboard API.

    Returns:
    - Overall readiness
    - Course progress
    - Quiz performance
    - Simulation performance
    - Capability scores
    - Performance trend
    - Learning activity
    - Recent activity
    - Achievements
    - Learning streak
    - Recommended training
    """

    # =====================================================
    # 1. READINESS
    # =====================================================

    readiness = compute_readiness(
        db,
        current_user,
    )

    # Keep the existing readiness service as the
    # source of truth.
    readiness_out = schemas.ReadinessBreakdown(
        **readiness
    )


    # =====================================================
    # 2. COURSE PROGRESS
    # =====================================================

    course_progress = []

    for cp in current_user.course_progress:

        if not cp.course:
            continue

        course_progress.append(
            schemas.CourseProgressOut(
                course_slug=cp.course.slug,
                progress=_percentage(cp.progress),
                completed=bool(cp.completed),
                viewed_sections=cp.viewed_sections or [],
            )
        )


    # =====================================================
    # 3. SIMULATION ATTEMPTS
    # =====================================================

    simulations = [
        attempt
        for attempt in current_user.simulation_attempts
        if attempt.completed_at is not None
    ]

    simulations.sort(
        key=lambda a: a.completed_at,
        reverse=True,
    )


    # =====================================================
    # 4. QUIZ ATTEMPTS
    # =====================================================

    quizzes = [
        attempt
        for attempt in current_user.quiz_attempts
        if attempt.completed_at is not None
    ]

    quizzes.sort(
        key=lambda q: q.completed_at,
        reverse=True,
    )


    # =====================================================
    # 5. RECENT SIMULATIONS
    # =====================================================

    recent_sims = simulations[:5]

    recent_sim_out = []

    for attempt in recent_sims:

        recent_sim_out.append(
            {
                "disaster_type": (
                    attempt.simulation.disaster_type
                    if attempt.simulation
                    else None
                ),

                "score": _percentage(
                    attempt.score
                ),

                "completed_at": attempt.completed_at,
            }
        )


    # =====================================================
    # 6. RECENT QUIZZES
    # =====================================================

    recent_quizzes = quizzes[:5]

    recent_quiz_out = []

    for attempt in recent_quizzes:

        recent_quiz_out.append(
            {
                "quiz_slug": (
                    attempt.quiz.slug
                    if attempt.quiz
                    else None
                ),

                "score": _percentage(
                    attempt.score
                ),

                "completed_at": attempt.completed_at,
            }
        )


    # =====================================================
    # 7. PERFORMANCE TREND
    # =====================================================
    #
    # IMPORTANT:
    # We use REAL attempts only.
    # No artificial/fake historical values are generated.
    #

    performance_trend = []

    combined_attempts = []

    for attempt in simulations:

        combined_attempts.append(
            {
                "type": "simulation",
                "score": _percentage(attempt.score),
                "completed_at": attempt.completed_at,
            }
        )

    for attempt in quizzes:

        combined_attempts.append(
            {
                "type": "quiz",
                "score": _percentage(attempt.score),
                "completed_at": attempt.completed_at,
            }
        )

    combined_attempts.sort(
        key=lambda item: item["completed_at"]
    )

    for item in combined_attempts:

        performance_trend.append(
            {
                "type": item["type"],
                "score": item["score"],
                "date": _iso_date(
                    item["completed_at"]
                ),
            }
        )


    # =====================================================
    # 8. SIMULATION CAPABILITIES
    # =====================================================
    #
    # Uses the metrics already stored in SimulationAttempt.
    #

    capability_totals = {
        "decision_accuracy": 0.0,
        "response_time_score": 0.0,
        "safety_awareness": 0.0,
        "resource_management": 0.0,
    }

    capability_counts = {
        "decision_accuracy": 0,
        "response_time_score": 0,
        "safety_awareness": 0,
        "resource_management": 0,
    }

    for attempt in simulations:

        metrics = [
            "decision_accuracy",
            "response_time_score",
            "safety_awareness",
            "resource_management",
        ]

        for metric in metrics:

            value = getattr(
                attempt,
                metric,
                None,
            )

            if value is None:
                continue

            capability_totals[metric] += _percentage(
                value
            )

            capability_counts[metric] += 1


    simulation_capabilities = {}

    for metric in capability_totals:

        count = capability_counts[metric]

        if count == 0:
            simulation_capabilities[metric] = 0
        else:
            simulation_capabilities[metric] = round(
                capability_totals[metric] / count,
                2,
            )


    # =====================================================
    # 9. CAPABILITY BREAKDOWN
    # =====================================================
    #
    # These are derived from real simulation metrics.
    #

    capability_scores = {
        "knowledge": 0.0,
        "decision_making": 0.0,
        "emergency_response": 0.0,
        "disaster_awareness": 0.0,
    }


    # Knowledge:
    # Quiz performance
    if quizzes:

        quiz_scores = [
            _percentage(q.score)
            for q in quizzes
            if q.score is not None
        ]

        if quiz_scores:
            capability_scores["knowledge"] = round(
                sum(quiz_scores) / len(quiz_scores),
                2,
            )


    # Decision making:
    capability_scores["decision_making"] = (
        simulation_capabilities["decision_accuracy"]
    )


    # Emergency response:
    capability_scores["emergency_response"] = (
        simulation_capabilities["response_time_score"]
    )


    # Disaster awareness:
    capability_scores["disaster_awareness"] = (
        simulation_capabilities["safety_awareness"]
    )


    # =====================================================
    # 10. ACTIVITY HISTORY — LAST 28 DAYS
    # =====================================================

    today = datetime.now(
        timezone.utc
    ).date()

    activity_counter = {}

    # Initialize all 28 days.
    for offset in range(27, -1, -1):

        day = today - timedelta(
            days=offset
        )

        activity_counter[
            day.isoformat()
        ] = 0


    # Count simulations.
    for attempt in simulations:

        completed = attempt.completed_at

        if completed is None:
            continue

        day = completed.date()

        key = day.isoformat()

        if key in activity_counter:
            activity_counter[key] += 1


    # Count quizzes.
    for attempt in quizzes:

        completed = attempt.completed_at

        if completed is None:
            continue

        day = completed.date()

        key = day.isoformat()

        if key in activity_counter:
            activity_counter[key] += 1


    activity_history = [
        {
            "date": date,
            "count": count,
        }
        for date, count in activity_counter.items()
    ]


    # =====================================================
    # 11. LEARNING STREAK
    # =====================================================
    #
    # Existing implementation counted total active dates,
    # which is not a true consecutive streak.
    #
    # Here we calculate consecutive active days.
    #

    activity_dates = set()

    for attempt in simulations:

        if attempt.completed_at:
            activity_dates.add(
                attempt.completed_at.date()
            )

    for attempt in quizzes:

        if attempt.completed_at:
            activity_dates.add(
                attempt.completed_at.date()
            )


    streak = 0

    check_date = today

    # If there was no activity today, allow the streak
    # to start from yesterday.
    if check_date not in activity_dates:

        check_date -= timedelta(days=1)


    while check_date in activity_dates:

        streak += 1

        check_date -= timedelta(days=1)


    # =====================================================
    # 12. ACHIEVEMENTS
    # =====================================================

    total_achievements = (
        db.query(
            models.Achievement
        ).count()
    )

    unlocked = (
        db.query(
            models.UserAchievement
        )
        .filter(
            models.UserAchievement.user_id
            == current_user.id
        )
        .count()
    )


    # =====================================================
    # 13. RECENT ACTIVITY TIMELINE
    # =====================================================

    recent_activity = []

    # Simulation activity.
    for attempt in simulations[:10]:

        recent_activity.append(
            {
                "type": "simulation",

                "title": (
                    f"{attempt.simulation.disaster_type} "
                    "simulation completed"
                    if attempt.simulation
                    else "Simulation completed"
                ),

                "description": (
                    f"Score: {_percentage(attempt.score)}%"
                ),

                "score": _percentage(
                    attempt.score
                ),

                "date": _iso_date(
                    attempt.completed_at
                ),

                "icon": _activity_icon(
                    "simulation"
                ),
            }
        )


    # Quiz activity.
    for attempt in quizzes[:10]:

        recent_activity.append(
            {
                "type": "quiz",

                "title": (
                    f"{attempt.quiz.slug} "
                    "quiz completed"
                    if attempt.quiz
                    else "Quiz completed"
                ),

                "description": (
                    f"Score: {_percentage(attempt.score)}%"
                ),

                "score": _percentage(
                    attempt.score
                ),

                "date": _iso_date(
                    attempt.completed_at
                ),

                "icon": _activity_icon(
                    "quiz"
                ),
            }
        )


    # Sort combined activity.
    recent_activity.sort(
        key=lambda item: item["date"]
        or "",
        reverse=True,
    )

    recent_activity = recent_activity[:10]


    # =====================================================
    # 14. RECOMMENDED TRAINING
    # =====================================================

    recommended_training = None
    recommendation_reason = None

    if simulations:

        safety_attempts = [
            attempt
            for attempt in simulations
            if attempt.safety_awareness is not None
        ]

        if safety_attempts:

            worst = min(
                safety_attempts,
                key=lambda a: _safe_number(
                    a.safety_awareness
                ),
            )

            safety_score = _percentage(
                worst.safety_awareness
            )

            if (
                safety_score < 75
                and worst.simulation
            ):

                recommended_training = (
                    scoring.recommended_training_for(
                        worst.simulation.disaster_type,
                        safety_score,
                    )
                )

                recommendation_reason = (
                    f"You scored {safety_score}% "
                    f"on safety awareness in the "
                    f"{worst.simulation.disaster_type} "
                    f"simulation."
                )


    # =====================================================
    # 15. BUILD RESPONSE
    # =====================================================

    return schemas.DashboardOut(
        name=current_user.name,

        readiness=readiness_out,

        course_progress=course_progress,

        recent_simulations=recent_sim_out,

        recent_quizzes=recent_quiz_out,

        achievements_unlocked=unlocked,

        achievements_total=total_achievements,

        learning_streak_days=streak,

        recommended_training=recommended_training,

        recommendation_reason=recommendation_reason,

        performance_trend=performance_trend,

        simulation_capabilities=simulation_capabilities,

        capability_scores=capability_scores,

        activity_history=activity_history,

        recent_activity=recent_activity,
    )