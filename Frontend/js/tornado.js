const _TORNADO_ANSWERS = { tq1: "exit", tq2: "lowest" };

function checkTorQuiz() {
  let correct = 0;
  const total = Object.keys(_TORNADO_ANSWERS).length;
  Object.entries(_TORNADO_ANSWERS).forEach(([name, answer]) => {
    const selected = document.querySelector(`input[name="${name}"]:checked`);
    if (selected && selected.value === answer) correct += 1;
  });

  const pct = Math.round((correct / total) * 100);
  const resultEl = document.getElementById("quizResult");
  resultEl.innerHTML = `
    <div class="alert ${pct === 100 ? "alert-success" : "alert-warning"} mb-0">
      <strong>${correct} / ${total} correct (${pct}%)</strong><br>
      ${pct === 100
        ? "You know where to shelter — well done."
        : "A mobile home is never safe during a tornado, and an interior room on the lowest floor is best. Review above and retry."}
    </div>`;

  if (typeof _persistProgress === "function") _persistProgress(100);
}

document.addEventListener("DOMContentLoaded", () => {
  if (typeof initCourseProgress === "function") initCourseProgress("tornado", 7);
});
