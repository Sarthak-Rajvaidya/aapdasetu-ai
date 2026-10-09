
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.database import get_db
from app.models import models
from app.schemas import schemas


router = APIRouter(prefix="/api/courses", tags=["courses"])


# Lesson IDs must remain stable because they are stored in CourseProgress.
LESSONS = {
    "earthquake": [
        {
            "id": "earthquake-1",
            "title": "Understanding Earthquakes",
            "duration_minutes": 5,
            "content": [
                {
                    "heading": "What is an earthquake?",
                    "text": "An earthquake occurs when energy is suddenly released "
                    "inside the Earth, producing seismic waves that shake the ground."
                },
                {
                    "heading": "Possible hazards",
                    "text": "Ground shaking can damage buildings and roads. Falling "
                    "objects, fires, and aftershocks may create additional danger."
                },
            ],
            "key_actions": [
                "Learn the earthquake risks in your area.",
                "Identify safe places away from windows and heavy objects.",
                "Prepare an emergency kit and family communication plan.",
            ],
        },
        {
            "id": "earthquake-2",
            "title": "Preparing Before an Earthquake",
            "duration_minutes": 5,
            "content": [
                {
                    "heading": "Prepare your home",
                    "text": "Secure heavy furniture, keep exits clear, and learn how "
                    "to shut off utilities if it is safe to do so."
                }
            ],
            "key_actions": [
                "Keep water, food, a flashlight, and essential medicines ready.",
                "Practise Drop, Cover, and Hold On.",
                "Agree on a family meeting point.",
            ],
        },
        {
            "id": "earthquake-3",
            "title": "What to Do During an Earthquake",
            "duration_minutes": 5,
            "content": [
                {
                    "heading": "If you are indoors",
                    "text": "Drop to your hands and knees. Cover your head and neck "
                    "under a sturdy table if available, and hold on until shaking stops."
                },
                {
                    "heading": "If you are outdoors",
                    "text": "Move to an open area away from buildings, trees, "
                    "streetlights, and power lines."
                },
            ],
            "key_actions": [
                "Do not use elevators.",
                "If driving, pull over safely away from bridges and power lines.",
                "Protect your head and neck from falling debris.",
            ],
        },
        {
            "id": "earthquake-4",
            "title": "After an Earthquake",
            "duration_minutes": 5,
            "content": [
                {
                    "heading": "Stay alert",
                    "text": "Aftershocks may occur. Damaged buildings can collapse, "
                    "and leaking gas or damaged electrical systems can cause fires."
                }
            ],
            "key_actions": [
                "Check for injuries and contact emergency services when needed.",
                "Leave damaged buildings if it is safe to exit.",
                "Follow official instructions and avoid damaged structures.",
            ],
        },
    ],

    "flood": [
        {
            "id": "flood-1",
            "title": "Understanding Floods",
            "duration_minutes": 5,
            "content": [
                {
                    "heading": "What causes floods?",
                    "text": "Flooding can result from heavy rainfall, overflowing "
                    "rivers, storm surges, or drainage systems that cannot handle "
                    "large amounts of water."
                }
            ],
            "key_actions": [
                "Know whether your area is flood-prone.",
                "Monitor official weather and flood warnings.",
                "Identify evacuation routes to higher ground.",
            ],
        },
        {
            "id": "flood-2",
            "title": "Preparing for a Flood",
            "duration_minutes": 5,
            "content": [
                {
                    "heading": "Prepare in advance",
                    "text": "Keep essential supplies, medicines, drinking water, "
                    "important documents, and a charged phone ready."
                }
            ],
            "key_actions": [
                "Plan where your household will evacuate.",
                "Move important items to higher levels when safe.",
                "Follow evacuation orders promptly.",
            ],
        },
        {
            "id": "flood-3",
            "title": "Staying Safe During a Flood",
            "duration_minutes": 5,
            "content": [
                {
                    "heading": "Avoid floodwater",
                    "text": "Floodwater can hide open drains, debris, strong currents, "
                    "and electrical hazards. Never walk or drive through floodwater."
                }
            ],
            "key_actions": [
                "Move to higher ground when instructed or when danger is imminent.",
                "Never attempt to cross a flooded road.",
                "Do not touch electrical equipment while standing in water.",
            ],
        },
        {
            "id": "flood-4",
            "title": "Recovering After a Flood",
            "duration_minutes": 5,
            "content": [
                {
                    "heading": "Return only when safe",
                    "text": "Wait for official clearance. Flood-damaged buildings "
                    "may be unstable, and water or food may be contaminated."
                }
            ],
            "key_actions": [
                "Avoid fallen power lines and damaged electrical systems.",
                "Use safe drinking water and discard contaminated food.",
                "Wear suitable protective equipment during cleanup.",
            ],
        },
    ],

    "cyclone": [
        {
            "id": "cyclone-1",
            "title": "Understanding Cyclones",
            "duration_minutes": 5,
            "content": [
                {
                    "heading": "Cyclone hazards",
                    "text": "Cyclones can bring destructive winds, heavy rain, coastal "
                    "storm surges, flooding, and landslides."
                }
            ],
            "key_actions": [
                "Monitor official meteorological warnings.",
                "Know your local evacuation routes and shelters.",
                "Follow instructions from local authorities.",
            ],
        },
        {
            "id": "cyclone-2",
            "title": "Preparing Before a Cyclone",
            "duration_minutes": 5,
            "content": [
                {
                    "heading": "Prepare your household",
                    "text": "Secure loose outdoor items, protect important documents, "
                    "and keep emergency supplies ready."
                }
            ],
            "key_actions": [
                "Charge phones and power banks.",
                "Store drinking water and essential medicines.",
                "Evacuate high-risk areas when instructed.",
            ],
        },
        {
            "id": "cyclone-3",
            "title": "Safety During a Cyclone",
            "duration_minutes": 5,
            "content": [
                {
                    "heading": "Take shelter",
                    "text": "Stay indoors in a sturdy building, away from windows "
                    "and glass doors. Do not go outside during a temporary lull "
                    "unless authorities confirm it is safe."
                }
            ],
            "key_actions": [
                "Follow official evacuation and shelter instructions.",
                "Avoid beaches, flooded roads, and exposed coastal areas.",
                "Keep emergency alerts available if possible.",
            ],
        },
        {
            "id": "cyclone-4",
            "title": "Safety After a Cyclone",
            "duration_minutes": 5,
            "content": [
                {
                    "heading": "Watch for hidden hazards",
                    "text": "Flooding, unstable structures, debris, and fallen "
                    "electrical wires may remain dangerous after winds ease."
                }
            ],
            "key_actions": [
                "Wait for official advice before returning home.",
                "Stay away from downed power lines.",
                "Avoid damaged buildings.",
            ],
        },
    ],

    "wildfire": [
        {
            "id": "wildfire-1",
            "title": "Understanding Wildfires",
            "duration_minutes": 5,
            "content": [
                {
                    "heading": "How wildfires spread",
                    "text": "Wildfires can spread through dry vegetation and are "
                    "affected by wind, heat, and available fuel."
                }
            ],
            "key_actions": [
                "Pay attention to local fire warnings.",
                "Recognise smoke and rapidly spreading flames as danger signs.",
                "Know more than one evacuation route.",
            ],
        },
        {
            "id": "wildfire-2",
            "title": "Preparing for Wildfires",
            "duration_minutes": 5,
            "content": [
                {
                    "heading": "Plan for evacuation",
                    "text": "Keep essential items ready, plan transport, and identify "
                    "safe destinations outside the threatened area."
                }
            ],
            "key_actions": [
                "Prepare medicines, documents, water, and communication devices.",
                "Keep evacuation routes accessible.",
                "Follow local fire restrictions and official alerts.",
            ],
        },
        {
            "id": "wildfire-3",
            "title": "What to Do During a Wildfire",
            "duration_minutes": 5,
            "content": [
                {
                    "heading": "Leave early",
                    "text": "Evacuate when instructed. Smoke can harm breathing, "
                    "and fire direction can change rapidly with the wind."
                }
            ],
            "key_actions": [
                "Follow official evacuation routes.",
                "Do not delay evacuation to collect belongings.",
                "Avoid smoke where possible.",
            ],
        },
        {
            "id": "wildfire-4",
            "title": "Staying Safe After a Wildfire",
            "duration_minutes": 5,
            "content": [
                {
                    "heading": "Avoid the burn area",
                    "text": "Hot spots, falling trees, damaged power lines, and "
                    "unstable ground can remain dangerous after a fire."
                }
            ],
            "key_actions": [
                "Return only after authorities say it is safe.",
                "Avoid ash and debris without suitable protection.",
                "Follow public health guidance about air and water quality.",
            ],
        },
    ],

    "tornado": [
        {
            "id": "tornado-1",
            "title": "Understanding Tornadoes",
            "duration_minutes": 5,
            "content": [
                {
                    "heading": "Tornado hazards",
                    "text": "A tornado is a violently rotating column of air "
                    "associated with a thunderstorm. Flying debris and structural "
                    "damage are major hazards."
                }
            ],
            "key_actions": [
                "Monitor official severe-weather alerts.",
                "Identify suitable shelter before storms develop.",
                "Keep a way to receive emergency warnings.",
            ],
        },
        {
            "id": "tornado-2",
            "title": "Preparing for a Tornado",
            "duration_minutes": 5,
            "content": [
                {
                    "heading": "Choose your shelter",
                    "text": "Identify a basement or a small interior room on the "
                    "lowest floor, away from windows."
                }
            ],
            "key_actions": [
                "Prepare water, a flashlight, medicines, and a first-aid kit.",
                "Plan how household members will reach shelter.",
                "Know where to shelter at school or work.",
            ],
        },
        {
            "id": "tornado-3",
            "title": "What to Do During a Tornado",
            "duration_minutes": 5,
            "content": [
                {
                    "heading": "Take cover immediately",
                    "text": "Move to your designated shelter. Protect your head "
                    "and neck with your arms or sturdy padding."
                }
            ],
            "key_actions": [
                "Stay away from windows.",
                "Do not shelter under highway overpasses.",
                "If outdoors without nearby shelter, seek the lowest available "
                "ground away from vehicles and flying debris.",
            ],
        },
        {
            "id": "tornado-4",
            "title": "After a Tornado",
            "duration_minutes": 5,
            "content": [
                {
                    "heading": "Avoid damaged areas",
                    "text": "Debris, broken glass, unstable buildings, gas leaks, "
                    "and fallen power lines can cause serious injuries."
                }
            ],
            "key_actions": [
                "Check for injuries and contact emergency services.",
                "Avoid damaged buildings and downed wires.",
                "Follow official instructions before returning.",
            ],
        },
    ],
}


QUIZZES = {
    "earthquake": [
        {
            "question": "What should you do when an earthquake begins indoors?",
            "options": [
                "Run to the elevator",
                "Drop, Cover, and Hold On",
                "Stand next to a window",
                "Run downstairs during shaking",
            ],
            "correct_index": 1,
            "topic": "During an earthquake",
        },
        {
            "question": "Where is a safer place to wait outdoors?",
            "options": [
                "Under a balcony",
                "Beside a power pole",
                "An open area away from buildings",
                "Under a tree",
            ],
            "correct_index": 2,
            "topic": "Outdoor safety",
        },
    ],
    "flood": [
        {
            "question": "What should you do when a road is covered in floodwater?",
            "options": [
                "Drive through quickly",
                "Walk through carefully",
                "Avoid crossing and find a safe route",
                "Follow another vehicle",
            ],
            "correct_index": 2,
            "topic": "Floodwater safety",
        },
        {
            "question": "Where should you move if floodwater threatens your area?",
            "options": [
                "To higher ground",
                "Into a basement",
                "Closer to the river",
                "Under a bridge",
            ],
            "correct_index": 0,
            "topic": "Evacuation",
        },
    ],
    "cyclone": [
        {
            "question": "Where should you shelter during a cyclone?",
            "options": [
                "On the beach",
                "Beside a window",
                "In a sturdy building away from windows",
                "Under a tree",
            ],
            "correct_index": 2,
            "topic": "Shelter",
        },
        {
            "question": "When should you evacuate a high-risk area?",
            "options": [
                "Only after flooding begins",
                "When authorities instruct you to evacuate",
                "After the storm has passed",
                "Never",
            ],
            "correct_index": 1,
            "topic": "Evacuation",
        },
    ],
    "wildfire": [
        {
            "question": "What is the safest action when officials order evacuation?",
            "options": [
                "Wait to collect everything",
                "Hide near the fire",
                "Evacuate promptly using official routes",
                "Drive toward visible flames",
            ],
            "correct_index": 2,
            "topic": "Evacuation",
        },
        {
            "question": "What should you do after a wildfire?",
            "options": [
                "Enter the burn area immediately",
                "Return only when authorities say it is safe",
                "Touch fallen wires to move them",
                "Ignore air-quality warnings",
            ],
            "correct_index": 1,
            "topic": "Recovery",
        },
    ],
    "tornado": [
        {
            "question": "Where is a suitable tornado shelter?",
            "options": [
                "Near a large window",
                "Under an overpass",
                "A basement or interior room on the lowest floor",
                "On a balcony",
            ],
            "correct_index": 2,
            "topic": "Shelter",
        },
        {
            "question": "What should you protect during a tornado?",
            "options": [
                "Your head and neck",
                "Your luggage first",
                "Your windows",
                "Your outdoor furniture",
            ],
            "correct_index": 0,
            "topic": "Personal safety",
        },
    ],
}


def _get_course_or_404(slug: str, db: Session) -> models.Course:
    course = db.query(models.Course).filter(models.Course.slug == slug).first()
    if course is None:
        raise HTTPException(status_code=404, detail=f"Course '{slug}' was not found.")
    return course


def _get_progress(course_id: int, user_id: int, db: Session):
    return (
        db.query(models.CourseProgress)
        .filter(
            models.CourseProgress.course_id == course_id,
            models.CourseProgress.user_id == user_id,
        )
        .first()
    )


def _course_summary(course, progress=None) -> dict:
    lessons = LESSONS.get(course.slug, [])
    return {
        "id": course.id,
        "slug": course.slug,
        "title": course.title,
        "description": course.description or "",
        "disaster_type": course.disaster_type,
        "total_sections": len(lessons) or int(course.total_sections or 0),
        "lessons_count": len(lessons),
        "duration_minutes": sum(x["duration_minutes"] for x in lessons),
        "quiz_count": 1 if QUIZZES.get(course.slug) else 0,
        "progress": int(progress.progress or 0) if progress else 0,
        "viewed_sections": list(progress.viewed_sections or []) if progress else [],
        "completed": bool(progress.completed) if progress else False,
    }


@router.get("")
def list_courses(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    courses = db.query(models.Course).order_by(models.Course.id.asc()).all()
    records = (
        db.query(models.CourseProgress)
        .filter(models.CourseProgress.user_id == current_user.id)
        .all()
    )
    progress_map = {record.course_id: record for record in records}
    return [_course_summary(course, progress_map.get(course.id)) for course in courses]


@router.get("/{slug}")
def get_course(
    slug: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    course = _get_course_or_404(slug, db)
    progress = _get_progress(course.id, current_user.id, db)
    lessons = LESSONS.get(course.slug, [])
    quiz = QUIZZES.get(course.slug, [])

    return {
        **_course_summary(course, progress),
        "lessons": lessons,
        "quiz": quiz,
        "objectives": [
            "Understand the main hazards associated with this disaster.",
            "Learn how to prepare before an emergency.",
            "Recognise safer actions during and after the event.",
        ],
    }


@router.post("/{slug}/progress", response_model=schemas.CourseProgressOut)
def upsert_progress(
    slug: str,
    payload: schemas.CourseProgressUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    course = _get_course_or_404(slug, db)
    lessons = LESSONS.get(course.slug, [])

    valid_ids = {lesson["id"] for lesson in lessons}
    requested = payload.viewed_sections or []

    if any(not isinstance(item, str) for item in requested):
        raise HTTPException(
            status_code=422,
            detail="Lesson IDs must be strings.",
        )

    if any(item not in valid_ids for item in requested):
        raise HTTPException(
            status_code=422,
            detail="One or more lesson IDs are invalid for this course.",
        )

    record = _get_progress(course.id, current_user.id, db)

    if record is None:
        record = models.CourseProgress(
            user_id=current_user.id,
            course_id=course.id,
            progress=0,
            viewed_sections=[],
            completed=False,
        )
        db.add(record)

    existing = [
        item for item in (record.viewed_sections or [])
        if isinstance(item, str) and item in valid_ids
    ]
    merged = list(dict.fromkeys(existing + requested))

    # Calculate progress on the server; do not trust the client's percentage.
    calculated_progress = (
        round((len(merged) / len(lessons)) * 100)
        if lessons
        else 0
    )

    record.viewed_sections = merged
    record.progress = max(int(record.progress or 0), calculated_progress)

    if lessons and len(merged) == len(lessons):
        record.progress = 100
        record.completed = True
        if record.completed_at is None:
            record.completed_at = datetime.utcnow()

    try:
        db.commit()
        db.refresh(record)
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to save course progress.",
        ) from exc

    return schemas.CourseProgressOut(
        course_slug=course.slug,
        progress=int(record.progress or 0),
        completed=bool(record.completed),
        viewed_sections=list(record.viewed_sections or []),
    )
