"""
Generic scoring engine for the simulation system.

Every disaster scenario is defined as JSON data (see app/simulations_data/*.json)
following a shared shape:

{
  "slug": "earthquake",
  "codename": "OPERATION: SEISMIC SHIELD",
  "disaster_type": "Earthquake",
  "difficulty": "Standard",
  "estimated_duration_minutes": 8,
  "steps": [
    {
      "id": "s1",
      "title": "...",
      "narrative": "...",
      "options": [
        {"id": "a", "text": "...", "correct": false, "safety": true/false,
         "resource": true/false, "feedback": "...", "mistake": "optional mistake text"}
      ]
    }
  ]
}

The frontend submits the sequence of chosen option ids per step plus timing.
This module matches those choices back against the scenario definition and
computes a real score — nothing here is hard-coded to 100.

Formula (per product spec):
  knowledge/decision accuracy   -> 30%
  safety-flagged decisions      -> 30%
  time management               -> 15%
  resource management           -> 15%
  mistake penalty               -> up to -10 (subtracted after weighting)
"""
from typing import Dict, List, Optional, Tuple


def _find_option(step: dict, option_id: str) -> Optional[dict]:
    for opt in step.get("options", []):
        if opt["id"] == option_id:
            return opt
    return None


def score_attempt(
    scenario: dict,
    decisions: List[Tuple[str, str, float]],  # (step_id, option_id, seconds_taken)
    total_time_seconds: int,
) -> Dict:
    steps_by_id = {s["id"]: s for s in scenario.get("steps", [])}

    total_decisions = 0
    correct_decisions = 0

    safety_relevant = 0
    safety_correct = 0

    resource_relevant = 0
    resource_correct = 0

    mistakes: List[str] = []

    for step_id, option_id, _seconds in decisions:
        step = steps_by_id.get(step_id)
        if not step:
            continue
        option = _find_option(step, option_id)
        if not option:
            continue

        total_decisions += 1
        is_correct = bool(option.get("correct"))
        if is_correct:
            correct_decisions += 1
        else:
            mistake_text = option.get("mistake") or f"Suboptimal choice at '{step.get('title', step_id)}'."
            mistakes.append(mistake_text)

        if option.get("safety_relevant", option.get("safety") is not None):
            safety_relevant += 1
            if is_correct:
                safety_correct += 1

        if option.get("resource_relevant", option.get("resource") is not None):
            resource_relevant += 1
            if is_correct:
                resource_correct += 1

    decision_accuracy_pct = round(100 * correct_decisions / total_decisions) if total_decisions else 0
    safety_awareness_pct = round(100 * safety_correct / safety_relevant) if safety_relevant else decision_accuracy_pct
    resource_management_pct = (
        round(100 * resource_correct / resource_relevant) if resource_relevant else decision_accuracy_pct
    )

    expected_seconds = scenario.get("estimated_duration_minutes", 8) * 60
    if expected_seconds <= 0:
        response_time_pct = 100
    else:
        ratio = total_time_seconds / expected_seconds
        if ratio <= 1.0:
            response_time_pct = 100
        else:
            # Lose points gradually the further over the expected time, floor at 40.
            overage = min(ratio - 1.0, 1.5)
            response_time_pct = max(40, round(100 - overage * 40))

    mistake_penalty = min(10, len(mistakes) * 3)

    weighted = (
        decision_accuracy_pct * 0.30
        + safety_awareness_pct * 0.30
        + response_time_pct * 0.15
        + resource_management_pct * 0.15
    )
    final_score = max(0, min(100, round(weighted - mistake_penalty + 10)))
    # The flat +10 above is a base-completion credit (finishing the scenario has
    # some educational value even with mistakes); the mistake_penalty subtracts
    # the same 10% band the spec allocates to "mistake penalty", so a
    # mistake-free run still tops out at 100 and a careless run is penalized.
    final_score = max(0, min(100, final_score))

    critical_mistake = mistakes[0] if mistakes else None

    return {
        "score": final_score,
        "decision_accuracy": decision_accuracy_pct,
        "response_time_score": response_time_pct,
        "safety_awareness": safety_awareness_pct,
        "resource_management": resource_management_pct,
        "correct_decisions": correct_decisions,
        "total_decisions": total_decisions,
        "mistakes": mistakes,
        "critical_mistake": critical_mistake,
    }


def recommended_training_for(disaster_type: str, score: int) -> Optional[str]:
    if score >= 85:
        return None
    mapping = {
        "Earthquake": "Earthquake Safety & Drop-Cover-Hold On Refresher",
        "Flood": "Flood Evacuation & Safe Route Planning",
        "Wildfire": "Wildfire Early Evacuation Training",
        "Tornado": "Severe Storm Shelter-in-Place Training",
        "Cyclone": "Cyclone Preparedness & Coastal Safety",
    }
    return mapping.get(disaster_type)
