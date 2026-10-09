
/* ============================================================
   AapdaSetu AI — Course Details, Lessons & Knowledge Quiz
   File: Frontend/course.js

   Features:
   - Existing authentication/session support
   - Course loading and error handling
   - Readable lesson content
   - Video resources
   - Key safety actions and takeaways
   - Quiz scoring and answer explanations
   - Backend lesson progress tracking
   ============================================================ */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  let course = null;
  let viewed = new Set();
  let saving = false;

  /* ------------------------------------------------------------
     Utilities
  ------------------------------------------------------------ */

  const escapeHTML = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);

  function getSlug() {
    const params = new URLSearchParams(window.location.search);

    return (
      params.get("slug") ||
      params.get("course") ||
      params.get("id") ||
      ""
    ).trim();
  }

  function setText(id, value) {
    const element = $(id);
    if (element) element.textContent = String(value ?? "");
  }

  function setHidden(id, hidden) {
    const element = $(id);
    if (element) element.hidden = hidden;
  }

  function showError(message) {
    console.error("[AapdaSetu Learn]", message);

    setHidden("courseLoading", true);
    setHidden("courseContent", true);
    setHidden("courseError", false);
    setText("courseErrorMessage", message);
  }

  function showLoading() {
    setHidden("courseLoading", false);
    setHidden("courseContent", true);
    setHidden("courseError", true);
  }

  function normalizeText(value) {
    return String(value ?? "").trim();
  }

  function categoryLabel(value) {
    const labels = {
      earthquake: "Earthquake Safety",
      flood: "Flood Preparedness",
      cyclone: "Cyclone Preparedness",
      wildfire: "Wildfire Safety",
      tornado: "Tornado Safety"
    };

    const key = String(value || "general").toLowerCase();

    return labels[key] || key.replace(/[-_]/g, " ");
  }

  /* ------------------------------------------------------------
     API requests

     Uses the application's existing apiFetch helper if available.
     Otherwise, uses APP_CONFIG.API_BASE_URL and the existing token.

     Authentication files are not modified.
  ------------------------------------------------------------ */

  async function requestJSON(path, options = {}) {
    if (typeof window.apiFetch === "function") {
      return window.apiFetch(path, options);
    }

    const config = window.APP_CONFIG || {};
    const base = String(config.API_BASE_URL || "").replace(/\/+$/, "");
    const token = localStorage.getItem("token");

    const headers = {
      Accept: "application/json"
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    let body;

    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(options.body);
    }

    const response = await fetch(`${base}${path}`, {
      method: options.method || "GET",
      headers,
      body,
      credentials: "include"
    });

    const responseText = await response.text();
    let data = null;

    try {
      data = responseText ? JSON.parse(responseText) : null;
    } catch {
      data = responseText;
    }

    if (!response.ok) {
      const message =
        data?.detail ||
        data?.message ||
        `Request failed (HTTP ${response.status}).`;

      const error = new Error(
        typeof message === "string" ? message : JSON.stringify(message)
      );

      error.status = response.status;
      throw error;
    }

    return data;
  }

  /* ------------------------------------------------------------
     Normalize the backend response without changing its schema.
  ------------------------------------------------------------ */

  function normalizeCourse(data) {
    const raw = data?.course ?? data?.data ?? data;

    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new Error("The server returned an invalid course response.");
    }

    const lessons = Array.isArray(raw.lessons) ? raw.lessons : [];
    const sections = Array.isArray(raw.viewed_sections)
      ? raw.viewed_sections.map(String)
      : [];

    return {
      id: raw.id,
      slug: String(raw.slug || getSlug()),
      title: String(raw.title || "Untitled course"),
      description: String(raw.description || ""),
      category: String(raw.disaster_type || raw.category || "general"),

      lessons: lessons.map((lesson, index) => ({
        ...lesson,
        id: String(lesson.id ?? `lesson-${index + 1}`),
        title: String(lesson.title || `Lesson ${index + 1}`),
        content: Array.isArray(lesson.content) ? lesson.content : [],
        key_actions: Array.isArray(lesson.key_actions)
          ? lesson.key_actions
          : [],
        takeaway: String(lesson.takeaway || ""),
        media: lesson.media && typeof lesson.media === "object"
          ? lesson.media
          : null
      })),

      objectives: Array.isArray(raw.objectives) ? raw.objectives : [],
      quiz: Array.isArray(raw.quiz) ? raw.quiz : [],

      progress: Math.max(0, Math.min(100, Number(raw.progress) || 0)),
      viewedSections: sections,
      completed: Boolean(raw.completed),
      quizCount: Number(raw.quiz_count) || (raw.quiz?.length ? 1 : 0),
      duration: Number(raw.duration_minutes) || 0
    };
  }

  /* ------------------------------------------------------------
     Video URL handling

     Only HTTP(S) URLs are accepted. Common YouTube watch URLs are
     converted into embed URLs. Other supplied embed URLs are used
     only when their hostname is on the allowlist below.
  ------------------------------------------------------------ */

  function safeExternalURL(value) {
    try {
      const url = new URL(String(value || ""));

      if (url.protocol !== "https:" && url.protocol !== "http:") {
        return "";
      }

      return url.href;
    } catch {
      return "";
    }
  }

  function getVideoEmbedURL(media) {
    if (!media) return "";

    const candidate = String(media.embed_url || media.url || "").trim();

    if (!candidate) return "";

    try {
      const url = new URL(candidate);

      if (url.protocol !== "https:" && url.protocol !== "http:") {
        return "";
      }

      const host = url.hostname.toLowerCase();

      // Convert standard YouTube links to an embed URL.
      if (host === "youtu.be") {
        const videoId = url.pathname.split("/").filter(Boolean)[0];

        return videoId
          ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`
          : "";
      }

      if (
        host === "youtube.com" ||
        host === "www.youtube.com" ||
        host === "m.youtube.com" ||
        host === "youtube-nocookie.com" ||
        host === "www.youtube-nocookie.com"
      ) {
        if (url.pathname === "/watch") {
          const videoId = url.searchParams.get("v");

          return videoId
            ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`
            : "";
        }

        const match = url.pathname.match(/^\/(?:embed|shorts)\/([^/?]+)/);

        return match
          ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(match[1])}`
          : "";
      }

      // Permit trusted video platforms for embed URLs.
      const allowedEmbedHosts = [
        "player.vimeo.com",
        "www.youtube-nocookie.com"
      ];

      if (
        media.embed_url &&
        allowedEmbedHosts.includes(host)
      ) {
        return url.href;
      }

      return "";
    } catch {
      return "";
    }
  }

  /* ------------------------------------------------------------
     Inject presentation styles

     Keeps the improvements self-contained in course.js.
     Existing page styles and class names remain usable.
  ------------------------------------------------------------ */

  function injectCourseStyles() {
    if ($("aapda-course-enhanced-styles")) return;

    const style = document.createElement("style");
    style.id = "aapda-course-enhanced-styles";

    style.textContent = `
      #lessonList {
        display: grid;
        gap: 24px;
      }

      .lesson-card {
        padding: clamp(18px, 3vw, 30px);
        border: 1px solid var(--course-border, #e2e8f0);
        border-radius: 18px;
        background: var(--course-card, #ffffff);
        box-shadow: 0 5px 20px rgba(15, 23, 42, 0.045);
        min-width: 0;
      }

      .lesson-card-heading {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 24px;
      }

      .lesson-number {
        display: inline-block;
        margin-bottom: 8px;
        color: var(--course-accent, #0f766e);
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 0.07em;
        text-transform: uppercase;
      }

      .lesson-card h3 {
        margin: 0;
        line-height: 1.4;
        overflow-wrap: anywhere;
      }

      .lesson-duration {
        flex-shrink: 0;
        padding: 6px 10px;
        border-radius: 999px;
        background: var(--course-muted-bg, #f1f5f9);
        color: var(--course-muted-text, #475569);
        font-size: 0.82rem;
      }

      .lesson-content-block {
        margin: 24px 0;
        max-width: 78ch;
      }

      .lesson-content-block h4,
      .lesson-action-panel h4,
      .lesson-takeaway h4,
      .lesson-video h4 {
        margin: 0 0 10px;
        font-size: 1.08rem;
        line-height: 1.5;
      }

      .lesson-content-block p,
      .lesson-description,
      .lesson-takeaway p {
        margin: 0;
        font-size: 1rem;
        line-height: 1.9;
        white-space: pre-line;
        overflow-wrap: anywhere;
      }

      .lesson-description {
        margin: 0 0 20px;
        color: var(--course-muted-text, #475569);
      }

      .lesson-action-panel,
      .lesson-takeaway {
        margin-top: 26px;
        padding: 20px;
        border-radius: 14px;
      }

      .lesson-action-panel {
        background: var(--course-action-bg, #f0fdfa);
        border: 1px solid var(--course-action-border, #ccfbf1);
      }

      .lesson-takeaway {
        background: var(--course-takeaway-bg, #eff6ff);
        border: 1px solid var(--course-takeaway-border, #dbeafe);
      }

      .lesson-action-list {
        margin: 0;
        padding-left: 24px;
      }

      .lesson-action-list li {
        margin: 10px 0;
        padding-left: 3px;
        line-height: 1.75;
      }

      .lesson-video {
        margin: 28px 0;
      }

      .lesson-video p {
        line-height: 1.7;
      }

      .lesson-video-frame {
        position: relative;
        width: 100%;
        aspect-ratio: 16 / 9;
        overflow: hidden;
        border-radius: 14px;
        background: #0f172a;
      }

      .lesson-video-frame iframe {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        border: 0;
      }

      .lesson-resource-link {
        display: inline-block;
        margin-top: 12px;
        font-weight: 600;
        text-underline-offset: 3px;
      }

      .lesson-completion-note {
        margin-top: 12px;
        color: var(--course-muted-text, #475569);
        font-size: 0.88rem;
      }

      .course-quiz {
        margin-top: 8px;
      }

      .quiz-question {
        min-width: 0;
        margin: 22px 0;
        padding: 18px;
        border: 1px solid var(--course-border, #e2e8f0);
        border-radius: 14px;
      }

      .quiz-question legend {
        max-width: 100%;
        padding: 0 6px;
        font-weight: 700;
        line-height: 1.7;
        white-space: normal;
      }

      .quiz-option {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 12px;
        border: 1px solid var(--course-border, #e2e8f0);
        border-radius: 10px;
        cursor: pointer;
        line-height: 1.65;
      }

      .quiz-option:hover {
        background: var(--course-muted-bg, #f8fafc);
      }

      .quiz-option input {
        flex-shrink: 0;
        margin-top: 5px;
      }

      .quiz-feedback {
        margin-top: 14px;
        padding: 16px;
        border-radius: 12px;
        line-height: 1.75;
      }

      .quiz-feedback p {
        margin: 8px 0 0;
      }

      .quiz-feedback.correct {
        border: 1px solid #a7f3d0;
        background: #ecfdf5;
        color: #065f46;
      }

      .quiz-feedback.incorrect {
        border: 1px solid #fed7aa;
        background: #fff7ed;
        color: #9a3412;
      }

      .quiz-feedback small {
        display: block;
        margin-top: 8px;
      }

      .quiz-overall-result {
        margin-top: 20px;
        padding: 18px;
        border-radius: 14px;
        background: var(--course-muted-bg, #f8fafc);
        line-height: 1.8;
      }

      .course-state {
        padding: 24px;
        border: 1px solid var(--course-border, #e2e8f0);
        border-radius: 14px;
      }

      .lesson-card button:focus-visible,
      .course-quiz button:focus-visible,
      .lesson-resource-link:focus-visible {
        outline: 3px solid #0d9488;
        outline-offset: 3px;
      }

      @media (max-width: 600px) {
        .lesson-card-heading {
          flex-direction: column;
          gap: 10px;
        }

        .lesson-action-panel,
        .lesson-takeaway {
          padding: 15px;
        }

        .quiz-question {
          padding: 12px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /* ------------------------------------------------------------
     Learning objectives
  ------------------------------------------------------------ */

  function renderObjectives() {
    const element = $("courseObjectives");
    if (!element) return;

    const objectives = course.objectives.length
      ? course.objectives
      : [
          `Understand the main hazards associated with ${course.title}.`,
          "Learn how to prepare before an emergency.",
          "Recognise safer actions during and after a disaster."
        ];

    element.innerHTML = objectives.map((item) => `
      <li class="mb-2">${escapeHTML(item)}</li>
    `).join("");
  }

  /* ------------------------------------------------------------
     Render a lesson's video resource
  ------------------------------------------------------------ */

  function renderLessonMedia(media) {
    if (!media) return "";

    const title = normalizeText(media.title || "Learning video");
    const embedURL = getVideoEmbedURL(media);
    const resourceURL = safeExternalURL(media.url);

    if (!embedURL && !resourceURL) return "";

    const video = embedURL
      ? `
        <div class="lesson-video-frame">
          <iframe
            src="${escapeHTML(embedURL)}"
            title="${escapeHTML(title)}"
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
            referrerpolicy="strict-origin-when-cross-origin">
          </iframe>
        </div>
      `
      : `
        <p>This video is available from the original resource website.</p>
      `;

    const link = resourceURL
      ? `
        <a
          class="lesson-resource-link"
          href="${escapeHTML(resourceURL)}"
          target="_blank"
          rel="noopener noreferrer">
          Open original resource ↗
        </a>
      `
      : "";

    return `
      <section class="lesson-video" aria-label="Lesson video">
        <h4>${escapeHTML(title)}</h4>
        ${video}
        ${link}
      </section>
    `;
  }

  /* ------------------------------------------------------------
     Knowledge quiz
  ------------------------------------------------------------ */

  function renderQuiz() {
    if (!course.quiz.length) {
      return `
        <section class="course-state" aria-label="Knowledge quiz">
          <h3>Knowledge check</h3>
          <p>No quiz questions have been configured for this course yet.</p>
        </section>
      `;
    }

    return `
      <section
        class="lesson-card course-quiz"
        id="courseKnowledgeQuiz"
        aria-labelledby="courseQuizHeading">

        <h3 id="courseQuizHeading">Knowledge check</h3>

        <p>
          Test what you have learned. Select one answer for every
          question, then submit to see your score and explanations.
        </p>

        <form id="courseQuizForm">
          ${course.quiz.map((question, index) => `
            <fieldset class="quiz-question mb-4">
              <legend>
                ${index + 1}. ${escapeHTML(question.question || "Question")}
              </legend>

              ${(Array.isArray(question.options) ? question.options : [])
                .map((option, optionIndex) => `
                  <label class="quiz-option d-block mb-2">
                    <input
                      type="radio"
                      name="question-${index}"
                      value="${optionIndex}"
                      required>
                    <span>${escapeHTML(option)}</span>
                  </label>
                `).join("")}

              <div
                class="quiz-feedback"
                id="quizFeedback-${index}"
                aria-live="polite"
                hidden>
              </div>
            </fieldset>
          `).join("")}

          <button
            class="learn-btn learn-btn-primary"
            type="submit"
            id="courseQuizSubmit">
            Check answers
          </button>

          <button
            class="learn-btn learn-btn-secondary"
            type="button"
            id="courseQuizRetry"
            hidden>
            Try again
          </button>
        </form>

        <div
          id="courseQuizResult"
          class="quiz-overall-result mt-3"
          role="status"
          aria-live="polite"
          hidden>
        </div>
      </section>
    `;
  }

  function gradeQuiz(event) {
    event.preventDefault();

    const form = event.currentTarget;

    if (!form.reportValidity()) return;

    let correct = 0;
    let answered = 0;

    course.quiz.forEach((question, index) => {
      const selected = form.querySelector(
        `input[name="question-${index}"]:checked`
      );

      const feedback = $(`quizFeedback-${index}`);

      if (!selected || !feedback) return;

      answered++;

      const selectedIndex = Number(selected.value);
      const correctIndex = Number(question.correct_index);
      const isCorrect = selectedIndex === correctIndex;

      if (isCorrect) correct++;

      const options = Array.isArray(question.options)
        ? question.options
        : [];

      const correctAnswer = options[correctIndex];

      feedback.hidden = false;
      feedback.className = `quiz-feedback ${isCorrect ? "correct" : "incorrect"}`;

      feedback.innerHTML = `
        <strong>
          ${isCorrect
            ? "✓ Correct answer!"
            : "✗ Incorrect answer"}
        </strong>

        <p>
          <strong>Your answer:</strong>
          ${escapeHTML(options[selectedIndex] ?? "No answer")}
        </p>

        <p>
          <strong>Correct answer:</strong>
          ${escapeHTML(correctAnswer ?? "Not provided")}
        </p>

        <p>
          <strong>Explanation:</strong>
          ${escapeHTML(
            question.explanation ||
            "Review the related lesson to reinforce this concept."
          )}
        </p>

        ${question.topic
          ? `<small><strong>Topic:</strong> ${escapeHTML(question.topic)}</small>`
          : ""}
      `;
    });

    const total = course.quiz.length;
    const score = total ? Math.round((correct / total) * 100) : 0;
    const result = $("courseQuizResult");

    if (result) {
      result.hidden = false;
      result.innerHTML = `
        <h4>Quiz results</h4>
        <p>
          <strong>Your score: ${score}% (${correct}/${total})</strong>
        </p>
        <p>
          ${score >= 80
            ? "Excellent work! Keep reviewing the safety actions so you can recall them during an emergency."
            : score >= 60
              ? "Good effort. Review the explanations for incorrect answers and revisit those lessons."
              : "Keep learning. Review the lesson content and explanations, then try the quiz again."}
        </p>
        <p>
          ${answered} of ${total} questions answered.
          ${score >= 70 ? "You reached the review target." : "Aim for at least 70% on your next attempt."}
        </p>
        <p>
          This knowledge check is for learning purposes and does not
          replace official emergency instructions.
        </p>
      `;
    }

    // Keep the submitted answers visible for review.
    form.querySelectorAll('input[type="radio"]').forEach((input) => {
      input.disabled = true;
    });

    const submitButton = $("courseQuizSubmit");
    if (submitButton) submitButton.hidden = true;

    const retryButton = $("courseQuizRetry");
    if (retryButton) retryButton.hidden = false;
  }

  function retryQuiz() {
    const form = $("courseQuizForm");
    if (!form) return;

    form.reset();

    form.querySelectorAll('input[type="radio"]').forEach((input) => {
      input.disabled = false;
    });

    course.quiz.forEach((_, index) => {
      const feedback = $(`quizFeedback-${index}`);

      if (feedback) {
        feedback.hidden = true;
        feedback.innerHTML = "";
      }
    });

    const result = $("courseQuizResult");
    if (result) {
      result.hidden = true;
      result.innerHTML = "";
    }

    const submitButton = $("courseQuizSubmit");
    if (submitButton) submitButton.hidden = false;

    const retryButton = $("courseQuizRetry");
    if (retryButton) retryButton.hidden = true;
  }

  /* ------------------------------------------------------------
     Render lessons
  ------------------------------------------------------------ */

  function renderLessons() {
    const container = $("lessonList");

    if (!container) {
      throw new Error('The course page is missing id="lessonList".');
    }

    if (!course.lessons.length) {
      container.innerHTML = `
        <div class="course-state">
          <h3>Lessons are not configured</h3>
          <p>This course currently has no lesson content.</p>
        </div>
        ${renderQuiz()}
      `;

      attachQuizHandlers();
      return;
    }

    const lessonHTML = course.lessons.map((lesson, index) => {
      const id = String(lesson.id);
      const complete = viewed.has(id);

      const sections = lesson.content.map((section) => {
        const heading = normalizeText(section?.heading);
        const text = normalizeText(section?.text);

        if (!heading && !text) return "";

        return `
          <section class="lesson-content-block">
            ${heading ? `<h4>${escapeHTML(heading)}</h4>` : ""}
            ${text ? `<p>${escapeHTML(text)}</p>` : ""}
          </section>
        `;
      }).join("");

      const actions = lesson.key_actions.length
        ? `
          <section class="lesson-action-panel">
            <h4>Key safety actions</h4>
            <ul class="lesson-action-list">
              ${lesson.key_actions.map((action) => `
                <li>${escapeHTML(action)}</li>
              `).join("")}
            </ul>
          </section>
        `
        : "";

      const takeaway = lesson.takeaway
        ? `
          <aside class="lesson-takeaway">
            <h4>Key takeaway</h4>
            <p>${escapeHTML(lesson.takeaway)}</p>
          </aside>
        `
        : "";

      const media = renderLessonMedia(lesson.media);

      return `
        <article
          class="lesson-card"
          id="lesson-${index + 1}"
          aria-labelledby="lesson-title-${index + 1}">

          <div class="lesson-card-heading">
            <div>
              <span class="lesson-number">Lesson ${index + 1}</span>
              <h3 id="lesson-title-${index + 1}">
                ${escapeHTML(lesson.title)}
              </h3>
            </div>

            <span class="lesson-duration">
              ${Math.max(1, Number(lesson.duration_minutes) || 5)} min
            </span>
          </div>

          ${lesson.description
            ? `<p class="lesson-description">${escapeHTML(lesson.description)}</p>`
            : ""}

          <div class="lesson-reading">
            ${sections || `
              <p class="lesson-description">
                Lesson details are not available yet.
              </p>
            `}
          </div>

          ${media}
          ${actions}
          ${takeaway}

          <button
            type="button"
            class="learn-btn ${complete ? "learn-btn-secondary" : "learn-btn-primary"}"
            data-complete-lesson="${escapeHTML(id)}"
            ${complete ? "disabled" : ""}>
            ${complete ? "✓ Lesson completed" : "Mark as completed"}
          </button>

          ${complete
            ? `<p class="lesson-completion-note">Your progress includes this lesson.</p>`
            : ""}
        </article>
      `;
    }).join("");

    container.innerHTML = lessonHTML + renderQuiz();

    container.querySelectorAll("[data-complete-lesson]").forEach((button) => {
      button.addEventListener("click", () => completeLesson(button));
    });

    attachQuizHandlers();
  }

  function attachQuizHandlers() {
    const quizForm = $("courseQuizForm");

    if (quizForm) {
      quizForm.addEventListener("submit", gradeQuiz);
    }

    const retryButton = $("courseQuizRetry");

    if (retryButton) {
      retryButton.addEventListener("click", retryQuiz);
    }
  }

  /* ------------------------------------------------------------
     Save lesson completion to the existing backend endpoint
  ------------------------------------------------------------ */

  async function completeLesson(button) {
    if (saving) return;

    const id = button.dataset.completeLesson;

    if (!id || viewed.has(id)) return;

    saving = true;

    const previousText = button.textContent;
    button.disabled = true;
    button.textContent = "Saving progress…";

    const next = new Set(viewed);
    next.add(id);

    const nextViewed = [...next];

    const percentage = course.lessons.length
      ? Math.round(
          nextViewed.filter((lessonId) =>
            course.lessons.some((lesson) => String(lesson.id) === lessonId)
          ).length / course.lessons.length * 100
        )
      : 0;

    try {
      const result = await requestJSON(
        `/api/courses/${encodeURIComponent(course.slug)}/progress`,
        {
          method: "POST",
          body: {
            progress: percentage,
            viewed_sections: nextViewed
          }
        }
      );

      viewed = new Set(
        Array.isArray(result?.viewed_sections)
          ? result.viewed_sections.map(String)
          : nextViewed
      );

      // Prefer the server's progress value when it provides one.
      course.progress = Math.max(
        0,
        Math.min(
          100,
          Number(result?.progress ?? percentage) || 0
        )
      );

      course.completed = Boolean(result?.completed);

      // Re-render so the lesson's completion state stays consistent
      // with the saved progress returned by the server.
      renderLessons();
      updateProgressDisplay();

      if (typeof window.showToast === "function") {
        window.showToast("Lesson progress saved.", "success");
      }
    } catch (error) {
      console.error("[AapdaSetu Learn] Progress save failed:", error);

      button.disabled = false;
      button.textContent = previousText || "Retry completion";

      if (typeof window.showToast === "function") {
        window.showToast(
          error.message || "Unable to save progress. Please try again.",
          "error"
        );
      } else {
        alert(
          error.message ||
          "Unable to save progress. Please try again."
        );
      }
    } finally {
      saving = false;
    }
  }

  /* ------------------------------------------------------------
     Progress indicators
  ------------------------------------------------------------ */

  function updateProgressDisplay() {
    if (!course) return;

    const total = course.lessons.length;

    const done = course.lessons.filter((lesson) =>
      viewed.has(String(lesson.id))
    ).length;

    // Keep the displayed count and percentage based on known lessons.
    const percentage = total
      ? Math.round((done / total) * 100)
      : 0;

    // Use the server's value where appropriate; otherwise use local
    // progress derived from completed lessons.
    if (done === total && total > 0) {
      course.progress = 100;
    } else if (done > 0 || !course.progress) {
      course.progress = percentage;
    }

    setText("courseProgressPercent", `${course.progress}%`);
    setText("courseCompletedLessons", done);
    setText("courseRemainingLessons", Math.max(0, total - done));

    const fill = $("courseProgressFill");

    if (fill) {
      fill.style.width = `${course.progress}%`;
    }

    const bar = $("courseProgressBar");

    if (bar) {
      bar.setAttribute("aria-valuenow", String(course.progress));
      bar.setAttribute("aria-valuemin", "0");
      bar.setAttribute("aria-valuemax", "100");
    }

    const resume = $("resumeCourse");

    if (resume && course.completed) {
      resume.innerHTML =
        '<i class="bi bi-check-circle" aria-hidden="true"></i> Course completed';
    }
  }

  /* ------------------------------------------------------------
     Populate course details
  ------------------------------------------------------------ */

  function renderCourse() {
    setText("courseCategory", categoryLabel(course.category));
    setText("courseTitle", course.title);

    setText(
      "courseDescription",
      course.description ||
        "Learn practical safety steps for this disaster."
    );

    setText(
      "courseDuration",
      course.duration ? `${course.duration} minutes` : "Self-paced"
    );

    setText("courseLevel", "All levels");
    setText("courseLessonCount", course.lessons.length);
    setText("courseCompletedLessons", viewed.size);

    setText(
      "courseRemainingLessons",
      Math.max(0, course.lessons.length - viewed.size)
    );

    setText("courseQuizCount", course.quiz.length ? 1 : 0);

    renderObjectives();
    renderLessons();
    updateProgressDisplay();

    const resume = $("resumeCourse");

    if (resume) {
      resume.href = course.completed
        ? "#courseKnowledgeQuiz"
        : findNextLessonHref();
    }

    setHidden("courseLoading", true);
    setHidden("courseError", true);
    setHidden("courseContent", false);
  }

  function findNextLessonHref() {
    const nextIndex = course.lessons.findIndex(
      (lesson) => !viewed.has(String(lesson.id))
    );

    return nextIndex >= 0
      ? `#lesson-${nextIndex + 1}`
      : "#courseKnowledgeQuiz";
  }

  /* ------------------------------------------------------------
     Load course details from the existing backend API
  ------------------------------------------------------------ */

  async function loadCourse() {
    const slug = getSlug();

    if (!slug) {
      showError(
        "The URL is missing a course slug. Return to Learn and select a course."
      );
      return;
    }

    showLoading();

    try {
      const data = await requestJSON(
        `/api/courses/${encodeURIComponent(slug)}`
      );

      course = normalizeCourse(data);
      viewed = new Set(course.viewedSections);

      // Remove progress IDs that do not correspond to a lesson.
      viewed = new Set(
        [...viewed].filter((id) =>
          course.lessons.some((lesson) => String(lesson.id) === id)
        )
      );

      injectCourseStyles();
      renderCourse();
    } catch (error) {
      console.error(
        "[AapdaSetu Learn] Course loading failed:",
        error
      );

      if (error.status === 401) {
        showError(
          "Your session has expired. Sign in again and reopen this course."
        );
      } else if (error.status === 404) {
        showError(
          `Course "${slug}" was not found. Check the slug in your database.`
        );
      } else {
        showError(
          error.message || "Unable to load course details."
        );
      }
    }
  }

  /* ------------------------------------------------------------
     Initialization
  ------------------------------------------------------------ */

  function init() {
    $("retryCourse")?.addEventListener("click", loadCourse);

    if (
      !$("courseLoading") ||
      !$("courseContent") ||
      !$("courseError")
    ) {
      console.error(
        "[AapdaSetu Learn] Course page is missing required loading/content/error elements."
      );
      return;
    }

    loadCourse();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
