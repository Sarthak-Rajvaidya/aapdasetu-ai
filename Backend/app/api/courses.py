
"""Disaster preparedness courses for AapdaSetu AI.

Keep the existing authentication dependency and progress database models.
Lesson IDs are stable because saved progress refers to these IDs.
"""

from datetime import datetime
from threading import Lock

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.database import get_db
from app.models import models
from app.schemas import schemas


router = APIRouter(prefix="/api/courses", tags=["courses"])


# ---------------------------------------------------------------------------
# Trusted learning resources
# ---------------------------------------------------------------------------

NDMA_CYCLONE_VIDEO = {
    "type": "video",
    "title": "Cyclone preparedness and safety",
    "source": "National Disaster Management Authority (NDMA)",
    "url": "https://www.youtube.com/watch?v=B9qR2e3xyJo",
    "embed_url": "https://www.youtube-nocookie.com/embed/B9qR2e3xyJo",
}

NDMA_WARNING_VIDEO = {
    "type": "video",
    "title": "Early warnings and disaster response",
    "source": "National Disaster Management Authority (NDMA)",
    "url": "https://www.youtube.com/watch?v=jXEDxQzVFSs",
    "embed_url": "https://www.youtube-nocookie.com/embed/jXEDxQzVFSs",
}

IMD_CYCLONE_RESOURCE = {
    "type": "resource",
    "title": "Official cyclone forecasts and warnings",
    "source": "India Meteorological Department (IMD)",
    "url": "https://mausam.imd.gov.in/imd_latest/contents/cyclone.php",
}

NDMA_ALERT_RESOURCE = {
    "type": "resource",
    "title": "Official disaster alerts and preparedness",
    "source": "NDMA SACHET",
    "url": "https://sachet.ndma.gov.in/DosDont",
}


# ---------------------------------------------------------------------------
# Course content
#
# Every lesson includes multiple content blocks, key actions, a takeaway,
# and optional learning media. Avoid replacing these IDs after progress
# has been saved unless you also migrate existing progress records.
# ---------------------------------------------------------------------------

LESSONS = {
    "cyclone": [
        {
            "id": "cyclone-1",
            "title": "Understanding Cyclones and Their Hazards",
            "duration_minutes": 8,
            "content": [
                {
                    "heading": "What is a tropical cyclone?",
                    "text": (
                        "A tropical cyclone is a rotating storm system that "
                        "develops over warm ocean water. It can produce "
                        "destructive winds, heavy rainfall, rough seas, and "
                        "coastal flooding. In India, cyclones can affect the "
                        "Bay of Bengal, Arabian Sea, coastal communities, "
                        "islands, and inland districts. A storm does not need "
                        "to pass directly overhead to cause dangerous weather."
                    ),
                },
                {
                    "heading": "Strong winds and flying debris",
                    "text": (
                        "Powerful winds can damage roofs, break branches, "
                        "topple trees, damage weak structures, and bring down "
                        "power lines. Loose objects can become dangerous "
                        "projectiles. Before conditions deteriorate, secure "
                        "outdoor items when it is safe to do so. During severe "
                        "winds, remain in a sturdy building away from windows."
                    ),
                },
                {
                    "heading": "Heavy rainfall and flooding",
                    "text": (
                        "Cyclones can produce prolonged rainfall far from "
                        "the coast. Rivers may overflow, roads may become "
                        "waterlogged, and steep slopes may become unstable. "
                        "Urban drainage systems can be overwhelmed. Never "
                        "assume that an inland location is safe simply because "
                        "the cyclone is offshore or has weakened."
                    ),
                },
                {
                    "heading": "Storm surge and rough seas",
                    "text": (
                        "Storm surge is an abnormal rise in sea level caused "
                        "by a storm. It can push seawater onto low-lying coastal "
                        "land and become especially dangerous when combined "
                        "with high tide. Rough waves can also sweep people away "
                        "from beaches, seawalls, rocks, and waterfront roads. "
                        "Do not approach the sea to watch a cyclone."
                    ),
                },
            ],
            "key_actions": [
                "Recognise wind, rainfall, storm-surge, and flood hazards.",
                "Stay away from beaches and exposed coastal structures.",
                "Treat inland flooding as a serious cyclone risk.",
                "Follow local warnings rather than judging safety by appearance.",
            ],
            "takeaway": (
                "Cyclone danger includes much more than wind. Floodwater "
                "and storm surge can be deadly even away from the storm centre."
            ),
            "media": NDMA_CYCLONE_VIDEO,
        },
        {
            "id": "cyclone-2",
            "title": "Reading Official Warnings and Forecasts",
            "duration_minutes": 7,
            "content": [
                {
                    "heading": "Use authoritative information",
                    "text": (
                        "The India Meteorological Department (IMD) publishes "
                        "cyclone forecasts and weather warnings. NDMA SACHET "
                        "provides disaster alerts, while state and district "
                        "authorities issue local instructions such as "
                        "evacuation notices, shelter details, and road "
                        "restrictions. Use these sources rather than relying "
                        "on forwarded messages or unverified social posts."
                    ),
                },
                {
                    "heading": "Understand the affected area and time",
                    "text": (
                        "Read which districts or coastal areas are mentioned "
                        "and the period covered by the warning. A forecast "
                        "track is an estimate, not a guarantee of the exact "
                        "path. Weather and local impacts can change. Check "
                        "updated bulletins and follow instructions relevant "
                        "to your location."
                    ),
                },
                {
                    "heading": "Act before conditions become dangerous",
                    "text": (
                        "Warnings provide time to prepare, secure supplies, "
                        "arrange transport, and evacuate if ordered. Do not "
                        "wait until strong winds or rising water are visible. "
                        "Travel may become dangerous, roads may close, and "
                        "communication or electricity may be interrupted."
                    ),
                },
                {
                    "heading": "Avoid misinformation",
                    "text": (
                        "Check the date, source, and location of an alert. "
                        "Old cyclone videos may be recirculated as new events. "
                        "Do not forward unverified claims about landfall, "
                        "casualties, or evacuation orders. Share official "
                        "updates without changing their meaning."
                    ),
                },
            ],
            "key_actions": [
                "Check IMD forecasts and NDMA SACHET alerts.",
                "Read the locations and time period covered by a warning.",
                "Recheck updates as conditions change.",
                "Do not share unverified emergency information.",
            ],
            "takeaway": (
                "Official warnings and local instructions should guide "
                "preparedness and evacuation decisions."
            ),
            "media": NDMA_WARNING_VIDEO,
        },
        {
            "id": "cyclone-3",
            "title": "Build a Household Emergency Plan",
            "duration_minutes": 8,
            "content": [
                {
                    "heading": "Choose safe destinations",
                    "text": (
                        "Identify the designated cyclone shelter or other "
                        "safe location recommended by local authorities. "
                        "Learn the advised evacuation route and an alternative "
                        "if the main road becomes blocked. Do not choose a "
                        "beach, riverbank, low-lying underpass, or exposed "
                        "structure as a safe destination."
                    ),
                },
                {
                    "heading": "Plan for every household member",
                    "text": (
                        "Discuss how family members will leave, where they "
                        "will meet, and whom they will contact if separated. "
                        "Write important phone numbers on paper. Make advance "
                        "arrangements for children, older adults, people with "
                        "disabilities, pregnant people, and anyone who needs "
                        "regular medication or medical equipment."
                    ),
                },
                {
                    "heading": "Prepare transport and communication",
                    "text": (
                        "Identify available transport before the weather "
                        "deteriorates. Keep phones charged and agree on a "
                        "contact outside the affected area if possible. "
                        "Networks may fail or become congested, so family "
                        "members should know the meeting plan without needing "
                        "constant mobile connectivity."
                    ),
                },
                {
                    "heading": "Include pets and essential needs",
                    "text": (
                        "Plan in advance for pets and livestock using guidance "
                        "from local authorities. Pack essential medicines, "
                        "mobility aids, identification, and necessary care "
                        "supplies. Never delay an urgent evacuation to retrieve "
                        "non-essential possessions or attempt a dangerous "
                        "rescue of animals."
                    ),
                },
            ],
            "key_actions": [
                "Write down an evacuation destination and route.",
                "Agree on meeting points and an emergency contact.",
                "Plan transport and assistance before a warning becomes urgent.",
                "Include medicines, accessibility needs, and family dependants.",
            ],
            "takeaway": (
                "A useful emergency plan is agreed upon before the cyclone, "
                "not improvised during dangerous weather."
            ),
        },
        {
            "id": "cyclone-4",
            "title": "Prepare an Emergency Kit and Secure Your Home",
            "duration_minutes": 8,
            "content": [
                {
                    "heading": "Pack essential supplies",
                    "text": (
                        "Prepare drinking water, ready-to-eat food, essential "
                        "medicines, a first-aid kit, a torch, spare batteries, "
                        "a charged power bank, hygiene products, sturdy "
                        "footwear, and necessary baby-care supplies. Keep "
                        "identification and important records in waterproof "
                        "packaging. Include cash and written emergency contacts "
                        "because ATMs, shops, and networks may be unavailable."
                    ),
                },
                {
                    "heading": "Protect documents and equipment",
                    "text": (
                        "Keep documents, medicines, and essential electronics "
                        "away from places likely to flood. Charge phones and "
                        "backup batteries before outages occur. Keep the kit "
                        "somewhere accessible so that household members can "
                        "take it quickly when evacuation is necessary."
                    ),
                },
                {
                    "heading": "Reduce hazards around the home",
                    "text": (
                        "When it is still safe, secure loose outdoor objects, "
                        "bring lightweight items indoors, and close and secure "
                        "doors and windows. Keep access routes clear. Do not "
                        "climb onto a roof or attempt risky repairs as the "
                        "storm approaches."
                    ),
                },
                {
                    "heading": "Prepare for service interruptions",
                    "text": (
                        "Expect possible electricity, water, transport, and "
                        "mobile-network disruptions. Store supplies according "
                        "to household needs and current official advice. Know "
                        "how to shut off utilities only if you can do so safely "
                        "and have the appropriate instructions or training."
                    ),
                },
            ],
            "key_actions": [
                "Pack water, food, medicines, a torch, and first-aid supplies.",
                "Keep documents protected from water.",
                "Charge communication devices and backup batteries.",
                "Secure loose objects only while conditions are safe.",
            ],
            "takeaway": (
                "Prepare the kit early and keep it accessible; do not put "
                "yourself at risk trying to secure the house at the last minute."
            ),
        },
        {
            "id": "cyclone-5",
            "title": "Evacuation and Safe Shelter",
            "duration_minutes": 8,
            "content": [
                {
                    "heading": "Take evacuation orders seriously",
                    "text": (
                        "If authorities order evacuation, leave promptly "
                        "using the advised route. Low-lying coastal locations, "
                        "areas exposed to storm surge, flood-prone settlements, "
                        "and unsafe buildings may require early evacuation. "
                        "Do not wait for water to reach your home or for the "
                        "strongest winds to begin."
                    ),
                },
                {
                    "heading": "Travel safely",
                    "text": (
                        "Take essential medicines, identification, necessary "
                        "assistive devices, and your emergency kit. Follow "
                        "road closures and directions from emergency personnel. "
                        "Never walk or drive through floodwater, and do not "
                        "take an unofficial shortcut through a flooded road, "
                        "drain, or coastal area."
                    ),
                },
                {
                    "heading": "Choose shelter carefully",
                    "text": (
                        "Use the designated shelter or location directed by "
                        "local authorities. If sheltering in a sturdy building, "
                        "stay in an interior area away from windows and glass "
                        "doors. Avoid balconies, exposed rooftops, and "
                        "vulnerable rooms. Keep a torch, phone, medicines, "
                        "and emergency information accessible."
                    ),
                },
                {
                    "heading": "Do not mistake calm for safety",
                    "text": (
                        "A cyclone's eye can produce a temporary period of "
                        "calmer conditions. Dangerous winds may return from "
                        "another direction after the eye passes. Remain "
                        "sheltered and continue following official guidance "
                        "until authorities say conditions are safe."
                    ),
                },
            ],
            "key_actions": [
                "Evacuate promptly when instructed.",
                "Use official routes and designated shelters.",
                "Stay away from windows during severe winds.",
                "Remain sheltered during temporary calm conditions.",
            ],
            "takeaway": (
                "Do not wait for visible danger to evacuate, and never assume "
                "a temporary calm means the cyclone has ended."
            ),
            "media": NDMA_CYCLONE_VIDEO,
        },
        {
            "id": "cyclone-6",
            "title": "Survive Severe Winds, Flooding, and Electrical Hazards",
            "duration_minutes": 8,
            "content": [
                {
                    "heading": "During severe winds",
                    "text": (
                        "Remain inside a sturdy building away from windows "
                        "and exterior doors. Do not go outside to inspect the "
                        "roof, retrieve objects, or stand beneath trees, "
                        "signboards, unstable walls, or overhead power lines. "
                        "Wait for official updates rather than relying on "
                        "what you can see from a window."
                    ),
                },
                {
                    "heading": "When floodwater threatens",
                    "text": (
                        "Move to the safe location recommended by authorities. "
                        "Floodwater can conceal open drains, damaged roads, "
                        "debris, and electrical hazards. Moving water can "
                        "sweep people and vehicles away. Never walk, swim, "
                        "or drive through floodwater when a safe alternative "
                        "is available."
                    ),
                },
                {
                    "heading": "Fallen power lines and damaged equipment",
                    "text": (
                        "Treat every fallen electrical wire as dangerous. "
                        "Stay far away and report it to the appropriate "
                        "utility or authorities. Never touch it or attempt "
                        "to move it with an object. Avoid flooded areas where "
                        "electrical wiring or appliances may be submerged."
                    ),
                },
                {
                    "heading": "Gas leaks and urgent emergencies",
                    "text": (
                        "If you suspect a gas leak, avoid flames and actions "
                        "that may create sparks. Move away and contact the "
                        "appropriate emergency or utility service from a safe "
                        "location. If someone is trapped or seriously injured, "
                        "contact emergency services and do not enter dangerous "
                        "water or unstable structures to attempt an untrained "
                        "rescue."
                    ),
                },
            ],
            "key_actions": [
                "Stay indoors and away from windows during severe winds.",
                "Never cross floodwater or approach fast-moving water.",
                "Keep far away from fallen power lines.",
                "Report gas leaks and serious hazards from a safe location.",
            ],
            "takeaway": (
                "Avoid secondary hazards. Floodwater, electricity, gas leaks, "
                "and debris can remain dangerous even when winds weaken."
            ),
        },
        {
            "id": "cyclone-7",
            "title": "Recovery, Drinking Water, and Returning Home",
            "duration_minutes": 8,
            "content": [
                {
                    "heading": "Check safety before returning",
                    "text": (
                        "Do not return to an evacuated area until authorities "
                        "indicate that it is safe. Roads may be damaged, "
                        "floodwater may remain, and buildings may be unstable. "
                        "Stay away from damaged walls, hanging debris, exposed "
                        "wiring, and areas where water is moving."
                    ),
                },
                {
                    "heading": "Check injuries and seek assistance",
                    "text": (
                        "Check yourself and other people for injuries. Contact "
                        "emergency services for urgent medical or life-threatening "
                        "situations. Avoid entering damaged buildings to retrieve "
                        "belongings. Report dangerous structures and downed "
                        "electrical wires to the relevant authorities."
                    ),
                },
                {
                    "heading": "Use safe drinking water and food",
                    "text": (
                        "Floodwater may contain sewage, chemicals, and waste. "
                        "Clear-looking water is not necessarily safe. Use sealed "
                        "bottled water or follow current public-health guidance "
                        "for treatment and storage. Follow official advice "
                        "about food exposed to floodwater and maintain hygiene."
                    ),
                },
                {
                    "heading": "Support recovery and wellbeing",
                    "text": (
                        "Disasters can cause fear, exhaustion, and confusion. "
                        "Help children and vulnerable people reach a safe "
                        "place, stay connected with trusted contacts when "
                        "possible, and seek medical or psychosocial support "
                        "when needed. Report hazards and use verified "
                        "information for recovery assistance."
                    ),
                },
            ],
            "key_actions": [
                "Return only when authorities say it is safe.",
                "Avoid damaged structures, exposed wiring, and floodwater.",
                "Use safe drinking water and follow public-health advice.",
                "Check for injuries and report dangerous conditions.",
            ],
            "takeaway": (
                "The recovery phase still has serious hazards. Official "
                "clearance and safe water are essential."
            ),
            "media": NDMA_WARNING_VIDEO,
        },
    ],

    "earthquake": [
        {
            "id": "earthquake-1",
            "title": "Understand Earthquake Hazards",
            "duration_minutes": 7,
            "content": [
                {
                    "heading": "What happens during an earthquake?",
                    "text": (
                        "An earthquake occurs when energy is released in the "
                        "Earth and produces ground shaking. Shaking can move "
                        "furniture, break glass, damage buildings, and disrupt "
                        "roads, water supplies, and electricity. The severity "
                        "of local damage depends on several factors, including "
                        "the earthquake, ground conditions, and building design."
                    ),
                },
                {
                    "heading": "Secondary hazards",
                    "text": (
                        "Earthquakes can trigger falling objects, fires, "
                        "damaged electrical wiring, landslides, and in some "
                        "coastal settings, tsunamis. Aftershocks may occur "
                        "after the main event. A building that appears intact "
                        "may still have structural damage."
                    ),
                },
            ],
            "key_actions": [
                "Identify sturdy cover and safer areas in frequently used rooms.",
                "Secure heavy furniture where possible.",
                "Know how to receive local emergency alerts.",
            ],
            "takeaway": "Prepare for both ground shaking and secondary hazards.",
        },
        {
            "id": "earthquake-2",
            "title": "Prepare Your Home and Emergency Kit",
            "duration_minutes": 7,
            "content": [
                {
                    "heading": "Reduce falling-object hazards",
                    "text": (
                        "Secure heavy furniture and storage units where "
                        "possible. Keep heavy objects on lower shelves and "
                        "identify locations away from glass and items that "
                        "could fall. Keep exits and hallways clear."
                    ),
                },
                {
                    "heading": "Make a family plan",
                    "text": (
                        "Agree on meeting points, emergency contacts, and "
                        "how to reconnect if communications fail. Prepare "
                        "water, food, medicines, a torch, batteries, a first-aid "
                        "kit, and copies of important documents."
                    ),
                },
            ],
            "key_actions": [
                "Secure heavy furniture and objects.",
                "Keep emergency supplies accessible.",
                "Plan meeting points and emergency contacts.",
            ],
            "takeaway": "Preparation reduces injuries and confusion.",
        },
        {
            "id": "earthquake-3",
            "title": "What to Do During Shaking",
            "duration_minutes": 7,
            "content": [
                {
                    "heading": "Drop, Cover, and Hold On",
                    "text": (
                        "If indoors, drop to your hands and knees, take cover "
                        "under a sturdy table or desk if available, and hold "
                        "on until shaking stops. Protect your head and neck. "
                        "If sturdy cover is not available, move away from "
                        "windows and protect your head and neck."
                    ),
                },
                {
                    "heading": "Avoid dangerous movement",
                    "text": (
                        "Do not use elevators or rush down stairs while "
                        "shaking continues. If outdoors, move away from "
                        "buildings, trees, streetlights, and power lines "
                        "when you can do so safely. If driving, pull over "
                        "away from bridges, overpasses, and power lines."
                    ),
                },
            ],
            "key_actions": [
                "Drop, Cover, and Hold On indoors.",
                "Protect your head and neck.",
                "Avoid windows and falling objects.",
                "Stay away from buildings and wires when outdoors.",
            ],
            "takeaway": "Protect yourself during shaking before attempting to move.",
        },
        {
            "id": "earthquake-4",
            "title": "After an Earthquake",
            "duration_minutes": 7,
            "content": [
                {
                    "heading": "Check for immediate dangers",
                    "text": (
                        "Check for injuries and hazards such as fire, damaged "
                        "wiring, gas leaks, and structural damage. Leave a "
                        "dangerous building when a safe route is available. "
                        "Do not use elevators in a potentially damaged building."
                    ),
                },
                {
                    "heading": "Expect aftershocks",
                    "text": (
                        "Aftershocks can cause further damage. Stay away from "
                        "damaged structures and follow official instructions. "
                        "If near a coast and authorities issue a tsunami "
                        "warning, move promptly to the designated safe area "
                        "or higher ground as instructed."
                    ),
                },
            ],
            "key_actions": [
                "Check injuries and contact emergency services when needed.",
                "Avoid damaged buildings and downed wires.",
                "Prepare for aftershocks and follow official guidance.",
            ],
            "takeaway": "A building can remain dangerous after the shaking ends.",
        },
    ],

    "flood": [
        {
            "id": "flood-1",
            "title": "Understand Flood Risks",
            "duration_minutes": 7,
            "content": [
                {
                    "heading": "How flooding develops",
                    "text": (
                        "Flooding can result from intense rainfall, overflowing "
                        "rivers, drainage failures, storm surge, or sudden "
                        "releases of water. Water can rise quickly in low-lying "
                        "areas and urban streets. Conditions can change even "
                        "when rain appears to ease."
                    ),
                },
                {
                    "heading": "Hidden hazards",
                    "text": (
                        "Floodwater can conceal open drains, sharp debris, "
                        "damaged roads, and electrical hazards. It may contain "
                        "sewage or chemicals. Even shallow moving water can "
                        "cause loss of balance, so avoid entering it."
                    ),
                },
            ],
            "key_actions": [
                "Know whether your home or route is flood-prone.",
                "Monitor official rainfall and flood warnings.",
                "Identify higher ground and safe evacuation routes.",
            ],
            "takeaway": "Never judge floodwater safety by depth or appearance alone.",
        },
        {
            "id": "flood-2",
            "title": "Prepare Before Flooding",
            "duration_minutes": 7,
            "content": [
                {
                    "heading": "Prepare supplies and documents",
                    "text": (
                        "Keep essential medicines, drinking water, food, "
                        "a torch, batteries, a first-aid kit, and important "
                        "documents in waterproof packaging. Charge phones "
                        "and backup batteries when a warning is issued."
                    ),
                },
                {
                    "heading": "Plan evacuation",
                    "text": (
                        "Know the local evacuation route and safe destination. "
                        "Make arrangements for children, older adults, people "
                        "with disabilities, and pets. Move important items "
                        "away from likely floodwater only when safe."
                    ),
                },
            ],
            "key_actions": [
                "Prepare an emergency kit.",
                "Protect documents and medicines from water.",
                "Plan transport and evacuation in advance.",
            ],
            "takeaway": "Leave early when authorities advise evacuation.",
        },
        {
            "id": "flood-3",
            "title": "Respond to Rising Water",
            "duration_minutes": 7,
            "content": [
                {
                    "heading": "Move to a safer location",
                    "text": (
                        "Follow official instructions and move to higher "
                        "ground or a designated shelter as directed. Do not "
                        "wait for water to enter your home. Avoid riverbanks, "
                        "drains, underpasses, and routes covered by water."
                    ),
                },
                {
                    "heading": "Never cross floodwater",
                    "text": (
                        "Do not walk, swim, or drive through floodwater. "
                        "The road surface may have collapsed, and the water "
                        "may be moving faster than it appears. Turn around "
                        "and use a safe route recommended by authorities."
                    ),
                },
            ],
            "key_actions": [
                "Follow evacuation instructions.",
                "Move away from rising water.",
                "Never enter flooded roads or drains.",
            ],
            "takeaway": "Turn around rather than attempting to cross floodwater.",
        },
        {
            "id": "flood-4",
            "title": "Recovery and Water Safety",
            "duration_minutes": 7,
            "content": [
                {
                    "heading": "Avoid electrical and structural hazards",
                    "text": (
                        "Keep away from fallen wires, damaged buildings, "
                        "and submerged electrical equipment. Do not operate "
                        "electrical appliances that have been flooded until "
                        "they have been assessed by a qualified professional."
                    ),
                },
                {
                    "heading": "Use safe water",
                    "text": (
                        "Floodwater can contaminate drinking-water supplies. "
                        "Use sealed bottled water or follow current local "
                        "public-health advice for treatment and storage. "
                        "Do not enter an evacuated area until authorities "
                        "say it is safe."
                    ),
                },
            ],
            "key_actions": [
                "Avoid downed wires and damaged structures.",
                "Use safe drinking water.",
                "Follow official return and cleanup instructions.",
            ],
            "takeaway": "Flood recovery can involve serious hazards long after water recedes.",
        },
    ],

    "wildfire": [
        {
            "id": "wildfire-1",
            "title": "Understand Wildfire Behaviour",
            "duration_minutes": 7,
            "content": [
                {
                    "heading": "How wildfires spread",
                    "text": (
                        "Wildfires spread through dry vegetation and can "
                        "intensify with wind, heat, and low humidity. Embers "
                        "may travel ahead of the visible fire and ignite "
                        "new areas. Smoke can affect people far from the "
                        "flames and reduce visibility."
                    ),
                },
                {
                    "heading": "Recognise changing conditions",
                    "text": (
                        "Wind shifts, smoke, road closures, and official "
                        "evacuation alerts can signal increasing danger. "
                        "Do not enter a fire area to observe or photograph "
                        "the flames."
                    ),
                },
            ],
            "key_actions": [
                "Monitor local fire and evacuation alerts.",
                "Know at least one safe exit route.",
                "Avoid smoke and active fire areas.",
            ],
            "takeaway": "Wildfires can spread rapidly and change direction.",
        },
        {
            "id": "wildfire-2",
            "title": "Prepare to Evacuate",
            "duration_minutes": 7,
            "content": [
                {
                    "heading": "Pack and plan early",
                    "text": (
                        "Prepare medicines, identification, water, food, "
                        "a torch, phone chargers, and essential supplies. "
                        "Keep vehicles ready when possible and plan how "
                        "children, older adults, pets, and people needing "
                        "assistance will leave."
                    ),
                },
                {
                    "heading": "Follow evacuation orders",
                    "text": (
                        "Leave promptly when instructed and use designated "
                        "routes. Roads may close or become unsafe due to "
                        "smoke, flames, or falling trees. Do not delay "
                        "evacuation to collect non-essential possessions."
                    ),
                },
            ],
            "key_actions": [
                "Keep essential supplies accessible.",
                "Plan transport and assistance.",
                "Leave promptly when ordered.",
            ],
            "takeaway": "Early evacuation is safer than waiting to see flames.",
        },
        {
            "id": "wildfire-3",
            "title": "Smoke and Immediate Safety",
            "duration_minutes": 7,
            "content": [
                {
                    "heading": "Reduce smoke exposure",
                    "text": (
                        "Follow local public-health advice and avoid outdoor "
                        "activity in heavy smoke. Keep doors and windows "
                        "closed when advised and use cleaner indoor air "
                        "if available. People with breathing or heart "
                        "conditions should follow their medical guidance."
                    ),
                },
                {
                    "heading": "Avoid active fire areas",
                    "text": (
                        "Do not enter burned or actively burning areas. "
                        "Falling trees, hot ash, hidden embers, damaged "
                        "power lines, and unstable ground can remain "
                        "dangerous even when flames are not visible."
                    ),
                },
            ],
            "key_actions": [
                "Follow local smoke and evacuation advisories.",
                "Avoid active fire areas and unstable burned ground.",
                "Seek medical assistance for severe breathing difficulties.",
            ],
            "takeaway": "Smoke and hidden hazards can be dangerous beyond the fire line.",
        },
        {
            "id": "wildfire-4",
            "title": "Recovery After a Wildfire",
            "duration_minutes": 7,
            "content": [
                {
                    "heading": "Wait for clearance",
                    "text": (
                        "Return only when authorities say it is safe. "
                        "Burned trees, hot spots, unstable structures, "
                        "damaged utilities, and poor air quality may "
                        "persist after visible flames disappear."
                    ),
                },
                {
                    "heading": "Protect health and property",
                    "text": (
                        "Avoid disturbing ash and debris unnecessarily. "
                        "Follow local cleanup guidance and use suitable "
                        "protective equipment when instructed. Report "
                        "damaged utility lines and do not touch them."
                    ),
                },
            ],
            "key_actions": [
                "Wait for official clearance before returning.",
                "Avoid ash, hot spots, and unstable structures.",
                "Report damaged utilities.",
            ],
            "takeaway": "The area remains hazardous until authorities clear it.",
        },
    ],

    "tornado": [
        {
            "id": "tornado-1",
            "title": "Recognise Tornado Hazards",
            "duration_minutes": 6,
            "content": [
                {
                    "heading": "What is a tornado?",
                    "text": (
                        "A tornado is a violently rotating column of air "
                        "associated with a storm and in contact with the "
                        "ground. It can damage buildings, overturn vehicles, "
                        "and carry debris at high speed. Severe weather "
                        "conditions can change rapidly."
                    ),
                },
                {
                    "heading": "Follow official alerts",
                    "text": (
                        "Pay attention to local weather warnings and emergency "
                        "instructions. Do not wait to visually confirm a "
                        "tornado before moving to a safer location when "
                        "an official warning applies to your area."
                    ),
                },
            ],
            "key_actions": [
                "Know where the safest interior shelter is located.",
                "Monitor official severe-weather warnings.",
                "Stay away from windows during dangerous conditions.",
            ],
            "takeaway": "Use warnings and shelter plans rather than trying to observe a tornado.",
        },
        {
            "id": "tornado-2",
            "title": "Prepare a Tornado Shelter",
            "duration_minutes": 6,
            "content": [
                {
                    "heading": "Choose shelter in advance",
                    "text": (
                        "Identify a basement or a small interior room on "
                        "the lowest floor, away from windows. Use the "
                        "shelter recommended for your building and local "
                        "conditions. A mobile home is not a safe shelter "
                        "during a tornado."
                    ),
                },
                {
                    "heading": "Keep supplies accessible",
                    "text": (
                        "Keep a torch, phone, essential medicines, sturdy "
                        "footwear, and a protective covering for your head "
                        "and neck accessible. Plan how household members "
                        "will reach shelter quickly."
                    ),
                },
            ],
            "key_actions": [
                "Identify an interior shelter away from windows.",
                "Prepare basic emergency supplies.",
                "Plan how everyone will reach shelter.",
            ],
            "takeaway": "Choose and practise the shelter plan before a warning.",
        },
        {
            "id": "tornado-3",
            "title": "Take Cover During a Tornado",
            "duration_minutes": 6,
            "content": [
                {
                    "heading": "Protect your head and neck",
                    "text": (
                        "Move to the designated shelter immediately. Stay "
                        "low and protect your head and neck with your arms "
                        "or sturdy padding. Keep away from windows and "
                        "exterior walls where possible."
                    ),
                },
                {
                    "heading": "Avoid unsafe locations",
                    "text": (
                        "Do not shelter beneath highway overpasses or "
                        "remain in a vehicle when a safer sturdy shelter "
                        "is accessible. If outdoors with no nearby shelter, "
                        "seek the lowest available ground away from vehicles "
                        "and flying debris, while recognising that no outdoor "
                        "location is guaranteed safe."
                    ),
                },
            ],
            "key_actions": [
                "Take cover immediately in the designated shelter.",
                "Protect your head and neck.",
                "Stay away from windows and flying debris.",
            ],
            "takeaway": "Reach the safest available shelter and protect your head and neck.",
        },
        {
            "id": "tornado-4",
            "title": "After a Tornado",
            "duration_minutes": 6,
            "content": [
                {
                    "heading": "Avoid damaged areas",
                    "text": (
                        "Watch for broken glass, unstable buildings, "
                        "hanging debris, gas leaks, and fallen electrical "
                        "wires. Do not enter damaged structures to retrieve "
                        "belongings."
                    ),
                },
                {
                    "heading": "Help safely",
                    "text": (
                        "Check for injuries and contact emergency services "
                        "when needed. Do not approach downed wires or enter "
                        "unsafe structures to attempt a rescue. Follow "
                        "official guidance before returning to damaged areas."
                    ),
                },
            ],
            "key_actions": [
                "Check for injuries.",
                "Avoid damaged structures and fallen wires.",
                "Follow official instructions during recovery.",
            ],
            "takeaway": "Debris and electrical hazards can remain dangerous after the storm.",
        },
    ],
}


# ---------------------------------------------------------------------------
# Quizzes
#
# correct_index is retained for compatibility with the existing frontend.
# Explanations are returned for useful learning feedback.
#
# For a public certification exam, move answer keys to a server-side grading
# endpoint so the browser never receives the correct answers in advance.
# ---------------------------------------------------------------------------

def _q(question, options, correct_index, explanation, topic):
    return {
        "question": question,
        "options": options,
        "correct_index": correct_index,
        "explanation": explanation,
        "topic": topic,
    }


QUIZZES = {
    "cyclone": [
        _q(
            "Which hazard can push seawater onto low-lying coastal land?",
            ["Storm surge", "Heat index", "Aftershock", "Drought"],
            0,
            "Storm surge is an abnormal rise in sea level caused by a storm.",
            "Hazards",
        ),
        _q(
            "Which organisation publishes official cyclone forecasts in India?",
            [
                "India Meteorological Department (IMD)",
                "An unverified social media account",
                "A forwarded messaging-group post",
                "A travel review website",
            ],
            0,
            "IMD publishes official meteorological forecasts and warnings.",
            "Warnings",
        ),
        _q(
            "Authorities order evacuation from a low-lying coastal area. What should you do?",
            [
                "Wait until water reaches the road",
                "Leave promptly using the advised route",
                "Go to the beach to inspect the waves",
                "Stay behind to protect possessions",
            ],
            1,
            "Prompt evacuation reduces exposure to storm surge, flooding, and dangerous travel conditions.",
            "Evacuation",
        ),
        _q(
            "Which group of items is most useful in a cyclone emergency kit?",
            [
                "Decorative items and spare furniture",
                "Water, medicines, a torch, and first-aid supplies",
                "Only candles and matches",
                "Heavy appliances and loose tools",
            ],
            1,
            "Water, medicines, lighting, and first-aid supplies support essential needs during disruptions.",
            "Preparation",
        ),
        _q(
            "Why should you remain sheltered during a temporary calm in a cyclone?",
            [
                "The eye may pass and dangerous winds can return",
                "A calm period proves the cyclone has ended",
                "All roads become safe during the eye",
                "Flood risk disappears when winds weaken briefly",
            ],
            0,
            "A temporary calm may occur near the eye; severe winds can return from another direction.",
            "Storm behaviour",
        ),
        _q(
            "What is the safest general action during severe cyclone winds?",
            [
                "Stand beside a glass window",
                "Stay in a sturdy shelter away from windows",
                "Go outdoors to inspect the roof",
                "Stand under a tree",
            ],
            1,
            "A sturdy shelter away from windows reduces exposure to wind and flying debris.",
            "Shelter",
        ),
        _q(
            "You see a fallen electrical wire after a cyclone. What should you do?",
            [
                "Move it with a stick",
                "Keep away and report it to authorities",
                "Drive over it quickly",
                "Pour water on it",
            ],
            1,
            "Fallen wires may remain live. Keep away and report the hazard.",
            "Electrical safety",
        ),
        _q(
            "When should you return to an evacuated area?",
            [
                "As soon as the wind becomes quieter",
                "When neighbours begin returning",
                "When authorities indicate it is safe",
                "As soon as mobile service returns",
            ],
            2,
            "Flooding, unstable structures, and electrical hazards can persist after winds weaken.",
            "Recovery",
        ),
        _q(
            "Why can cyclone rainfall be dangerous far inland?",
            [
                "It can cause river flooding and landslides",
                "It always disappears before reaching land",
                "It prevents all roads from becoming flooded",
                "It only affects beaches",
            ],
            0,
            "Heavy rainfall can cause river flooding, urban waterlogging, and landslides far from the coast.",
            "Rainfall hazards",
        ),
        _q(
            "What is the safest response when a road is covered in moving floodwater?",
            [
                "Drive through if the vehicle is large",
                "Walk through while holding a railing",
                "Follow another vehicle through it",
                "Do not cross; use a safe alternative route",
            ],
            3,
            "Floodwater can conceal road damage and move people or vehicles unexpectedly.",
            "Flood safety",
        ),
        _q(
            "Which is the best way to verify an evacuation instruction?",
            [
                "Check official local authority channels",
                "Trust the most widely forwarded message",
                "Ask an anonymous online account",
                "Assume the instruction is old",
            ],
            0,
            "Local authorities provide instructions relevant to affected areas and evacuation routes.",
            "Emergency information",
        ),
        _q(
            "What should a household do before cyclone conditions become dangerous?",
            [
                "Wait for visible flooding before planning",
                "Prepare supplies and agree on an evacuation plan",
                "Travel to the coast to observe the storm",
                "Leave medicines and documents unpacked",
            ],
            1,
            "Advance planning allows safer evacuation and reduces last-minute exposure.",
            "Household planning",
        ),
        _q(
            "Why is floodwater potentially unsafe even when it looks clear?",
            [
                "It may contain sewage, chemicals, or hidden hazards",
                "Clear water is always electrically safe",
                "It cannot conceal road damage",
                "It is always safe to drink after settling",
            ],
            0,
            "Appearance does not reveal contamination, hidden debris, or electrical dangers.",
            "Public health",
        ),
        _q(
            "You suspect a gas leak after a cyclone. What is the safest general action?",
            [
                "Light a match to check the source",
                "Operate electrical switches repeatedly",
                "Move away and contact the appropriate service safely",
                "Ignore the smell until morning",
            ],
            2,
            "Avoid flames and possible sparks, move away, and contact the relevant emergency or utility service.",
            "Gas safety",
        ),
        _q(
            "Which statement best describes a cyclone forecast track?",
            [
                "It guarantees the exact path and local impact",
                "It is an estimate that may change with new information",
                "It replaces local evacuation instructions",
                "It only predicts conditions at sea",
            ],
            1,
            "Forecasts are estimates; updated warnings and local instructions remain important.",
            "Forecasts",
        ),
    ],

    "earthquake": [
        _q(
            "What should you generally do when shaking begins indoors?",
            [
                "Run to an elevator",
                "Drop, Cover, and Hold On",
                "Stand beside a window",
                "Rush downstairs during shaking",
            ],
            1,
            "Drop, Cover, and Hold On helps protect you from falling objects and debris.",
            "During an earthquake",
        ),
        _q(
            "Where is generally safer to wait outdoors during an earthquake?",
            [
                "Under a balcony",
                "Beside a power pole",
                "In an open area away from buildings and wires",
                "Under a tree",
            ],
            2,
            "Buildings, trees, and utility lines may shed debris or fall during shaking.",
            "Outdoor safety",
        ),
        _q(
            "Why should you avoid elevators during earthquake shaking?",
            [
                "They are designed only for outdoor use",
                "Power failures or damage may trap occupants",
                "They prevent aftershocks",
                "They make buildings structurally stronger",
            ],
            1,
            "Power or equipment damage can leave people trapped inside elevators.",
            "Building safety",
        ),
        _q(
            "What should you do if a building appears structurally damaged after an earthquake?",
            [
                "Enter quickly to retrieve belongings",
                "Use the elevator to inspect upper floors",
                "Avoid entry and follow official guidance",
                "Stand beneath damaged walls",
            ],
            2,
            "Damaged buildings may collapse or shed debris; do not enter without clearance.",
            "Recovery",
        ),
        _q(
            "What is an aftershock?",
            [
                "A smaller earthquake following a larger earthquake in the same region",
                "A type of storm surge",
                "A warning siren",
                "A flood caused only by rainfall",
            ],
            0,
            "Aftershocks are additional earthquakes that follow a larger event and can cause further damage.",
            "Aftershocks",
        ),
    ],

    "flood": [
        _q(
            "What should you do when a road is covered in floodwater?",
            [
                "Drive through quickly",
                "Walk through carefully",
                "Avoid crossing and find a safe route",
                "Follow another vehicle",
            ],
            2,
            "Floodwater can hide damaged roads and dangerous currents. Do not cross it.",
            "Floodwater safety",
        ),
        _q(
            "Where should you move if authorities advise evacuation due to flooding?",
            [
                "To the designated safe location or higher ground",
                "Into a basement",
                "Closer to the river",
                "Under a bridge",
            ],
            0,
            "Follow official evacuation directions and move away from rising water.",
            "Evacuation",
        ),
        _q(
            "Why is floodwater unsafe for drinking?",
            [
                "It may contain sewage and chemical contamination",
                "It always contains too much oxygen",
                "It is safe whenever it looks clear",
                "It becomes safe after standing overnight",
            ],
            0,
            "Floodwater may be contaminated even when no visible dirt is present.",
            "Water safety",
        ),
        _q(
            "What should you do around a fallen electrical wire in a flooded area?",
            [
                "Move it using a wooden stick",
                "Keep away and report it",
                "Walk through the water around it",
                "Touch it briefly to check for current",
            ],
            1,
            "Treat fallen wires as dangerous and avoid nearby water that may be energised.",
            "Electrical safety",
        ),
        _q(
            "When is it appropriate to return to an evacuated flood area?",
            [
                "When the rain briefly stops",
                "When another resident returns",
                "When authorities indicate it is safe",
                "When the road looks dry from a distance",
            ],
            2,
            "Floodwater, structural damage, and contamination may remain after rainfall stops.",
            "Recovery",
        ),
    ],

    "wildfire": [
        _q(
            "Why can a wildfire spread ahead of visible flames?",
            [
                "Wind can carry embers that ignite new areas",
                "Fire always moves only underground",
                "Smoke extinguishes all nearby flames",
                "Rain always accelerates every fire",
            ],
            0,
            "Wind-carried embers can ignite vegetation or structures ahead of the fire front.",
            "Fire behaviour",
        ),
        _q(
            "What should you do when authorities order wildfire evacuation?",
            [
                "Wait until flames reach the property",
                "Leave promptly using the designated route",
                "Drive towards the fire to assess it",
                "Collect all belongings before leaving",
            ],
            1,
            "Prompt evacuation reduces exposure to rapidly changing fire and smoke conditions.",
            "Evacuation",
        ),
        _q(
            "Which hazard may remain after visible wildfire flames disappear?",
            [
                "Hot spots, unstable trees, and damaged utility lines",
                "Guaranteed clean air",
                "Guaranteed structural safety",
                "No remaining fire risk",
            ],
            0,
            "Hot spots, unstable structures, and damaged utilities can remain after the main fire.",
            "Recovery",
        ),
        _q(
            "What is a sensible response to heavy wildfire smoke?",
            [
                "Exercise outdoors to adapt",
                "Ignore local air-quality advice",
                "Follow local public-health guidance and reduce exposure",
                "Enter the burned area to investigate",
            ],
            2,
            "Smoke can affect health far from flames. Follow local guidance and reduce exposure.",
            "Smoke safety",
        ),
        _q(
            "When should residents return to an evacuated wildfire area?",
            [
                "When the sky looks clearer",
                "When authorities declare it safe",
                "When social media says the fire is over",
                "Immediately after leaving the shelter",
            ],
            1,
            "Official clearance accounts for hazards that may not be visible to residents.",
            "Return safety",
        ),
    ],

    "tornado": [
        _q(
            "Where is generally the best tornado shelter in a suitable building?",
            [
                "Near a large window",
                "Under a highway overpass",
                "A basement or small interior room on the lowest floor",
                "On an exposed balcony",
            ],
            2,
            "A basement or suitable interior room away from windows reduces exposure to debris.",
            "Shelter",
        ),
        _q(
            "Which body parts should you prioritise protecting during a tornado?",
            [
                "Head and neck",
                "Shoelaces only",
                "Luggage and personal items",
                "Windows and doors",
            ],
            0,
            "Flying debris can cause severe head and neck injuries.",
            "Personal safety",
        ),
        _q(
            "What should you do when an official tornado warning applies to your area?",
            [
                "Wait until you see a funnel cloud",
                "Move promptly to the designated shelter",
                "Go outdoors to record the storm",
                "Stand beside a window",
            ],
            1,
            "Do not wait for visual confirmation before following an applicable official warning.",
            "Warnings",
        ),
        _q(
            "Why should you avoid highway overpasses during a tornado?",
            [
                "They guarantee stronger protection than buildings",
                "They may expose people to dangerous winds and flying debris",
                "They prevent all debris from passing",
                "They are designated indoor shelters",
            ],
            1,
            "Overpasses can expose people to high winds and debris rather than providing reliable shelter.",
            "Shelter safety",
        ),
        _q(
            "What should you do after a tornado if you see a fallen power line?",
            [
                "Move it with a stick",
                "Drive over it",
                "Keep away and report it",
                "Cover it with a blanket",
            ],
            2,
            "A fallen wire may be live. Keep away and notify the relevant authorities.",
            "Recovery",
        ),
    ],
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_course_or_404(slug: str, db: Session):
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
        "description": getattr(course, "description", "") or "",
        "disaster_type": getattr(course, "disaster_type", course.slug),
        "total_sections": len(lessons),
        "lessons_count": len(lessons),
        "duration_minutes": sum(
            lesson["duration_minutes"] for lesson in lessons
        ),
        "quiz_count": len(QUIZZES.get(course.slug, [])),
        "progress": int(progress.progress or 0) if progress else 0,
        "viewed_sections": (
            list(progress.viewed_sections or []) if progress else []
        ),
        "completed": bool(progress.completed) if progress else False,
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("")
def list_courses(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """List configured courses and the authenticated user's progress."""

    courses = db.query(models.Course).order_by(models.Course.id.asc()).all()

    records = (
        db.query(models.CourseProgress)
        .filter(models.CourseProgress.user_id == current_user.id)
        .all()
    )
    progress_map = {record.course_id: record for record in records}

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
    """Return a course, its detailed lessons, media, quiz, and progress."""

    course = _get_course_or_404(slug, db)
    lessons = LESSONS.get(course.slug)

    if lessons is None:
        raise HTTPException(
            status_code=404,
            detail="Learning content has not been configured for this course.",
        )

    progress = _get_progress(course.id, current_user.id, db)

    objectives = {
        "cyclone": [
            "Explain cyclone winds, rainfall, storm surge, and flood hazards.",
            "Find official warnings and understand evacuation instructions.",
            "Prepare a household emergency plan and emergency kit.",
            "Choose safer actions during severe weather.",
            "Recognise electrical, water, and structural hazards after a cyclone.",
        ],
        "earthquake": [
            "Understand shaking and secondary hazards.",
            "Prepare a home and emergency kit.",
            "Apply Drop, Cover, and Hold On.",
            "Recognise hazards after shaking stops.",
        ],
        "flood": [
            "Understand flood causes and hidden hazards.",
            "Prepare supplies and evacuation routes.",
            "Respond safely to rising water.",
            "Recognise post-flood electrical and water hazards.",
        ],
        "wildfire": [
            "Understand fire spread, smoke, and embers.",
            "Prepare for evacuation.",
            "Reduce exposure to smoke and active fire.",
            "Recognise hazards during recovery.",
        ],
        "tornado": [
            "Recognise tornado hazards and warnings.",
            "Identify an appropriate shelter.",
            "Protect yourself during a tornado.",
            "Avoid hazards after the storm.",
        ],
    }.get(course.slug, [])

    return {
        **_course_summary(course, progress),
        "lessons": lessons,
        "quiz": QUIZZES.get(course.slug, []),
        "objectives": objectives,
        "resources": (
            [IMD_CYCLONE_RESOURCE, NDMA_ALERT_RESOURCE]
            if course.slug == "cyclone"
            else []
        ),
    }


@router.post("/{slug}/progress", response_model=schemas.CourseProgressOut)
def upsert_progress(
    slug: str,
    payload: schemas.CourseProgressUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Persist completed lesson IDs and calculate progress on the server."""

    course = _get_course_or_404(slug, db)
    lessons = LESSONS.get(course.slug, [])

    if not lessons:
        raise HTTPException(
            status_code=400,
            detail="This course has no configured lessons.",
        )

    valid_ids = {str(lesson["id"]) for lesson in lessons}
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
        db.flush()

    existing = [
        item
        for item in (record.viewed_sections or [])
        if isinstance(item, str) and item in valid_ids
    ]

    # Deduplicate while retaining the order in which lessons were completed.
    merged = list(dict.fromkeys(existing + requested))

    calculated_progress = round((len(merged) / len(lessons)) * 100)
    record.viewed_sections = merged
    record.progress = calculated_progress
    record.completed = len(merged) == len(lessons)

    # Set the timestamp only if the model supports it.
    if hasattr(record, "completed_at"):
        if record.completed and record.completed_at is None:
            record.completed_at = datetime.utcnow()

    try:
        db.commit()
        db.refresh(record)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not save course progress. Please try again.",
        )

    return record
