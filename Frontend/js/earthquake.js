const _EQ_ANSWERS = { eq1: "under", eq2: "60" };

function checkEqQuiz() {
  let correct = 0;
  const total = Object.keys(_EQ_ANSWERS).length;
  Object.entries(_EQ_ANSWERS).forEach(([name, answer]) => {
    const selected = document.querySelector(`input[name="${name}"]:checked`);
    if (selected && selected.value === answer) correct += 1;
  });

  const resultEl = document.getElementById("quizResult");
  const pct = Math.round((correct / total) * 100);
  resultEl.innerHTML = `
    <div class="alert ${pct === 100 ? "alert-success" : "alert-warning"} mb-0">
      <strong>${correct} / ${total} correct (${pct}%)</strong><br>
      ${pct === 100
        ? "All correct — you've got the core earthquake safety behavior down."
        : "Review the sections above on the first 60 seconds and safe spots, then try again."}
    </div>`;

  if (typeof _viewedSections !== "undefined") _viewedSections.add("section7");
  if (typeof _persistProgress === "function") {
    const newPct = Math.max(95, Math.round(((_viewedSections?.size || 6) / (_courseTotalSections || 7)) * 100));
    _persistProgress(newPct);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (typeof initCourseProgress === "function") initCourseProgress("earthquake", 7);
});
