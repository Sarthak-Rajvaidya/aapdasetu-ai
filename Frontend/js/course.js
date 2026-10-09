
/* =========================================================
   AapdaSetu AI — Learn Course Page
   File: Frontend/js/course.js
   ========================================================= */

(() => {
    "use strict";

    const $ = (id) => document.getElementById(id);

    let course = null;
    let viewed = new Set();
    let saving = false;
    let progressHandlerBound = false;

    const escapeHTML = (value) =>
        String(value ?? "").replace(/[&<>"']/g, (char) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);

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

    function showLoading() {
        setHidden("courseLoading", false);
        setHidden("courseContent", true);
        setHidden("courseError", true);
    }

    function showError(message) {
        console.error("[AapdaSetu Learn]", message);

        setHidden("courseLoading", true);
        setHidden("courseContent", true);
        setHidden("courseError", false);
        setText("courseErrorMessage", message);
    }

    /*
     * Prefer the application's existing API helper.
     * The fallback is used only if apiFetch is unavailable.
     */
    async function requestJSON(path, options = {}) {
        if (typeof window.apiFetch === "function") {
            return await window.apiFetch(path, options);
        }

        const config = window.APP_CONFIG || {};
        const base = String(config.API_BASE_URL || "").replace(/\/+$/, "");
        const token =
            localStorage.getItem("access_token") ||
            localStorage.getItem("token") ||
            localStorage.getItem("auth_token");

        const headers = {
            Accept: "application/json"
        };

        let body;

        if (options.body !== undefined) {
            headers["Content-Type"] = "application/json";
            body = JSON.stringify(options.body);
        }

        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(`${base}${path}`, {
            method: options.method || "GET",
            headers,
            body,
            credentials: "include"
        });

        const text = await response.text();
        let data = null;

        try {
            data = text ? JSON.parse(text) : null;
        } catch {
            data = text;
        }

        if (!response.ok) {
            const detail = data?.detail || data?.message;
            const message = typeof detail === "string"
                ? detail
                : `Request failed with HTTP ${response.status}.`;

            const error = new Error(message);
            error.status = response.status;
            throw error;
        }

        return data;
    }

    function normalizeCourse(response) {
        const raw = response?.course ?? response?.data ?? response;

        if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
            throw new Error("The server returned an invalid course response.");
        }

        const lessons = Array.isArray(raw.lessons) ? raw.lessons : [];
        const savedSections = Array.isArray(raw.viewed_sections)
            ? raw.viewed_sections.map(String)
            : [];

        return {
            id: raw.id,
            slug: String(raw.slug || getSlug()),
            title: String(raw.title || "Untitled course"),
            description: String(raw.description || ""),
            category: String(raw.disaster_type || raw.category || "general"),
            lessons,
            objectives: Array.isArray(raw.objectives) ? raw.objectives : [],
            quiz: Array.isArray(raw.quiz) ? raw.quiz : [],
            progress: Math.max(
                0,
                Math.min(100, Number(raw.progress) || 0)
            ),
            viewedSections: savedSections,
            completed: Boolean(raw.completed),
            duration: Number(raw.duration_minutes) || 0
        };
    }

    function getCategoryLabel(category) {
        const labels = {
            earthquake: "Earthquake Safety",
            flood: "Flood Preparedness",
            cyclone: "Cyclone Preparedness",
            wildfire: "Wildfire Safety",
            tornado: "Tornado Safety"
        };

        const key = String(category || "general").toLowerCase();

        return labels[key] ||
            key.replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    }

    function renderObjectives() {
        const element = $("courseObjectives");
        if (!element) return;

        const objectives = course.objectives.length
            ? course.objectives
            : [
                "Understand the main hazards associated with this disaster.",
                "Learn how to prepare before an emergency.",
                "Recognise safer actions during and after the event."
            ];

        element.innerHTML = objectives.map(objective => `
            <li>${escapeHTML(objective)}</li>
        `).join("");
    }

    function renderLesson(lesson, index) {
        const id = String(lesson.id);
        const completed = viewed.has(id);
        const sections = Array.isArray(lesson.content) ? lesson.content : [];
        const actions = Array.isArray(lesson.key_actions)
            ? lesson.key_actions
            : [];

        return `
            <article
                class="lesson-card"
                id="lesson-${index + 1}"
                data-lesson-id="${escapeHTML(id)}"
            >
                <div class="lesson-card-heading">
                    <div>
                        <span class="lesson-number">
                            LESSON ${index + 1}
                        </span>

                        <h3>${escapeHTML(lesson.title || `Lesson ${index + 1}`)}</h3>
                    </div>

                    <span class="lesson-duration">
                        <i class="bi bi-clock" aria-hidden="true"></i>
                        ${Number(lesson.duration_minutes) || 5} min
                    </span>
                </div>

                <div class="lesson-body">
                    ${sections.map(section => `
                        <section class="lesson-content-block">
                            <h4>${escapeHTML(section.heading || "")}</h4>
                            <p>${escapeHTML(section.text || "")}</p>
                        </section>
                    `).join("")}

                    ${actions.length ? `
                        <section class="lesson-key-actions">
                            <h4>Key safety actions</h4>
                            <ul class="lesson-action-list">
                                ${actions.map(action => `
                                    <li>${escapeHTML(action)}</li>
                                `).join("")}
                            </ul>
                        </section>
                    ` : ""}
                </div>

                <div class="lesson-card-footer">
                    <span class="lesson-completion-status"
                          data-status-for="${escapeHTML(id)}"
                          aria-live="polite">
                        ${completed ? "Completed" : "Not completed"}
                    </span>

                    <button
                        type="button"
                        class="learn-btn ${completed
                            ? "learn-btn-secondary"
                            : "learn-btn-primary"}"
                        data-complete-lesson="${escapeHTML(id)}"
                        ${completed ? "disabled" : ""}
                    >
                        ${completed
                            ? '<i class="bi bi-check-circle" aria-hidden="true"></i> Completed'
                            : '<i class="bi bi-check2-circle" aria-hidden="true"></i> Mark as completed'}
                    </button>
                </div>
            </article>
        `;
    }

    function renderQuiz() {
        if (!course.quiz.length) {
            return `
                <section class="lesson-card course-quiz" id="courseKnowledgeQuiz">
                    <h3>Knowledge check</h3>
                    <p>
                        No quiz questions are configured for this course yet.
                        Review the lessons above to reinforce your learning.
                    </p>
                </section>
            `;
        }

        return `
            <section class="lesson-card course-quiz" id="courseKnowledgeQuiz">
                <div class="lesson-card-heading">
                    <div>
                        <span class="lesson-number">KNOWLEDGE CHECK</span>
                        <h3>Test your understanding</h3>
                    </div>
                </div>

                <p class="quiz-intro">
                    Choose one answer for each question, then check your result.
                </p>

                <form id="courseQuizForm">
                    ${course.quiz.map((question, index) => `
                        <fieldset class="quiz-question">
                            <legend>
                                ${index + 1}. ${escapeHTML(question.question)}
                            </legend>

                            ${(question.options || []).map((option, optionIndex) => `
                                <label class="quiz-option">
                                    <input
                                        type="radio"
                                        name="question-${index}"
                                        value="${optionIndex}"
                                        required
                                    >
                                    <span>${escapeHTML(option)}</span>
                                </label>
                            `).join("")}
                        </fieldset>
                    `).join("")}

                    <button type="submit" class="learn-btn learn-btn-primary">
                        Check answers
                    </button>
                </form>

                <div id="courseQuizResult" role="status" aria-live="polite" hidden></div>
            </section>
        `;
    }

    function renderLessons() {
        const container = $("lessonList");

        if (!container) {
            throw new Error(
                'Missing element with id="lessonList" in course.html.'
            );
        }

        if (!course.lessons.length) {
            container.innerHTML = `
                <div class="course-state">
                    <h3>Lessons are not available</h3>
                    <p>
                        This course does not currently contain lesson content.
                        Please try another course or contact the site administrator.
                    </p>
                </div>
            `;
            return;
        }

        container.innerHTML =
            course.lessons.map(renderLesson).join("") +
            renderQuiz();

        container.querySelectorAll("[data-complete-lesson]").forEach(button => {
            button.addEventListener("click", () => completeLesson(button));
        });

        const quizForm = $("courseQuizForm");
        if (quizForm) {
            quizForm.addEventListener("submit", gradeQuiz);
        }
    }

    async function completeLesson(button) {
        if (saving || button.disabled) return;

        const lessonId = button.dataset.completeLesson;

        if (!lessonId || viewed.has(lessonId)) return;

        saving = true;
        button.disabled = true;
        button.textContent = "Saving progress…";

        const nextViewed = [...new Set([...viewed, lessonId])];
        const calculatedProgress = course.lessons.length
            ? Math.round(nextViewed.length / course.lessons.length * 100)
            : 0;

        try {
            const result = await requestJSON(
                `/api/courses/${encodeURIComponent(course.slug)}/progress`,
                {
                    method: "POST",
                    body: {
                        progress: calculatedProgress,
                        viewed_sections: nextViewed
                    }
                }
            );

            viewed = new Set(
                Array.isArray(result?.viewed_sections)
                    ? result.viewed_sections.map(String)
                    : nextViewed
            );

            course.progress = Math.max(
                0,
                Math.min(100, Number(result?.progress) || calculatedProgress)
            );

            course.completed = Boolean(result?.completed);

            button.classList.remove("learn-btn-primary");
            button.classList.add("learn-btn-secondary");
            button.innerHTML =
                '<i class="bi bi-check-circle" aria-hidden="true"></i> Completed';

            const status = document.querySelector(
                `[data-status-for="${CSS.escape(lessonId)}"]`
            );

            if (status) status.textContent = "Completed";

            updateProgressDisplay();
        } catch (error) {
            console.error("[AapdaSetu Learn] Saving lesson failed:", error);

            button.disabled = false;
            button.innerHTML =
                '<i class="bi bi-arrow-clockwise" aria-hidden="true"></i> Retry completion';

            showInlineMessage(
                `Progress could not be saved: ${error.message}. Please try again.`,
                "error"
            );
        } finally {
            saving = false;
        }
    }

    function showInlineMessage(message, type = "info") {
        let element = $("courseInlineMessage");

        if (!element) {
            element = document.createElement("div");
            element.id = "courseInlineMessage";
            element.className = "course-inline-message";
            element.setAttribute("role", "status");

            const container = $("lessonList");
            if (container) container.prepend(element);
        }

        element.dataset.type = type;
        element.textContent = message;
        element.hidden = false;
    }

    function updateProgressDisplay() {
        const total = course.lessons.length;
        const completedCount = viewed.size;

        setText("courseProgressPercent", `${course.progress}%`);
        setText("courseCompletedLessons", completedCount);
        setText(
            "courseRemainingLessons",
            Math.max(0, total - completedCount)
        );

        const fill = $("courseProgressFill");
        if (fill) fill.style.width = `${course.progress}%`;

        const bar = $("courseProgressBar");
        if (bar) {
            bar.setAttribute("aria-valuenow", String(course.progress));
        }

        const resume = $("resumeCourse");

        if (resume && total) {
            const nextIndex = course.lessons.findIndex(
                lesson => !viewed.has(String(lesson.id))
            );

            const targetIndex = nextIndex >= 0 ? nextIndex : 0;
            resume.href = `#lesson-${targetIndex + 1}`;

            resume.innerHTML = course.completed
                ? '<i class="bi bi-check-circle" aria-hidden="true"></i> Review course'
                : viewed.size
                    ? '<i class="bi bi-play-circle" aria-hidden="true"></i> Continue learning'
                    : '<i class="bi bi-play-circle" aria-hidden="true"></i> Start learning';
        }
    }

    function bindStartLearning() {
        const resume = $("resumeCourse");

        if (!resume || resume.dataset.lessonNavigationBound === "true") {
            return;
        }

        resume.dataset.lessonNavigationBound = "true";

        resume.addEventListener("click", event => {
            if (!course || !course.lessons.length) return;

            event.preventDefault();

            const nextIndex = course.lessons.findIndex(
                lesson => !viewed.has(String(lesson.id))
            );

            const targetIndex = nextIndex >= 0 ? nextIndex : 0;
            const target = $(`lesson-${targetIndex + 1}`);

            if (target) {
                target.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

                target.setAttribute("tabindex", "-1");
                target.focus({ preventScroll: true });
            }
        });
    }

    /*
     * This is a client-side learning check only.
     * Quiz attempts are not persisted by this endpoint.
     */
    function gradeQuiz(event) {
        event.preventDefault();

        const form = event.currentTarget;
        let correct = 0;
        let unanswered = 0;

        course.quiz.forEach((question, index) => {
            const selected = form.querySelector(
                `input[name="question-${index}"]:checked`
            );

            if (!selected) {
                unanswered++;
                return;
            }

            if (Number(selected.value) === Number(question.correct_index)) {
                correct++;
            }
        });

        const result = $("courseQuizResult");
        if (!result) return;

        if (unanswered) {
            result.hidden = false;
            result.textContent = `Please answer all ${course.quiz.length} questions before checking your result.`;
            return;
        }

        const score = course.quiz.length
            ? Math.round(correct / course.quiz.length * 100)
            : 0;

        result.hidden = false;
        result.innerHTML = `
            <strong>Your score: ${score}% (${correct}/${course.quiz.length})</strong>
            <p>
                ${score >= 70
                    ? "Good work. Revisit any topics you found difficult."
                    : "Review the lessons and try the knowledge check again."}
            </p>
        `;
    }

    function renderCourse() {
        setText("courseCategory", getCategoryLabel(course.category));
        setText("courseTitle", course.title);
        setText("courseDescription", course.description);
        setText(
            "courseDuration",
            course.duration ? `${course.duration} minutes` : "Self-paced"
        );
        setText("courseLevel", "All levels");
        setText("courseLessonCount", course.lessons.length);
        setText("courseQuizCount", course.quiz.length ? 1 : 0);

        renderObjectives();
        renderLessons();
        bindStartLearning();
        updateProgressDisplay();

        setHidden("courseLoading", true);
        setHidden("courseError", true);
        setHidden("courseContent", false);
    }

    async function loadCourse() {
        const slug = getSlug();

        if (!slug) {
            showError(
                "No course was selected. Return to the Learn page and choose a course."
            );
            return;
        }

        showLoading();

        try {
            const response = await requestJSON(
                `/api/courses/${encodeURIComponent(slug)}`
            );

            course = normalizeCourse(response);
            viewed = new Set(course.viewedSections);

            renderCourse();
        } catch (error) {
            console.error("[AapdaSetu Learn] Course loading failed:", error);

            if (error.status === 401) {
                showError("Your session has expired. Sign in again and reopen this course.");
            } else if (error.status === 403) {
                showError("You do not have permission to access this course.");
            } else if (error.status === 404) {
                showError(`Course "${slug}" was not found in the database.`);
            } else {
                showError(
                    error.message ||
                    "Unable to load this course. Check your connection and try again."
                );
            }
        }
    }

    function init() {
        const retryButton = $("retryCourse");

        if (retryButton) {
            retryButton.addEventListener("click", loadCourse);
        }

        if (!$("courseLoading") || !$("courseContent") || !$("courseError")) {
            console.error(
                "course.html is missing a required loading, content, or error element."
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
