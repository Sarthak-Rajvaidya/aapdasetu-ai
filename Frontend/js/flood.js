const _FLOOD_ANSWERS = { q1: "12", q2: "flash", q3: "window" };

function checkQuiz() {
  let correct = 0;
  const total = Object.keys(_FLOOD_ANSWERS).length;
  Object.entries(_FLOOD_ANSWERS).forEach(([name, answer]) => {
    const selected = document.querySelector(`input[name="${name}"]:checked`);
    if (selected && selected.value === answer) correct += 1;
  });

  const pct = Math.round((correct / total) * 100);
  const resultEl = document.getElementById("quizResult");
  resultEl.innerHTML = `
    <div class="alert ${pct === 100 ? "alert-success" : "alert-warning"} mb-0">
      <strong>${correct} / ${total} correct (${pct}%)</strong><br>
      ${pct === 100
        ? "Strong grasp of flood safety fundamentals."
        : "Revisit flood warning levels and \"Turn Around, Don't Drown\" above, then retry."}
    </div>`;

  if (typeof _persistProgress === "function") _persistProgress(100);
}

document.addEventListener("DOMContentLoaded", () => {
  if (typeof initCourseProgress === "function") initCourseProgress("flood", 8);
});
