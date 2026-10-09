
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.database import get_db
from app.models import models
from app.schemas import schemas


router = APIRouter(prefix="/api/courses", tags=["courses"])


# Keep lesson IDs stable because they are stored in CourseProgress.
LESSONS = {
    "earthquake": [
        {
            "id": "earthquake-1",
            "title": "Understanding Earthquakes",
            "duration_minutes": 5,
            "content": [
                {
                    "heading": "What is an earthquake?",
                    "text": (
                        "An earthquake occurs when energy is suddenly released "
                        "inside the Earth, producing seismic waves that shake the ground."
                    ),
                },
                {
                    "heading": "Possible hazards",
                    "text": (
                        "Ground shaking can damage buildings and roads. Falling "
                        "objects, fires, and aftershocks may create additional danger."
                    ),
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
                    "text": (
                        "Secure heavy furniture, keep exits clear, and learn how "
                        "to shut off utilities if it is safe to do so."
                    ),
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
                    "text": (
                        "Drop to your hands and knees. Cover your head and neck "
                        "under a sturdy table if available, and hold on until shaking stops."
                    ),
                },
                {
                    "heading": "If you are outdoors",
                    "text": (
                        "Move to an open area away from buildings, trees, "
                        "streetlights, and power lines."
                    ),
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
                    "text": (
                        "Aftershocks may occur. Damaged buildings can collapse, "
                        "and leaking gas or damaged electrical systems can cause fires."
                    ),
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
                    "text": (
                        "Flooding can result from heavy rainfall, overflowing rivers, "
                        "storm surges, or drainage systems that cannot handle "
                        "large amounts of water."
                    ),
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
                    "text": (
                        "Keep essential supplies, medicines, drinking water, "
                        "important documents, and a charged phone ready."
                    ),
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
                    "text": (
                        "Floodwater can hide open drains, debris, strong currents, "
                        "and electrical hazards. Never walk or drive through floodwater."
                    ),
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
                    "text": (
                        "Wait for official clearance. Flood-damaged buildings may "
                        "be unstable, and water or food may be contaminated."
                    ),
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
            "title": "Understand Cyclones and Their Hazards",
            "duration_minutes": 7,
            "content": [
                {
                    "heading": "What is a tropical cyclone?",
                    "text": (
                        "A tropical cyclone is an organised rotating storm that "
                        "develops over warm ocean water. It can bring destructive "
                        "winds, intense rain, rough seas and dangerous coastal "
                        "flooding. In India, cyclones may affect the Bay of Bengal "
                        "and Arabian Sea coasts, and their impacts can extend far inland."
                    ),
                },
                {
                    "heading": "Know the main hazards",
                    "text": (
                        "Wind can damage roofs, trees and power lines. Heavy rain "
                        "can trigger river, urban and flash flooding. Storm surge "
                        "is an abnormal rise of sea water pushed toward the coast "
                        "by a storm; it can inundate low-lying areas, especially "
                        "when combined with high tide. Landslides may occur in "
                        "vulnerable hilly areas after prolonged rain."
                    ),
                },
                {
                    "heading": "Landfall does not mean danger is over",
                    "text": (
                        "The centre crossing the coast is called landfall. Strong "
                        "winds, heavy rain and flooding may continue after landfall, "
                        "and inland communities can also be affected. Forecasts "
                        "describe uncertainty, so use official local warnings "
                        "rather than judging danger from the sky outside."
                    ),
                },
            ],
            "key_actions": [
                "Know whether your home, school or workplace is in a low-lying or flood-prone area.",
                "Identify the nearest official cyclone shelter and more than one safe route.",
                "Follow IMD forecasts and district administration instructions; do not rely on forwarded rumours.",
            ],
            "takeaway": (
                "Cyclones are more than wind: storm surge and flooding can be "
                "deadly even when winds seem manageable."
            ),
            "media": {
                "type": "video",
                "title": "NDMA: What to do before and during a cyclone",
                "url": "https://www.youtube.com/watch?v=B9qR2e3xyJo",
                "source": "National Disaster Management Authority of India",
            },
        },
        {
            "id": "cyclone-2",
            "title": "Read Official Warnings and Alerts",
            "duration_minutes": 7,
            "content": [
                {
                    "heading": "Understand India's warning sequence",
                    "text": (
                        "IMD products can include a pre-cyclone watch, cyclone "
                        "alert, cyclone warning and post-landfall outlook. These "
                        "are operational products for different lead times and "
                        "audiences; the exact timing and wording can vary with "
                        "the system. Do not treat a generic online timeline as "
                        "a promise about when danger will arrive."
                    ),
                },
                {
                    "heading": "What you should do when an alert is issued",
                    "text": (
                        "Check the latest district-specific bulletin, expected "
                        "wind and rainfall, storm-surge information where available, "
                        "and the areas named in the warning. Prepare early, keep "
                        "your phone charged, and act on evacuation directions "
                        "from local authorities. If an alert changes, use the "
                        "newest official update."
                    ),
                },
                {
                    "heading": "Trusted information sources",
                    "text": (
                        "Use the India Meteorological Department (IMD) for cyclone "
                        "bulletins and weather warnings, NDMA's SACHET portal for "
                        "official alerts and preparedness guidance, and your "
                        "district or state disaster-management authority for "
                        "local shelters and evacuation orders."
                    ),
                },
            ],
            "key_actions": [
                "Bookmark the IMD cyclone page and NDMA SACHET alert portal.",
                "Share verified instructions, not unconfirmed messages or old screenshots.",
                "If authorities order evacuation, leave promptly rather than waiting for stronger wind.",
            ],
            "takeaway": (
                "A warning is an instruction to prepare or act—not a reason "
                "to wait and see."
            ),
            "media": {
                "type": "link",
                "title": "Live official cyclone information",
                "url": "https://mausam.imd.gov.in/imd_latest/contents/cyclone.php",
                "source": "India Meteorological Department",
            },
        },
        {
            "id": "cyclone-3",
            "title": "Prepare Your Household and Emergency Kit",
            "duration_minutes": 8,
            "content": [
                {
                    "heading": "Make a household plan",
                    "text": (
                        "Agree on where everyone will meet, who will collect "
                        "children or support a family member, and how you will "
                        "contact one another if mobile networks fail. Identify "
                        "an accessible shelter and transport option in advance. "
                        "Keep a written contact list with essential medicines "
                        "and medical needs."
                    ),
                },
                {
                    "heading": "Build a practical emergency kit",
                    "text": (
                        "Pack drinking water, ready-to-eat food, regular medicines, "
                        "first-aid supplies, a torch and spare batteries, a "
                        "battery-powered radio if available, power bank, phone "
                        "charger, hygiene items, cash, masks, and copies of "
                        "important documents in a waterproof pouch. Plan for "
                        "household needs and keep supplies easy to carry."
                    ),
                },
                {
                    "heading": "Reduce damage before the storm",
                    "text": (
                        "Bring loose outdoor objects inside if it is safe, secure "
                        "doors and windows, clear drains only before conditions "
                        "become dangerous, and move valuables and electrical "
                        "items above likely flood levels. Do not climb onto a "
                        "roof or go outside in high winds to make last-minute repairs."
                    ),
                },
            ],
            "key_actions": [
                "Charge phones and power banks before the weather deteriorates.",
                "Keep medicines, infant supplies, assistive devices and pet essentials ready.",
                "Keep important documents protected and the evacuation bag near an exit.",
            ],
            "takeaway": (
                "Prepare early, while it is still safe to travel and complete "
                "household tasks."
            ),
        },
        {
            "id": "cyclone-4",
            "title": "Evacuate Safely Before Coastal Flooding",
            "duration_minutes": 7,
            "content": [
                {
                    "heading": "Who may need to evacuate?",
                    "text": (
                        "People in low-lying coastal settlements, storm-surge "
                        "zones, river mouths, flood-prone areas, unsafe buildings "
                        "and locations identified by local authorities may need "
                        "to move to a designated cyclone shelter or safer inland "
                        "location. Follow the evacuation order for your area "
                        "even if the weather currently looks calm."
                    ),
                },
                {
                    "heading": "Leave early and use safe routes",
                    "text": (
                        "Take the recommended route and go to the designated "
                        "shelter or location. Do not walk or drive through "
                        "floodwater, cross flowing streams, or travel toward "
                        "the shoreline to watch waves. Roads can become blocked "
                        "quickly, so do not delay to protect possessions."
                    ),
                },
                {
                    "heading": "Support people who need assistance",
                    "text": (
                        "Plan transport and assistance for children, older adults, "
                        "people with disabilities, pregnant people, and anyone "
                        "who needs regular medical support. Keep pets secured "
                        "and follow shelter guidance. Tell a trusted person "
                        "where you are going if communication is available."
                    ),
                },
            ],
            "key_actions": [
                "Follow evacuation orders immediately and use official routes.",
                "Carry essential medicines, water, identification and emergency contacts.",
                "Never go to the beach, sea wall or riverbank during a cyclone warning.",
            ],
            "takeaway": (
                "Life safety comes first; belongings can be replaced, but "
                "evacuation routes may close rapidly."
            ),
        },
        {
            "id": "cyclone-5",
            "title": "Stay Safe During the Cyclone",
            "duration_minutes": 7,
            "content": [
                {
                    "heading": "If you are sheltering indoors",
                    "text": (
                        "Stay in a sturdy building or designated shelter, away "
                        "from windows and glass doors. Use an interior room on "
                        "a lower level that is not at risk of flooding. Keep "
                        "your emergency kit, phone and radio close, and follow "
                        "official updates. Avoid candles where possible; use "
                        "a torch to reduce fire risk."
                    ),
                },
                {
                    "heading": "Understand the eye of the storm",
                    "text": (
                        "Some cyclones have a relatively calm eye. This lull "
                        "can be temporary; destructive winds may return from "
                        "another direction. Do not go outside because the wind "
                        "has suddenly eased. Remain sheltered until authorities "
                        "confirm the danger has passed."
                    ),
                },
                {
                    "heading": "Avoid secondary dangers",
                    "text": (
                        "Stay away from floodwater, damaged electrical equipment, "
                        "windows, trees and exposed coastal areas. Do not use "
                        "generators, charcoal stoves or fuel-burning equipment "
                        "indoors because carbon monoxide can build up. If water "
                        "enters the building, move to a safer higher level if "
                        "possible and follow emergency instructions."
                    ),
                },
            ],
            "key_actions": [
                "Stay sheltered and keep away from windows.",
                "Do not touch electrical equipment or wires in wet areas.",
                "Never use a generator or charcoal stove inside a home, garage or enclosed space.",
            ],
            "takeaway": (
                "A temporary calm is not an all-clear. Stay sheltered until "
                "official advice says it is safe."
            ),
            "media": {
                "type": "video",
                "title": "NDMA: Safety from cyclones while indoors",
                "url": "https://www.youtube.com/watch?v=xNwo_a57KGc",
                "source": "National Disaster Management Authority of India",
            },
        },
        {
            "id": "cyclone-6",
            "title": "Recover Safely After the Cyclone",
            "duration_minutes": 7,
            "content": [
                {
                    "heading": "Wait for the official all-clear",
                    "text": (
                        "Do not return to evacuated areas until local authorities "
                        "say it is safe. Roads, bridges, buildings and slopes "
                        "may be damaged even after the rain and wind ease. Avoid "
                        "sightseeing or entering restricted areas."
                    ),
                },
                {
                    "heading": "Watch for hidden hazards",
                    "text": (
                        "Stay well away from fallen power lines and report them "
                        "to the electricity provider or emergency authorities. "
                        "Do not enter damaged buildings, touch wet electrical "
                        "appliances, or walk through standing water that may "
                        "hide open drains, debris, contamination or live electricity."
                    ),
                },
                {
                    "heading": "Protect health and help safely",
                    "text": (
                        "Use safe drinking water and discard food that may have "
                        "been contaminated or left unrefrigerated for an unsafe "
                        "period. Clean injuries and seek medical help when needed. "
                        "Check on neighbours only when routes are safe, and use "
                        "official channels to report urgent needs or damage."
                    ),
                },
            ],
            "key_actions": [
                "Wait for official clearance before returning home.",
                "Avoid downed wires, damaged structures and floodwater.",
                "Follow local advice about drinking water, food safety and cleanup.",
            ],
            "takeaway": (
                "Recovery can remain dangerous for days; keep following "
                "official updates after landfall."
            ),
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
                    "text": (
                        "Wildfires can spread through dry vegetation and are "
                        "affected by wind, heat, and available fuel."
                    ),
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
                    "text": (
                        "Keep essential items ready, plan transport, and identify "
                        "safe destinations outside the threatened area."
                    ),
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
                    "text": (
                        "Evacuate when instructed. Smoke can harm breathing, "
                        "and fire direction can change rapidly with the wind."
                    ),
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
                    "text": (
                        "Hot spots, falling trees, damaged power lines, and "
                        "unstable ground can remain dangerous after a fire."
                    ),
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
                    "text": (
                        "A tornado is a violently rotating column of air "
                        "associated with a thunderstorm. Flying debris and "
                        "structural damage are major hazards."
                    ),
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
                    "text": (
                        "Identify a basement or a small interior room on the "
                        "lowest floor, away from windows."
                    ),
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
                    "text": (
                        "Move to your designated shelter. Protect your head "
                        "and neck with your arms or sturdy padding."
                    ),
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
                    "text": (
                        "Debris, broken glass, unstable buildings, gas leaks, "
                        "and fallen power lines can cause serious injuries."
                    ),
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
            "question": "Which hazard can push seawater onto low-lying coastal land?",
            "options": [
                "Storm surge",
                "Heat index",
                "Aftershock",
                "Drought",
            ],
            "correct_index": 0,
            "topic": "Hazards",
        },
        {
            "question": "Which source should you use for official cyclone forecasts in India?",
            "options": [
                "Unverified forwarded messages",
                "India Meteorological Department (IMD)",
                "A random social media post",
                "A guess based on the sky",
            ],
            "correct_index": 1,
            "topic": "Warnings",
        },
        {
            "question": (
                "When local authorities order evacuation from a low-lying "
                "coastal area, you should:"
            ),
            "options": [
                "Wait until water reaches the road",
                "Leave promptly using the advised route",
                "Go to the beach to check waves",
                "Stay to protect possessions",
            ],
            "correct_index": 1,
            "topic": "Evacuation",
        },
        {
            "question": "Which item is useful in a cyclone emergency kit?",
            "options": [
                "Only decorative items",
                "A torch, batteries, medicines and drinking water",
                "A candle as the only light source",
                "Heavy furniture",
            ],
            "correct_index": 1,
            "topic": "Preparation",
        },
        {
            "question": (
                "Why must you stay indoors during a temporary calm in a cyclone?"
            ),
            "options": [
                "The storm may be passing through its eye and winds can return",
                "It proves the cyclone has ended",
                "It means all roads are safe",
                "It means there is no flood risk",
            ],
            "correct_index": 0,
            "topic": "Storm behaviour",
        },
        {
            "question": "What is the safest general action during severe cyclone winds?",
            "options": [
                "Stand beside a glass window",
                "Stay in a sturdy shelter away from windows",
                "Go outside to inspect the roof",
                "Stand under a tree",
            ],
            "correct_index": 1,
            "topic": "Shelter",
        },
        {
            "question": (
                "After a cyclone, a fallen electrical wire is on the road. You should:"
            ),
            "options": [
                "Move it with a stick",
                "Stay far away and report it",
                "Drive over it quickly",
                "Pour water on it",
            ],
            "correct_index": 1,
            "topic": "Recovery",
        },
        {
            "question": "When is it safe to return to an evacuated area?",
            "options": [
                "As soon as the wind eases",
                "When neighbours start returning",
                "After official clearance and local safety guidance",
                "Immediately after landfall",
            ],
            "correct_index": 2,
            "topic": "Recovery",
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
        "duration_minutes": sum(
            lesson["duration_minutes"] for lesson in lessons
        ),
        "quiz_count": 1 if QUIZZES.get(course.slug) else 0,
        "progress": int(progress.progress or 0) if progress else 0,
        "viewed_sections": (
            list(progress.viewed_sections or []) if progress else []
        ),
        "completed": bool(progress.completed) if progress else False,
    }


@router.get("")
def list_courses(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    courses = (
        db.query(models.Course)
        .order_by(models.Course.id.asc())
        .all()
    )

    records = (
        db.query(models.CourseProgress)
        .filter(models.CourseProgress.user_id == current_user.id)
        .all()
    )

    progress_map = {
        record.course_id: record
        for record in records
    }

    return [
        _course_summary(course, progress_map.get(course.id))
        for course in courses
    ]


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

    if not lessons:
        raise HTTPException(
            status_code=404,
            detail="Course content is not available.",
        )

    objectives = (
        [
            "Explain cyclone wind, rainfall, storm-surge and flood hazards.",
            "Interpret official warnings and identify trusted information sources.",
            "Prepare a household plan and a practical emergency kit.",
            "Choose safer evacuation and shelter actions before and during a cyclone.",
            "Recognise post-cyclone hazards and recover safely.",
        ]
        if course.slug == "cyclone"
        else [
            "Understand the main hazards associated with this disaster.",
            "Learn how to prepare before an emergency.",
            "Recognise safer actions during and after the event.",
        ]
    )

    return {
        **_course_summary(course, progress),
        "lessons": lessons,
        "quiz": quiz,
        "objectives": objectives,
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
    course = _get_course_or_404(slug, db)
    lessons = LESSONS.get(course.slug, [])

    valid_ids = {
        lesson["id"]
        for lesson in lessons
    }

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
        item
        for item in (record.viewed_sections or [])
        if isinstance(item, str) and item in valid_ids
    ]

    merged = list(dict.fromkeys(existing + requested))

    # Calculate progress on the server rather than trusting client percentages.
    calculated_progress = (
        round((len(merged) / len(lessons)) * 100)
        if lessons
        else 0
    )

    record.viewed_sections = merged
    record.progress = max(
        int(record.progress or 0),
        calculated_progress,
    )

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
