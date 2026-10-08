const _WILDFIRE_ANSWERS = { q1: "90", q2: "wind", q3: "leave", q4: "30ft", q5: "n95" };

function checkWildfireQuiz() {
  let correct = 0;
  const total = Object.keys(_WILDFIRE_ANSWERS).length;
  Object.entries(_WILDFIRE_ANSWERS).forEach(([name, answer]) => {
    const selected = document.querySelector(`input[name="${name}"]:checked`);
    if (selected && selected.value === answer) correct += 1;
  });

  const pct = Math.round((correct / total) * 100);
  const resultEl = document.getElementById("quizResult");
  resultEl.innerHTML = `
    <div class="alert ${pct === 100 ? "alert-success" : "alert-warning"} mb-0">
      <strong>${correct} / ${total} correct (${pct}%)</strong><br>
      ${pct === 100
        ? "Excellent — you understand wildfire risk factors and evacuation timing."
        : "Review defensible space (\"Zone 0\"), wind's role in spread, and evacuation-order response above, then retry."}
    </div>`;

  if (typeof _persistProgress === "function") _persistProgress(100);
}

function startWildfireQuiz() {
  document.getElementById("quizContainer")?.scrollIntoView({ behavior: "smooth" });
}

document.addEventListener("DOMContentLoaded", () => {
  if (typeof initCourseProgress === "function") initCourseProgress("wildfire", 8);
});
