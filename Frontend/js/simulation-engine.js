/**
 * Reusable simulation engine (see spec: "Simulation Engine").
 * Works for every disaster type — the scenario JSON (served by
 * GET /api/simulations/{slug}, with answer-revealing fields stripped) fully
 * determines the steps and options. This file knows nothing disaster-specific
 * except which ambient CSS class to apply for atmosphere.
 *
 * State machine:
 *   Scenario Introduction -> (per step) Decision -> next step -> ... -> Submit -> Performance Analysis
 */
const BODY_THEME_CLASS = {
  earthquake: "sim-earthquake", flood: "sim-flood", wildfire: "sim-wildfire",
  tornado: "sim-tornado", cyclone: "sim-cyclone",
};

let _scenario = null;
let _slug = null;
let _currentStepIndex = 0;
let _decisions = []; // { step_id, option_id, time_taken_seconds }
let _missionStartTime = null;
let _stepStartTime = null;
let _timerInterval = null;

function getSlugFromUrl() {
  return new URLSearchParams(window.location.search).get("slug");
}

function formatElapsed(ms) {
  const totalSec = Math.floor(ms / 1000);
  const m = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const s = String(totalSec % 60).padStart(2, "0");
  return `${m}:${s}`;
}

async function loadScenario() {
  _slug = getSlugFromUrl();
  if (!_slug) {
    showLoadError("No simulation specified.");
    return;
  }
  try {
    _scenario = await apiFetch(`/api/simulations/${_slug}`);
    document.body.classList.add(BODY_THEME_CLASS[_slug] || "");
    renderIntro();
  } catch (err) {
    showLoadError(err.message);
  }
}

function showLoadError(message) {
  document.getElementById("simLoading").classList.add("d-none");
  const box = document.getElementById("simError");
  box.textContent = `Couldn't load this simulation: ${message}`;
  box.classList.remove("d-none");
}

function renderIntro() {
  document.getElementById("simLoading").classList.add("d-none");
  document.getElementById("simIntro").classList.remove("d-none");

  document.getElementById("introCodename").textContent = _scenario.codename;
  document.getElementById("introTitle").textContent = `${_scenario.disaster_type} Scenario`;
  document.getElementById("introDescription").textContent = _scenario.description;
  document.getElementById("introDifficulty").textContent = _scenario.difficulty;
  document.getElementById("introDuration").textContent = _scenario.estimated_duration_minutes;
  document.getElementById("introObjectives").innerHTML = (_scenario.objectives || [])
    .map((o) => `<li>${o}</li>`)
    .join("");

  document.getElementById("beginMissionBtn").addEventListener("click", beginMission);
}

function beginMission() {
  document.getElementById("simIntro").classList.add("d-none");
  document.getElementById("simPlayer").classList.remove("d-none");

  _currentStepIndex = 0;
  _decisions = [];
  _missionStartTime = Date.now();
  _stepStartTime = Date.now();

  _timerInterval = setInterval(() => {
    document.getElementById("elapsedTime").textContent = formatElapsed(Date.now() - _missionStartTime);
  }, 1000);

  renderStep();
}

function renderStep() {
  const step = _scenario.steps[_currentStepIndex];
  _stepStartTime = Date.now();

  document.getElementById("stepCounter").textContent = `Step ${_currentStepIndex + 1} of ${_scenario.steps.length}`;
  document.getElementById("stepTitle").textContent = step.title;
  document.getElementById("stepNarrative").textContent = step.narrative;

  // Flood-specific flourish: raise the "water level" overlay as the scenario progresses.
  if (_slug === "flood") {
    const pct = Math.round(((_currentStepIndex + 1) / _scenario.steps.length) * 70) + 10;
    document.querySelector(".sim-stage")?.style.setProperty("--water-level", `${pct}%`);
  }

  const optionsBox = document.getElementById("stepOptions");
  optionsBox.innerHTML = "";
  step.options.forEach((opt) => {
    const btn = document.createElement("button");
    btn.className = "sim-option-btn as-fade-in";
    btn.innerHTML = `<i class="bi bi-arrow-right-circle me-2"></i>${opt.text}`;
    btn.addEventListener("click", () => chooseOption(step.id, opt.id));
    optionsBox.appendChild(btn);
  });
}

function chooseOption(stepId, optionId) {
  const timeTaken = (Date.now() - _stepStartTime) / 1000;
  _decisions.push({ step_id: stepId, option_id: optionId, time_taken_seconds: timeTaken });

  // Disable buttons immediately to prevent double-submission, with a brief
  // "decision recorded" pause before advancing — gives the choice weight
  // without revealing correctness (that's only known in the final report).
  document.querySelectorAll(".sim-option-btn").forEach((b) => (b.disabled = true));

  setTimeout(() => {
    _currentStepIndex += 1;
    if (_currentStepIndex < _scenario.steps.length) {
      renderStep();
    } else {
      finishMission();
    }
  }, 350);
}

async function finishMission() {
  clearInterval(_timerInterval);
  document.getElementById("simPlayer").classList.add("d-none");

  const totalTimeSeconds = Math.round((Date.now() - _missionStartTime) / 1000);

  try {
    const result = await apiFetch(`/api/simulations/${_slug}/submit`, {
      method: "POST",
      body: { decisions: _decisions, total_time_seconds: totalTimeSeconds },
    });
    renderReport(result);
  } catch (err) {
    showLoadError(`Couldn't submit your results: ${err.message}`);
  }
}

function renderReport(result) {
  document.getElementById("simReport").classList.remove("d-none");
  document.getElementById("reportScore").textContent = `${result.score}%`;
  document.getElementById("reportAccuracy").textContent = `${result.decision_accuracy}%`;
  document.getElementById("reportTime").textContent = `${result.response_time_score}%`;
  document.getElementById("reportSafety").textContent = `${result.safety_awareness}%`;
  document.getElementById("reportResource").textContent = `${result.resource_management}%`;

  if (result.critical_mistake) {
    document.getElementById("criticalMistakeBox").classList.remove("d-none");
    document.getElementById("criticalMistakeText").textContent = result.critical_mistake;
  }

  document.getElementById("aiFeedbackText").textContent = result.ai_feedback || "No feedback generated.";

  if (result.recommended_training) {
    document.getElementById("recommendedBox").classList.remove("d-none");
    document.getElementById("recommendedText").textContent = result.recommended_training;
  }

  const achBox = document.getElementById("newAchievementsBox");
  if (result.new_achievements && result.new_achievements.length) {
    achBox.innerHTML = result.new_achievements
      .map(
        (title) => `<div class="alert alert-success d-flex align-items-center gap-2">
          <i class="bi bi-award-fill fs-5"></i><strong>Achievement unlocked:</strong> ${title}
        </div>`
      )
      .join("");
  }

  if (typeof showToast === "function") showToast(`Mission complete — scored ${result.score}%`, "success");
}

document.addEventListener("DOMContentLoaded", loadScenario);
