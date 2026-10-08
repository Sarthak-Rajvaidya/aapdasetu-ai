"""
Achievement rules. Every rule below checks REAL rows in the database — no
achievement is ever granted just because the UI would "look better" with
it unlocked.
"""
from sqlalchemy.orm import Session

from app.models import models

ACHIEVEMENT_CATALOG = [
    {"code": "first_responder", "title": "First Responder", "description": "Complete your first simulation.", "icon": "bi-lightning-charge"},
    {"code": "seismic_ready", "title": "Seismic Ready", "description": "Complete the earthquake simulation.", "icon": "bi-globe-americas"},
    {"code": "flood_aware", "title": "Flood Aware", "description": "Complete the flood simulation.", "icon": "bi-water"},
    {"code": "fireline_ready", "title": "Fireline Ready", "description": "Complete the wildfire simulation.", "icon": "bi-fire"},
    {"code": "storm_guardian", "title": "Storm Guardian", "description": "Complete the tornado simulation.", "icon": "bi-tornado"},
    {"code": "coastal_guardian", "title": "Coastal Guardian", "description": "Complete the cyclone simulation.", "icon": "bi-wind"},
    {"code": "disaster_scholar", "title": "Disaster Scholar", "description": "Complete all available courses.", "icon": "bi-mortarboard"},
    {"code": "simulation_specialist", "title": "Simulation Specialist", "description": "Complete every simulation at least once.", "icon": "bi-award"},
    {"code": "safety_streak", "title": "Safety Streak", "description": "Complete training activity on 3 different days.", "icon": "bi-calendar-check"},
]

_CODE_BY_DISASTER = {
    "Earthquake": "seismic_ready",
    "Flood": "flood_aware",
    "Wildfire": "fireline_ready",
    "Tornado": "storm_guardian",
    "Cyclone": "coastal_guardian",
}


def ensure_catalog_seeded(db: Session):
    existing = {a.code for a in db.query(models.Achievement).all()}
    for entry in ACHIEVEMENT_CATALOG:
        if entry["code"] not in existing:
            db.add(models.Achievement(**entry))
    db.commit()


def _unlock(db: Session, user: models.User, code: str, unlocked_codes: set) -> bool:
    if code in unlocked_codes:
        return False
    achievement = db.query(models.Achievement).filter(models.Achievement.code == code).first()
    if not achievement:
        return False
    db.add(models.UserAchievement(user_id=user.id, achievement_id=achievement.id))
    unlocked_codes.add(code)
    return True


def evaluate_achievements(db: Session, user: models.User) -> list:
    """Call after any simulation/course/quiz-affecting event. Returns list of newly unlocked titles."""
    ensure_catalog_seeded(db)

    unlocked_codes = {
        ua.achievement.code for ua in db.query(models.UserAchievement).filter(models.UserAchievement.user_id == user.id)
    }
    newly_unlocked_titles = []

    sim_attempts = db.query(models.SimulationAttempt).filter(models.SimulationAttempt.user_id == user.id).all()
    if sim_attempts:
        if _unlock(db, user, "first_responder", unlocked_codes):
            newly_unlocked_titles.append("First Responder")

    completed_disaster_types = set()
    for attempt in sim_attempts:
        disaster_type = attempt.simulation.disaster_type if attempt.simulation else None
        if disaster_type:
            completed_disaster_types.add(disaster_type)
            code = _CODE_BY_DISASTER.get(disaster_type)
            if code and _unlock(db, user, code, unlocked_codes):
                title = next(e["title"] for e in ACHIEVEMENT_CATALOG if e["code"] == code)
                newly_unlocked_titles.append(title)

    total_sim_slugs = {s.disaster_type for s in db.query(models.Simulation).all()}
    if total_sim_slugs and total_sim_slugs.issubset(completed_disaster_types):
        if _unlock(db, user, "simulation_specialist", unlocked_codes):
            newly_unlocked_titles.append("Simulation Specialist")

    total_courses = db.query(models.Course).count()
    completed_courses = (
        db.query(models.CourseProgress)
        .filter(models.CourseProgress.user_id == user.id, models.CourseProgress.completed.is_(True))
        .count()
    )
    if total_courses and completed_courses >= total_courses:
        if _unlock(db, user, "disaster_scholar", unlocked_codes):
            newly_unlocked_titles.append("Disaster Scholar")

    # Safety streak: activity on 3+ distinct calendar days across sims/quizzes/courses.
    activity_dates = set()
    for a in sim_attempts:
        activity_dates.add(a.completed_at.date())
    for q in db.query(models.QuizAttempt).filter(models.QuizAttempt.user_id == user.id):
        activity_dates.add(q.completed_at.date())
    for cp in db.query(models.CourseProgress).filter(models.CourseProgress.user_id == user.id):
        activity_dates.add(cp.updated_at.date())
    if len(activity_dates) >= 3:
        if _unlock(db, user, "safety_streak", unlocked_codes):
            newly_unlocked_titles.append("Safety Streak")

    if newly_unlocked_titles:
        db.commit()

    return newly_unlocked_titles
