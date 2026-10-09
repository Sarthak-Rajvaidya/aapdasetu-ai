javascript
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const state = {
    courseSlug: "",
    lessonIdentifier: "",
    course: null,
    lessons: [],
    lesson: null,
    questions: [],
    quizSubmitted: false,
    quizPassed: false,
    quizScore: null,
    completed: false,
    completedLessonIds: new Set(),
    completedLessonSlugs: new Set()
  };

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function getToken() {
    try {
      return localStorage.getItem("access_token")
        || localStorage.getItem("token")
        || localStorage.getItem("auth_token")
        || "";
    } catch {
      return "";
    }
  }

  function getApiBase() {
    const config = window.APP_CONFIG || window.API_CONFIG || {};
    const base = config.API_BASE_URL || config.apiBaseUrl || window.API_BASE_URL || "";
    return String(base).replace(/\/+$/, "");
  }

  async function requestJSON(path, options = {}) {
    const method = options.method || "GET";
    const headers = {
      Accept: "application/json",
      ...(options.headers || {})
    };

    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const requestOptions = {
      method,
      headers,
      credentials: "include"
    };

    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json";
      requestOptions.body = JSON.stringify(options.body);
    }

    // Existing API client compatibility.
    // Verify its signature against Frontend/js/api.js before relying on it.
    if (method === "GET" && typeof window.apiFetch === "function") {
      const result = await window.apiFetch(path, requestOptions);
      if (result && typeof result.json === "function") {
        if (!result.ok) throw new Error(`Request failed (${result.status})`);
        return result.status === 204 ? null : result.json();
      }
      if (result !== undefined && result !== null) return result;
    }

    const response = await fetch(`${getApiBase()}${path}`, requestOptions);

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(detail || `Request failed (${response.status})`);
    }

    if (response.status === 204) return null;

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return response.json();
    }

    return null;
  }

  function unwrapObject(value) {
    let current = value;

    for (let i = 0; i < 3; i += 1) {
      if (!current || typeof current !== "object" || Array.isArray(current)) break;

      if (current.lesson && typeof current.lesson === "object") {
        current = current.lesson;
        continue;
      }

      if (current.course && typeof current.course === "object") {
        current = current.course;
        continue;
      }

      if (current.data && !Array.isArray(current.data)
          && typeof current.data === "object") {
        current = current.data;
        continue;
      }

      break;
    }

    return current || {};
  }

  function unwrapList(value, keys = []) {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== "object") return [];

    for (const key of keys) {
      if (Array.isArray(value[key])) return value[key];
    }

    if (value.data) return unwrapList(value.data, keys);
    if (value.items) return unwrapList(value.items, keys);
    if (value.results) return unwrapList(value.results, keys);

    return [];
  }

  function readURL() {
    const params = new URLSearchParams(window.location.search);

    state.courseSlug = (
      params.get("course")
      || params.get("course_slug")
      || ""
    ).trim();

    state.lessonIdentifier = (
      params.get("lesson")
      || params.get("lesson_id")
      || params.get("id")
      || ""
    ).trim();
  }

  function normalizeQuestion(question, index) {
    const options = question.options
      || question.choices
      || question.answers
      || [];

    const normalizedOptions = Array.isArray(options)
      ? options.map((option, optionIndex) => {
          if (typeof option === "string" || typeof option === "number") {
            return {
              value: String(optionIndex),
              text: String(option)
            };
          }

          return {
            value: String(option.id ?? option.value ?? optionIndex),
            text: String(option.text ?? option.label ?? option.title ?? `Option ${optionIndex + 1}`)
          };
        })
      : Object.entries(options).map(([key, value]) => ({
          value: key,
          text: String(value)
        }));

    const correctRaw =
      question.correct_answer
      ?? question.correctAnswer
      ?? question.answer
      ?? question.correct_option
      ?? question.correct_option_id
      ?? null;

    let correctValue = correctRaw === null ? null : String(correctRaw);

    // If the backend uses a numeric zero-based index, map it to the
    // normalized option value. Other formats should be standardized server-side.
    if (
      correctValue !== null
      && /^\d+$/.test(correctValue)
      && normalizedOptions.some((option) => option.value === correctValue)
    ) {
      correctValue = normalizedOptions.find((option) => option.value === correctValue).value;
    }

    return {
      id: String(question.id ?? question.question_id ?? index + 1),
      text: question.question || question.text || question.title || `Question ${index + 1}`,
      options: normalizedOptions,
      correctValue,
      explanation: question.explanation || question.feedback || "",
      required: question.required !== false
    };
  }

  function normalizeLesson(raw) {
    const lesson = unwrapObject(raw);

    const content = lesson.content
      ?? lesson.body
      ?? lesson.lesson_content
      ?? lesson.text_content
      ?? "";

    const takeaways = lesson.key_takeaways
      ?? lesson.takeaways
      ?? lesson.learning_points
      ?? [];

    const quizSource = lesson.questions
      ?? lesson.quiz_questions
      ?? (Array.isArray(lesson.quiz) ? lesson.quiz : null)
      ?? (lesson.quiz && Array.isArray(lesson.quiz.questions) ? lesson.quiz.questions : null)
      ?? [];

    return {
      id: String(lesson.id ?? lesson.lesson_id ?? ""),
      slug: String(lesson.slug ?? lesson.lesson_slug ?? ""),
      title: lesson.title || lesson.name || lesson.lesson_title || "Lesson",
      description: lesson.description || lesson.summary || lesson.objective || "",
      content: typeof content === "string" ? content : "",
      videoUrl: lesson.video_url || lesson.videoUrl || lesson.video || "",
      videoType: lesson.video_type || lesson.videoType || "",
      takeaways: Array.isArray(takeaways) ? takeaways : [],
      questions: unwrapList(quizSource, ["questions", "items"]).map(normalizeQuestion),
      completed: Boolean(lesson.is_completed ?? lesson.completed ?? false),
      raw: lesson
    };
  }

  function normalizeCourse(raw) {
    const course = unwrapObject(raw);
    const lessonItems = unwrapList(
      course.lessons || course.modules || [],
      ["lessons", "items", "results"]
    );

    return {
      id: String(course.id ?? course.course_id ?? ""),
      slug: String(course.slug ?? course.course_slug ?? state.courseSlug),
      title: course.title || course.name || course.course_name || "Course",
      lessons: lessonItems.map((lesson) => normalizeLesson(lesson)),
      raw: course
    };
  }

  function showError(message) {
    $("lessonLoading").hidden = true;
    $("lessonContent").hidden = true;
    $("lessonError").hidden = false;
    $("lessonErrorMessage").textContent = message;
  }

  function showFeedback(element, message, type) {
    element.textContent = message;
    element.className = `lesson-feedback ${type || ""}`.trim();
    element.hidden = false;
  }

  function safeVideoURL(rawURL) {
    if (!rawURL) return "";

    try {
      const url = new URL(rawURL, window.location.href);
      const isLocal = url.origin === window.location.origin;
      const isHTTPS = url.protocol === "https:";

      if (!isLocal && !isHTTPS) return "";

      return url.href;
    } catch {
      return "";
    }
  }

  function getYouTubeEmbed(rawURL) {
    try {
      const url = new URL(rawURL);
      const host = url.hostname.toLowerCase().replace(/^www\./, "");

      if (host === "youtu.be") {
        const id = url.pathname.split("/").filter(Boolean)[0];
        return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : "";
      }

      if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
        if (url.pathname === "/watch") {
          const id = url.searchParams.get("v");
          return id ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}` : "";
        }

        const match = url.pathname.match(/^\/(?:embed|shorts)\/([A-Za-z0-9_-]+)$/);
        if (match) return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(match[1])}`;
      }
    } catch {
      return "";
    }

    return "";
  }

  function renderVideo() {
    const container = $("lessonVideo");
    const rawURL = state.lesson.videoUrl;
    const embedURL = rawURL ? getYouTubeEmbed(rawURL) : "";
    const videoURL = safeVideoURL(rawURL);

    if (embedURL) {
      container.innerHTML = `
        <iframe
          src="${escapeHTML(embedURL)}"
          title="${escapeHTML(state.lesson.title)} video"
          loading="lazy"
          referrerpolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen></iframe>
      `;
      $("videoCaption").textContent = "Watch the lesson video, then review the written lesson below.";
      return;
    }

    if (videoURL) {
      const type = state.lesson.videoType.toLowerCase();
      const isDirectVideo = /\.(mp4|webm|ogv)(?:$|[?#])/i.test(videoURL)
        || type === "video"
        || type === "mp4";

      if (isDirectVideo) {
        container.innerHTML = `
          <video controls playsinline preload="metadata">
            <source src="${escapeHTML(videoURL)}">
            Your browser does not support this video.
          </video>
        `;
        $("videoCaption").textContent = "Use the video controls to watch this lesson.";
        return;
      }

      container.innerHTML = `
        <div class="lesson-video-placeholder">
          <i class="bi bi-box-arrow-up-right" aria-hidden="true"></i>
          <p class="mb-3">This lesson has an external video link.</p>
          <a class="lesson-primary-btn"
             href="${escapeHTML(videoURL)}"
             target="_blank"
             rel="noopener noreferrer">
            Open video <i class="bi bi-arrow-up-right" aria-hidden="true"></i>
          </a>
        </div>
      `;
      $("videoCaption").textContent = "The video opens separately. Return here to complete the lesson.";
      return;
    }

    container.innerHTML = `
      <div class="lesson-video-placeholder">
        <i class="bi bi-journal-richtext" aria-hidden="true"></i>
        <p class="mb-0">No video is available for this lesson yet. Use the written content and knowledge check below.</p>
      </div>
    `;
    $("videoCaption").textContent = "Written lesson content is available below.";
  }

  function renderContent() {
    const container = $("lessonBody");
    const content = state.lesson.content;

    if (!content.trim()) {
      container.textContent = "No written content has been added to this lesson yet.";
      return;
    }

    // Treat content as plain text. Do not inject arbitrary HTML from the API.
    container.innerHTML = content
      .split(/\n{2,}/)
      .map((paragraph) => `<p>${escapeHTML(paragraph).replace(/\n/g, "<br>")}</p>`)
      .join("");
  }

  function renderTakeaways() {
    const container = $("lessonTakeaways");
    const items = state.lesson.takeaways;

    if (!items.length) {
      container.innerHTML = `
        <li>
          <i class="bi bi-check-circle" aria-hidden="true"></i>
          <span>Review the main safety actions and important concepts described in the lesson.</span>
        </li>
      `;
      return;
    }

    container.innerHTML = items.map((item) => {
      const text = typeof item === "string"
        ? item
        : item.text || item.title || item.description || "";

      return `
        <li>
          <i class="bi bi-check-circle" aria-hidden="true"></i>
          <span>${escapeHTML(text)}</span>
        </li>
      `;
    }).join("");
  }

  function renderQuiz() {
    const container = $("lessonQuizQuestions");
    const feedback = $("quizFeedback");

    state.quizSubmitted = false;
    state.quizPassed = false;
    state.quizScore = null;

    $("submitQuiz").hidden = false;
    $("submitQuiz").disabled = false;
    $("retryQuiz").hidden = true;
    feedback.hidden = true;

    if (!state.questions.length) {
      container.innerHTML = `
        <div class="lesson-state">
          <i class="bi bi-info-circle" aria-hidden="true"></i>
          No knowledge-check questions have been added to this lesson yet.
        </div>
      `;
      $("submitQuiz").hidden = true;
      return;
    }

    container.innerHTML = state.questions.map((question, index) => `
      <fieldset class="lesson-question" data-question-index="${index}">
        <legend class="lesson-question-title">
          ${index + 1}. ${escapeHTML(question.text)}
        </legend>

        ${question.options.map((option, optionIndex) => `
          <label class="lesson-option" data-option-value="${escapeHTML(option.value)}">
            <input
              type="radio"
              name="question-${index}"
              value="${escapeHTML(option.value)}"
              ${question.required ? "required" : ""}
              aria-label="${escapeHTML(option.text)}">
            <span>${escapeHTML(option.text)}</span>
          </label>
        `).join("")}
        <div class="small lesson-muted" data-question-feedback="${index}" hidden></div>
      </fieldset>
    `).join("");
  }

  function renderSidebar() {
    const container = $("lessonSidebarList");

    if (!state.lessons.length) {
      container.innerHTML = '<p class="lesson-muted small mb-0">No lesson list is available.</p>';
      return;
    }

    container.innerHTML = state.lessons.map((lesson, index) => {
      const isCurrent = (
        (state.lesson.slug && lesson.slug === state.lesson.slug)
        || (state.lesson.id && lesson.id === state.lesson.id)
      );

      const isComplete = lesson.completed
        || state.completedLessonIds.has(lesson.id)
        || (lesson.slug && state.completedLessonSlugs.has(lesson.slug));

      const href = makeLessonURL(lesson);

      return `
        <a class="lesson-sidebar-item ${isCurrent ? "current" : ""}"
           href="${escapeHTML(href)}"
           ${isCurrent ? 'aria-current="page"' : ""}>
          <i class="bi ${isComplete ? "bi-check-circle-fill" : isCurrent ? "bi-play-circle-fill" : "bi-circle"}"
             aria-hidden="true"></i>
          <span>${index + 1}. ${escapeHTML(lesson.title)}</span>
        </a>
      `;
    }).join("");
  }

  function makeLessonURL(lesson) {
    const params = new URLSearchParams();
    params.set("course", state.course.slug || state.courseSlug);

    if (lesson.slug) params.set("lesson", lesson.slug);
    else params.set("lesson_id", lesson.id);

    return `lesson.html?${params.toString()}`;
  }

  function updateProgress() {
    const total = state.lessons.length;
    const completed = state.lessons.filter((lesson) => {
      return lesson.completed
        || state.completedLessonIds.has(lesson.id)
        || (lesson.slug && state.completedLessonSlugs.has(lesson.slug));
    }).length;

    const percentage = total ? Math.round((completed / total) * 100) : 0;

    $("lessonProgressLabel").textContent = `${percentage}%`;
    $("lessonProgressFill").style.width = `${percentage}%`;
    $("lessonProgressBar").setAttribute("aria-valuenow", String(percentage));
    $("lessonProgressDetail").textContent = total
      ? `${completed} of ${total} lessons completed`
      : "Complete lessons to track your progress.";

    renderSidebar();
  }

  function renderLesson() {
    $("lessonCourseName").textContent = state.course.title || "AapdaSetu AI Learning";
    $("lessonTitle").textContent = state.lesson.title;
    $("lessonDescription").textContent = state.lesson.description || "";

    const back = $("backToCourse");
    back.href = `course.html?slug=${encodeURIComponent(state.course.slug || state.courseSlug)}`;

    renderVideo();
    renderContent();
    renderTakeaways();
    renderQuiz();
    updateProgress();

    const index = state.lessons.findIndex((lesson) => (
      (state.lesson.id && lesson.id === state.lesson.id)
      || (state.lesson.slug && lesson.slug === state.lesson.slug)
    ));

    if (index >= 0 && index < state.lessons.length - 1) {
      const next = state.lessons[index + 1];
      $("nextLesson").href = makeLessonURL(next);
      $("nextLesson").hidden = false;
    } else {
      $("nextLesson").hidden = true;
    }

    state.completed = state.lesson.completed;
    $("markLessonComplete").disabled = state.completed;
    $("markLessonComplete").innerHTML = state.completed
      ? '<i class="bi bi-check-circle-fill" aria-hidden="true"></i> Lesson completed'
      : '<i class="bi bi-check-circle" aria-hidden="true"></i> Mark lesson complete';

    if (state.completed) {
      showFeedback($("completionFeedback"), "This lesson is marked complete.", "success");
    } else {
      $("completionFeedback").hidden = true;
    }

    $("lessonLoading").hidden = true;
    $("lessonError").hidden = true;
    $("lessonContent").hidden = false;
  }

  function sameAnswer(selected, correct, options) {
    if (selected === null || correct === null) return false;

    if (String(selected) === String(correct)) return true;

    const selectedOption = options.find((option) => option.value === String(selected));
    if (selectedOption && String(selectedOption.text) === String(correct)) return true;

    const correctOption = options.find((option) => option.text === String(correct));
    return Boolean(correctOption && correctOption.value === String(selected));
  }

  function handleQuizSubmit(event) {
    event.preventDefault();

    if (state.quizSubmitted) return;

    const unanswered = [];

    state.questions.forEach((question, index) => {
      const selected = document.querySelector(`input[name="question-${index}"]:checked`);
      if (question.required && !selected) unanswered.push(index + 1);
    });

    if (unanswered.length) {
      showFeedback(
        $("quizFeedback"),
        `Please answer the required question${unanswered.length > 1 ? "s" : ""}: ${unanswered.join(", ")}.`,
        "warning"
      );
      return;
    }

    let correctCount = 0;
    let gradedCount = 0;

    state.questions.forEach((question, index) => {
      const selected = document.querySelector(`input[name="question-${index}"]:checked`);
      const selectedValue = selected ? selected.value : null;
      const feedback = document.querySelector(`[data-question-feedback="${index}"]`);
      const fieldset = document.querySelector(`[data-question-index="${index}"]`);

      fieldset.querySelectorAll(".lesson-option").forEach((label) => {
        label.classList.remove("is-correct", "is-incorrect");
      });

      const hasAnswerKey = question.correctValue !== null;

      if (hasAnswerKey) {
        gradedCount += 1;

        const correct = sameAnswer(selectedValue, question.correctValue, question.options);
        if (correct) correctCount += 1;

        const correctOption = question.options.find((option) =>
          sameAnswer(option.value, question.correctValue, question.options)
        );

        if (correctOption) {
          const correctLabel = fieldset.querySelector(
            `[data-option-value="${CSS.escape(correctOption.value)}"]`
          );
          if (correctLabel) correctLabel.classList.add("is-correct");
        }

        if (selected && !correct) {
          const selectedLabel = selected.closest(".lesson-option");
          if (selectedLabel) selectedLabel.classList.add("is-incorrect");
        }

        feedback.textContent = (
          (correct ? "Correct. " : "Not quite. ")
          + (question.explanation || (correctOption ? `Correct answer: ${correctOption.text}` : "Review this topic and try again."))
        );
      } else {
        feedback.textContent = question.explanation
          || "Your answer was recorded for this review. No answer key is available for automatic grading.";
      }

      feedback.hidden = false;
      feedback.className = "small lesson-muted mt-2";
    });

    state.quizSubmitted = true;
    state.quizScore = gradedCount ? Math.round((correctCount / gradedCount) * 100) : null;
    state.quizPassed = state.quizScore !== null && state.quizScore >= 70;

    const resultMessage = state.quizScore === null
      ? "Your responses have been reviewed, but this quiz has no answer key configured. The score cannot be verified."
      : `You scored ${correctCount} out of ${gradedCount} (${state.quizScore}%). ${
          state.quizPassed
            ? "Good work! You passed this knowledge check."
            : "Review the highlighted answers and try again to improve your score."
        }`;

    showFeedback(
      $("quizFeedback"),
      resultMessage,
      state.quizPassed ? "success" : "warning"
    );

    $("submitQuiz").hidden = true;
    $("retryQuiz").hidden = state.quizPassed || state.quizScore === null;

    // Prevent editing answers after submission until retry.
    document.querySelectorAll("#lessonQuizQuestions input").forEach((input) => {
      input.disabled = true;
    });
  }

  function retryQuiz() {
    renderQuiz();
  }

  async function fetchFirstSuccessful(paths) {
    let lastError;

    for (const path of paths) {
      try {
        const response = await requestJSON(path);
        if (response !== null && response !== undefined) return response;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("No response from the API.");
  }

  async function fetchLessonData() {
    if (!state.courseSlug || !state.lessonIdentifier) {
      showError("This lesson link is missing the course or lesson identifier. Return to the course library and open the lesson again.");
      return;
    }

    $("lessonLoading").hidden = false;
    $("lessonError").hidden = true;
    $("lessonContent").hidden = true;

    const course = encodeURIComponent(state.courseSlug);
    const lesson = encodeURIComponent(state.lessonIdentifier);

    try {
      let courseRaw = null;

      try {
        courseRaw = await fetchFirstSuccessful([
          `/api/courses/${course}`,
          `/api/courses/slug/${course}`
        ]);
      } catch {
        // The lesson endpoint may still provide the course information.
      }

      if (courseRaw) state.course = normalizeCourse(courseRaw);
      else state.course = { slug: state.courseSlug, title: "Course", lessons: [] };

      let lessonRaw = null;

      try {
        lessonRaw = await fetchFirstSuccessful([
          `/api/courses/${course}/lessons/${lesson}`,
          `/api/lessons/${lesson}?course_slug=${course}`,
          `/api/lessons/${lesson}`
        ]);
      } catch {
        // Try locating the lesson in the course response.
      }

      if (!lessonRaw && state.course.lessons.length) {
        const found = state.course.lessons.find((item) =>
          item.id === state.lessonIdentifier || item.slug === state.lessonIdentifier
        );

        if (found) lessonRaw = found.raw || found;
      }

      if (!lessonRaw) {
        throw new Error("The lesson endpoint did not return lesson data.");
      }

      state.lesson = normalizeLesson(lessonRaw);

      if (!state.course.lessons.length) {
        try {
          const listResponse = await fetchFirstSuccessful([
            `/api/courses/${course}/lessons`,
            `/api/lessons?course_slug=${course}`
          ]);
          state.course.lessons = unwrapList(listResponse, ["lessons", "items", "results"])
            .map(normalizeLesson);
        } catch {
          // The lesson itself can still be displayed without the sidebar list.
        }
      }

      state.lessons = state.course.lessons;

      // Ensure the current lesson appears in the list if the detail response
      // is available but the list endpoint is not.
      const alreadyInList = state.lessons.some((item) =>
        (state.lesson.id && item.id === state.lesson.id)
        || (state.lesson.slug && item.slug === state.lesson.slug)
      );

      if (!alreadyInList) state.lessons.push(state.lesson);

      state.questions = state.lesson.questions;

      // Optional progress lookup. Adapt this to the actual authenticated
      // progress endpoint and response schema in your backend.
      try {
        const dashboard = await requestJSON("/api/dashboard");
        const data = unwrapObject(dashboard);
        const progressItems = unwrapList(
          data.course_progress || data.courses_progress || [],
          ["course_progress", "items", "results"]
        );

        const match = progressItems.find((item) =>
          String(item.course_slug || item.slug || "") === state.course.slug
          || (
            state.course.id
            && String(item.course_id || item.id || "") === state.course.id
          )
        );

        if (match) {
          const ids = match.completed_lesson_ids || match.completed_lessons;
          if (Array.isArray(ids)) {
            ids.forEach((id) => state.completedLessonIds.add(String(id)));
          }

          const slugs = match.completed_lesson_slugs;
          if (Array.isArray(slugs)) {
            slugs.forEach((slug) => state.completedLessonSlugs.add(String(slug)));
          }
        }
      } catch {
        // Dashboard progress is optional.
      }

      renderLesson();
    } catch (error) {
      console.error("Lesson load failed:", error);
      showError("We couldn't load this lesson. Verify the course and lesson API routes, then try again.");
    }
  }

  async function markComplete() {
    if (state.completed) return;

    const button = $("markLessonComplete");
    button.disabled = true;

    showFeedback(
      $("completionFeedback"),
      "Saving lesson completion…",
      ""
    );

    const course = encodeURIComponent(state.course.slug || state.courseSlug);
    const lesson = encodeURIComponent(state.lesson.slug || state.lesson.id || state.lessonIdentifier);

    const payload = {
      course_slug: state.course.slug || state.courseSlug,
      lesson_id: state.lesson.id || null,
      lesson_slug: state.lesson.slug || null,
      completed: true
    };

    try {
      // These are candidate route patterns only. Replace with the one
      // explicitly implemented by your FastAPI backend.
      await fetchFirstSuccessful([
        `/api/courses/${course}/lessons/${lesson}/complete`,
        `/api/lessons/${lesson}/complete`
      ].map((path) => {
        // This function below executes the POST. The placeholder string
        // is only used to preserve the route candidate order.
        return path;
      }).map((path) => ({ path, payload })));
    } catch (error) {
      console.error("Lesson completion save failed:", error);
      showFeedback(
        $("completionFeedback"),
        "Your completion could not be saved to the server. The completion API route may not exist yet. Nothing has been marked complete locally.",
        "error"
      );
      button.disabled = false;
      return;
    }

    state.completed = true;
    state.lesson.completed = true;
    state.completedLessonIds.add(state.lesson.id);

    const current = state.lessons.find((item) =>
      (state.lesson.id && item.id === state.lesson.id)
      || (state.lesson.slug && item.slug === state.lesson.slug)
    );

    if (current) current.completed = true;

    button.innerHTML = '<i class="bi bi-check-circle-fill" aria-hidden="true"></i> Lesson completed';
    showFeedback($("completionFeedback"), "Lesson completion saved successfully.", "success");
    updateProgress();
  }

  // POST helper kept separate so the endpoint contract is easy to change.
  async function postCompletionCandidate(candidates, payload) {
    let lastError;

    for (const path of candidates) {
      try {
        return await requestJSON(path, {
          method: "POST",
          body: payload
        });
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("No completion endpoint succeeded.");
  }

  async function saveCompletion() {
    if (state.completed) return;

    const button = $("markLessonComplete");
    button.disabled = true;

    showFeedback($("completionFeedback"), "Saving lesson completion…", "");

    const course = encodeURIComponent(state.course.slug || state.courseSlug);
    const lesson = encodeURIComponent(state.lesson.slug || state.lesson.id || state.lessonIdentifier);

    const payload = {
      course_slug: state.course.slug || state.courseSlug,
      lesson_id: state.lesson.id || null,
      lesson_slug: state.lesson.slug || null,
      completed: true
    };

    try {
      await postCompletionCandidate([
        `/api/courses/${course}/lessons/${lesson}/complete`,
        `/api/lessons/${lesson}/complete`
      ], payload);

      state.completed = true;
      state.lesson.completed = true;
      state.completedLessonIds.add(state.lesson.id);

      const current = state.lessons.find((item) =>
        (state.lesson.id && item.id === state.lesson.id)
        || (state.lesson.slug && item.slug === state.lesson.slug)
      );

      if (current) current.completed = true;

      button.innerHTML = '<i class="bi bi-check-circle-fill" aria-hidden="true"></i> Lesson completed';
      showFeedback($("completionFeedback"), "Lesson completion saved successfully.", "success");
      updateProgress();
    } catch (error) {
      console.error("Lesson completion save failed:", error);
      showFeedback(
        $("completionFeedback"),
        "Your completion could not be saved. Verify the backend completion endpoint. The lesson has not been marked complete.",
        "error"
      );
      button.disabled = false;
    }
  }

  function init() {
    readURL();

    $("retryLesson").addEventListener("click", fetchLessonData);
    $("lessonQuizForm").addEventListener("submit", handleQuizSubmit);
    $("retryQuiz").addEventListener("click", retryQuiz);
    $("markLessonComplete").addEventListener("click", saveCompletion);

    fetchLessonData();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
