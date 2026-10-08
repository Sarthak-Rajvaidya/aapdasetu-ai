/**
 * Loads /api/dashboard and renders every section. All numbers here come
 * straight from the backend's real computation (see
 * Backend/app/services/readiness.py) — nothing is fabricated client-side.
 */
const COURSE_LABELS = {
  earthquake: "Earthquake Preparedness",
  flood: "Flood Safety & Evacuation",
  wildfire: "Wildfire Readiness",
  tornado: "Tornado & Severe Storm Safety",
  cyclone: "Cyclone Preparedness",
};

function animateRing(el, targetPct) {
  let current = 0;
  const step = Math.max(1, Math.round(targetPct / 30));
  const tick = () => {
    current = Math.min(targetPct, current + step);
    el.style.setProperty("--pct", current);
    if (current < targetPct) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function breakdownRow(label, value) {
  return `
    <div>
      <div class="d-flex justify-content-between small mb-1">
        <span>${label}</span><span class="fw-semibold">${value}%</span>
      </div>
      <div class="as-progress"><span style="width:${value}%"></span></div>
    </div>`;
}

async function loadDashboard() {
  const skeleton = document.getElementById("dashboardSkeleton");
  const content = document.getElementById("dashboardContent");
  const errorBox = document.getElementById("dashboardError");

  try {
    const data = await apiFetch("/api/dashboard");

    skeleton.classList.add("d-none");
    content.classList.remove("d-none");

    document.getElementById("readinessOverall").textContent = `${data.readiness.overall}%`;
    animateRing(document.getElementById("readinessRing"), data.readiness.overall);

    document.getElementById("readinessBreakdown").innerHTML = [
      breakdownRow("Knowledge (quiz average)", data.readiness.knowledge),
      breakdownRow("Decision Making (simulation accuracy)", data.readiness.decision_making),
      breakdownRow("Emergency Response (safety awareness)", data.readiness.emergency_response),
      breakdownRow("Disaster Awareness (course completion)", data.readiness.disaster_awareness),
    ].join("");

    if (data.recommended_training) {
      document.getElementById("recommendedCard").style.display = "";
      document.getElementById("recommendationReason").textContent = data.recommendation_reason || "";
      document.getElementById("recommendedTraining").textContent = data.recommended_training;
    } else {
      document.getElementById("noRecommendationCard").style.display = "";
    }

    document.getElementById("achievementCount").textContent =
      `${data.achievements_unlocked} / ${data.achievements_total}`;
    document.getElementById("streakText").textContent =
      data.learning_streak_days > 0
        ? `Active on ${data.learning_streak_days} distinct day${data.learning_streak_days === 1 ? "" : "s"}.`
        : "No recorded activity yet — complete a course section, quiz, or simulation to get started.";

    const courseList = document.getElementById("courseProgressList");
    if (data.course_progress.length === 0) {
      courseList.innerHTML = `<p class="as-muted small mb-0">No course activity yet. <a href="modules.html">Start a course</a>.</p>`;
    } else {
      courseList.innerHTML = data.course_progress
        .map(
          (cp) => `
        <div>
          <div class="d-flex justify-content-between small mb-1">
            <span>${COURSE_LABELS[cp.course_slug] || cp.course_slug}${cp.completed ? ' <i class="bi bi-patch-check-fill text-success"></i>' : ""}</span>
            <span class="fw-semibold">${cp.progress}%</span>
          </div>
          <div class="as-progress"><span style="width:${cp.progress}%"></span></div>
        </div>`
        )
        .join("");
    }

    const activityList = document.getElementById("recentActivityList");
    const combined = [
      ...data.recent_simulations.map((s) => ({
        label: `${s.disaster_type || "Simulation"} simulation`,
        score: s.score,
        date: s.completed_at,
        icon: "bi-controller",
      })),
      ...data.recent_quizzes.map((q) => ({
        label: `${q.quiz_slug || "Quiz"}`,
        score: q.score,
        date: q.completed_at,
        icon: "bi-patch-question",
      })),
    ]
      .filter((a) => a.date)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 6);

    activityList.innerHTML = combined.length
      ? combined
          .map(
            (a) => `
        <div class="d-flex justify-content-between align-items-center border-bottom pb-2">
          <span><i class="bi ${a.icon} me-2 as-muted"></i>${a.label}</span>
          <span class="as-badge-soft">${a.score}%</span>
        </div>`
          )
          .join("")
      : `<p class="as-muted small mb-0">No recent activity yet.</p>`;
  } catch (err) {
    skeleton.classList.add("d-none");
    errorBox.textContent = `Couldn't load your dashboard: ${err.message}`;
    errorBox.classList.remove("d-none");
  }
}

document.addEventListener("DOMContentLoaded", loadDashboard);
