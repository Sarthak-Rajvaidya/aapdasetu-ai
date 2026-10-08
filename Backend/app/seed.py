"""
Idempotent seed routine, run automatically at app startup (see main.py).
Populates:
  - the Simulation catalog rows (metadata only; scenario content lives in
    app/simulations_data/*.json and is read on demand)
  - the Course catalog
  - a starter Quiz per disaster type
  - the Achievement catalog

Safe to run multiple times: every insert is guarded by an existence check.
"""
import json
from pathlib import Path

from sqlalchemy.orm import Session

from app.models import models
from app.services.achievements import ensure_catalog_seeded

SIM_DATA_DIR = Path(__file__).resolve().parent / "simulations_data"

COURSES = [
    {
        "slug": "earthquake",
        "title": "Earthquake Preparedness",
        "disaster_type": "Earthquake",
        "description": "Understand earthquake risk, safe-room selection, Drop-Cover-Hold On, and post-shaking safety.",
        "total_sections": 4,
    },
    {
        "slug": "flood",
        "title": "Flood Safety & Evacuation",
        "disaster_type": "Flood",
        "description": "Learn to interpret flood warnings, choose safe evacuation routes, and avoid floodwater hazards.",
        "total_sections": 4,
    },
    {
        "slug": "wildfire",
        "title": "Wildfire Readiness",
        "disaster_type": "Wildfire",
        "description": "Defensible space, evacuation timing, and safe behavior around wildfire without firefighting yourself.",
        "total_sections": 4,
    },
    {
        "slug": "tornado",
        "title": "Tornado & Severe Storm Safety",
        "disaster_type": "Tornado",
        "description": "Watches vs warnings, shelter selection, and bracing correctly during a tornado.",
        "total_sections": 4,
    },
    {
        "slug": "cyclone",
        "title": "Cyclone Preparedness (Coastal India)",
        "disaster_type": "Cyclone",
        "description": "Cyclone warning stages, coastal evacuation, and post-landfall safety.",
        "total_sections": 4,
    },
]

QUIZZES = [
    {
        "slug": "earthquake-quiz",
        "title": "Earthquake Safety Quiz",
        "disaster_type": "Earthquake",
        "questions": [
            {"question": "What is the correct immediate response when shaking starts indoors?", "options": ["Run outside", "Drop, Cover, and Hold On", "Use the elevator", "Stand near a window"], "correct_index": 1, "topic": "immediate_response"},
            {"question": "Where should you avoid standing during an earthquake?", "options": ["Under a sturdy desk", "Near windows or mirrors", "Against an interior wall", "In an open field"], "correct_index": 1, "topic": "hazard_awareness"},
            {"question": "What should you do immediately after the shaking stops?", "options": ["Check yourself and others for injuries", "Go back to sleep", "Ignore any unusual smells", "Take the elevator down"], "correct_index": 0, "topic": "post_event"},
            {"question": "If you smell gas after an earthquake, you should:", "options": ["Light a match to check", "Avoid switches/flames and move away, then report it", "Ignore it", "Try to fix the leak yourself"], "correct_index": 1, "topic": "hazard_awareness"},
            {"question": "During evacuation after an earthquake, you should use:", "options": ["The elevator", "The stairs, calmly", "A window", "Whatever is fastest, including pushing through crowds"], "correct_index": 1, "topic": "evacuation"},
        ],
    },
    {
        "slug": "flood-quiz",
        "title": "Flood Safety Quiz",
        "disaster_type": "Flood",
        "questions": [
            {"question": "How much moving water can sweep away most vehicles?", "options": ["30 cm (about a foot)", "2 metres", "It's always safe to drive through", "None, cars are always safe"], "correct_index": 0, "topic": "route_safety"},
            {"question": "A flood watch means:", "options": ["Flooding is guaranteed", "Conditions are favorable for flooding — prepare now", "It's safe to ignore", "The flood has already passed"], "correct_index": 1, "topic": "warnings"},
            {"question": "When should you evacuate during a flood?", "options": ["Only once water reaches your door", "Early, before conditions worsen, especially if advised", "Never, always shelter in place", "Only if a neighbour tells you to"], "correct_index": 1, "topic": "evacuation_timing"},
            {"question": "After floodwater recedes, you should:", "options": ["Return home immediately", "Wait for an official all-clear before returning", "Assume electricity is safe to use", "Ignore any structural damage"], "correct_index": 1, "topic": "post_event"},
        ],
    },
    {
        "slug": "wildfire-quiz",
        "title": "Wildfire Safety Quiz",
        "disaster_type": "Wildfire",
        "questions": [
            {"question": "What should residents generally NOT do during a wildfire?", "options": ["Evacuate early", "Attempt to fight a large wildfire themselves", "Prepare an emergency kit", "Follow official evacuation routes"], "correct_index": 1, "topic": "evacuation"},
            {"question": "\"Defensible space\" refers to:", "options": ["A bunker", "Clearing flammable material around your home", "A firefighting technique", "A type of fire truck"], "correct_index": 1, "topic": "preparation"},
            {"question": "If a route has heavy smoke and low visibility, you should:", "options": ["Take it anyway to save time", "Take a longer, clearer route if available", "Turn off your headlights", "Stop and wait in the smoke"], "correct_index": 1, "topic": "route_safety"},
        ],
    },
    {
        "slug": "tornado-quiz",
        "title": "Tornado Safety Quiz",
        "disaster_type": "Tornado",
        "questions": [
            {"question": "A tornado WARNING (vs watch) means:", "options": ["Conditions are merely favorable", "A tornado has been spotted or indicated by radar — take shelter now", "The danger has passed", "It's optional to take shelter"], "correct_index": 1, "topic": "warnings"},
            {"question": "The safest shelter location is generally:", "options": ["Near a window", "A small interior room/hallway on the lowest floor", "A garage", "Outside in the open"], "correct_index": 1, "topic": "shelter"},
            {"question": "During a tornado, you should protect your:", "options": ["Feet only", "Head and neck", "Nothing, just run", "Your belongings first"], "correct_index": 1, "topic": "bracing"},
        ],
    },
    {
        "slug": "cyclone-quiz",
        "title": "Cyclone Safety Quiz",
        "disaster_type": "Cyclone",
        "questions": [
            {"question": "The 'eye' of a cyclone is dangerous because:", "options": ["It never occurs", "It's a temporary calm before winds return from the opposite direction", "It's the safest time to go outside permanently", "It only happens after the storm ends"], "correct_index": 1, "topic": "storm_behavior"},
            {"question": "If you live in a low-lying coastal area under a cyclone warning, you should:", "options": ["Stay and wait it out", "Evacuate to a designated shelter or safe area inland", "Go to the beach to watch", "Ignore it if the wind seems calm"], "correct_index": 1, "topic": "evacuation"},
        ],
    },
]


def seed_all(db: Session):
    # Courses
    for c in COURSES:
        if not db.query(models.Course).filter(models.Course.slug == c["slug"]).first():
            db.add(models.Course(**c))

    # Simulations catalog (metadata only — content is the JSON file)
    for json_file in sorted(SIM_DATA_DIR.glob("*.json")):
        data = json.loads(json_file.read_text(encoding="utf-8"))
        slug = data["slug"]
        if not db.query(models.Simulation).filter(models.Simulation.slug == slug).first():
            db.add(models.Simulation(
                slug=slug,
                codename=data["codename"],
                disaster_type=data["disaster_type"],
                difficulty=data.get("difficulty", "Standard"),
                estimated_duration_minutes=data.get("estimated_duration_minutes", 8),
                description=data.get("description", ""),
            ))

    # Quizzes
    for q in QUIZZES:
        if not db.query(models.Quiz).filter(models.Quiz.slug == q["slug"]).first():
            db.add(models.Quiz(**q))

    db.commit()
    ensure_catalog_seeded(db)
