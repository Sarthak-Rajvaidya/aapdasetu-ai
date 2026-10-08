const COURSE_SLUG_BY_TYPE = {
  Earthquake: "earthquake", Flood: "flood", Wildfire: "wildfire", Tornado: "tornado", Cyclone: "cyclone",
};

function getQuizSlugFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("slug") || "earthquake-quiz";
}

let _quizStartTime = Date.now();

async function loadQuiz() {
  const slug = getQuizSlugFromUrl();
  try {
    const quiz = await apiFetch(`/api/quizzes/${slug}`);
    document.getElementById("quizLoading").classList.add("d-none");
    document.getElementById("quizApp").classList.remove("d-none");
    document.getElementById("quizTitle").textContent = quiz.title;
    document.getElementById("quizSubtitle").textContent = `${quiz.disaster_type} \u2022 ${quiz.questions.length} questions`;

    const form = document.getElementById("quizForm");
    form.innerHTML =
      quiz.questions
        .map(
          (q) => `
      <fieldset class="mb-4">
        <legend class="fs-6 fw-bold">${q.index + 1}. ${q.question}</legend>
        ${q.options
          .map(
            (opt, i) => `
          <div class="form-check">
            <input class="form-check-input" type="radio" name="q_${q.index}" id="q_${q.index}_${i}" value="${i}" required>
            <label class="form-check-label" for="q_${q.index}_${i}">${opt}</label>
          </div>`
          )
          .join("")}
      </fieldset>`
        )
        .join("") +
      `<button type="submit" class="btn btn-as-primary w-100 py-2">Submit Assessment</button>`;

    _quizStartTime = Date.now();
    form.addEventListener("submit", (e) => submitQuiz(e, slug, quiz.questions.length));
  } catch (err) {
    document.getElementById("quizLoading").classList.add("d-none");
    const errorBox = document.getElementById("quizError");
    errorBox.textContent = `Couldn't load quiz: ${err.message}`;
    errorBox.classList.remove("d-none");
  }
}

async function submitQuiz(e, slug, totalQuestions) {
  e.preventDefault();
  const answers = [];
  for (let i = 0; i < totalQuestions; i++) {
    const selected = document.querySelector(`input[name="q_${i}"]:checked`);
    if (selected) answers.push({ question_index: i, selected_option: parseInt(selected.value, 10) });
  }

  const timeTaken = Math.round((Date.now() - _quizStartTime) / 1000);

  try {
    const result = await apiFetch(`/api/quizzes/${slug}/submit`, {
      method: "POST",
      body: { answers, time_taken_seconds: timeTaken },
    });

    document.getElementById("quizForm").classList.add("d-none");
    const panel = document.getElementById("quizResultPanel");
    panel.classList.remove("d-none");
    document.getElementById("resScore").textContent = `${result.score}%`;
    document.getElementById("resCorrect").textContent = result.correct_count;
    document.getElementById("resTotal").textContent = result.total_questions;

    if (result.weak_topics && result.weak_topics.length) {
      document.getElementById("resWeak").innerHTML =
        `<span class="small as-muted">Topics to review: </span>` +
        result.weak_topics.map((t) => `<span class="as-badge-soft me-1">${t.replace(/_/g, " ")}</span>`).join("");
    }
    if (result.recommended_course) {
      const box = document.getElementById("resRecommend");
      box.classList.remove("d-none");
      const label = result.recommended_course.charAt(0).toUpperCase() + result.recommended_course.slice(1);
      box.innerHTML = `Recommended: revisit the <a href="modules.html">${label} course</a>.`;
    }
    if (typeof showToast === "function") showToast("Quiz submitted", "success");
  } catch (err) {
    if (typeof showToast === "function") showToast(`Submission failed: ${err.message}`, "error");
  }
}

document.addEventListener("DOMContentLoaded", loadQuiz);
