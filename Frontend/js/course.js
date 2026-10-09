
/* AapdaSetu AI — Course Details, Lessons and Knowledge Quiz */
(() => {
    "use strict";

    const $ = id => document.getElementById(id);

    let course = null;
    let viewed = new Set();
    let saving = false;

    const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[c]);

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

    async function requestJSON(path, options = {}) {
        if (typeof window.apiFetch === "function") {
            return window.apiFetch(path, options);
        }

        const config = window.APP_CONFIG || {};
        const base = String(config.API_BASE_URL || "").replace(/\/+$/, "");
        const token = localStorage.getItem("token");
        const headers = { Accept: "application/json" };

        if (token) headers.Authorization = `Bearer ${token}`;

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

        const text = await response.text();
        let data = null;

        try {
            data = text ? JSON.parse(text) : null;
        } catch {
            data = text;
        }

        if (!response.ok) {
            const message = data?.detail || data?.message ||
                `Request failed (HTTP ${response.status}).`;
            const error = new Error(
                typeof message === "string" ? message : JSON.stringify(message)
            );
            error.status = response.status;
            throw error;
        }

        return data;
    }

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
            lessons,
            objectives: Array.isArray(raw.objectives) ? raw.objectives : [],
            quiz: Array.isArray(raw.quiz) ? raw.quiz : [],
            progress: Math.max(0, Math.min(100, Number(raw.progress) || 0)),
            viewedSections: sections,
            completed: Boolean(raw.completed),
            quizCount: Number(raw.quiz_count) || (raw.quiz?.length ? 1 : 0),
            duration: Number(raw.duration_minutes) || 0
        };
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

        element.innerHTML = objectives.map(item =>
            `<li class="mb-2">${escapeHTML(item)}</li>`
        ).join("");
    }

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
            <section class="lesson-card course-quiz" id="courseKnowledgeQuiz">
                <h3>Knowledge check</h3>
                <p>Answer the following questions to review what you learned.</p>

                <form id="courseQuizForm">
                    ${course.quiz.map((question, index) => `
                        <fieldset class="quiz-question mb-4">
                            <legend>
                                ${index + 1}. ${escapeHTML(question.question)}
                            </legend>
                            ${(question.options || []).map((option, optionIndex) => `
                                <label class="quiz-option d-block mb-2">
                                    <input
                                        type="radio"
                                        name="question-${index}"
                                        value="${optionIndex}"
                                        required
                                    >
                                    ${escapeHTML(option)}
                                </label>
                            `).join("")}
                        </fieldset>
                    `).join("")}

                    <button class="learn-btn learn-btn-primary" type="submit">
                        Check answers
                    </button>
                </form>

                <div id="courseQuizResult" class="mt-3" role="status" hidden></div>
            </section>
        `;
    }

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
            `;
            return;
        }

        const lessonHTML = course.lessons.map((lesson, index) => {
            const id = String(lesson.id);
            const complete = viewed.has(id);

            const sections = (lesson.content || []).map(section => `
                <section class="lesson-content-block">
                    <h4>${escapeHTML(section.heading || "")}</h4>
                    <p>${escapeHTML(section.text || "")}</p>
                </section>
            `).join("");

            const actions = (lesson.key_actions || []).length
                ? `
                    <h4>Key safety actions</h4>
                    <ul class="lesson-action-list">
                        ${lesson.key_actions.map(action =>
                            `<li>${escapeHTML(action)}</li>`
                        ).join("")}
                    </ul>
                `
                : "";

            return `
                <article class="lesson-card" id="lesson-${index + 1}">
                    <div class="lesson-card-heading">
                        <div>
                            <span class="lesson-number">Lesson ${index + 1}</span>
                            <h3>${escapeHTML(lesson.title)}</h3>
                        </div>
                        <span class="lesson-duration">
                            ${Number(lesson.duration_minutes) || 5} min
                        </span>
                    </div>

                    ${sections}
                    ${actions}

                    <button
                        type="button"
                        class="learn-btn ${complete ? "learn-btn-secondary" : "learn-btn-primary"}"
                        data-complete-lesson="${escapeHTML(id)}"
                        ${complete ? "disabled" : ""}
                    >
                        ${complete ? "Lesson completed" : "Mark as completed"}
                    </button>
                </article>
            `;
        }).join("");

        container.innerHTML = lessonHTML + renderQuiz();

        container.querySelectorAll("[data-complete-lesson]").forEach(button => {
            button.addEventListener("click", () => completeLesson(button));
        });

        const quizForm = $("courseQuizForm");
        if (quizForm) quizForm.addEventListener("submit", gradeQuiz);
    }

    async function completeLesson(button) {
        if (saving) return;

        const id = button.dataset.completeLesson;
        if (!id || viewed.has(id)) return;

        saving = true;
        button.disabled = true;
        button.textContent = "Saving progress…";

        const next = new Set(viewed);
        next.add(id);
        const nextViewed = [...next];
        const percentage = course.lessons.length
            ? Math.round(nextViewed.length / course.lessons.length * 100)
            : 0;

        try {
            const result = await requestJSON(
                `/api/courses/${encodeURIComponent(course.slug)}/progress`,
                {
                    method: "POST",
                    body: { progress: percentage, viewed_sections: nextViewed }
                }
            );

            viewed = new Set(
                Array.isArray(result.viewed_sections)
                    ? result.viewed_sections.map(String)
                    : nextViewed
            );

            course.progress = Number(result.progress) || percentage;
            course.completed = Boolean(result.completed);

            button.textContent = "Lesson completed";
            button.classList.remove("learn-btn-primary");
            button.classList.add("learn-btn-secondary");

            updateProgressDisplay();
        } catch (error) {
            console.error("Progress save failed:", error);
            button.disabled = false;
            button.textContent = "Retry completion";
            alert(error.message || "Unable to save progress. Please try again.");
        } finally {
            saving = false;
        }
    }

    function updateProgressDisplay() {
        const total = course.lessons.length;
        const done = viewed.size;

        setText("courseProgressPercent", `${course.progress}%`);
        setText("courseCompletedLessons", done);
        setText("courseRemainingLessons", Math.max(0, total - done));

        const fill = $("courseProgressFill");
        if (fill) fill.style.width = `${course.progress}%`;

        const bar = $("courseProgressBar");
        if (bar) bar.setAttribute("aria-valuenow", String(course.progress));

        const resume = $("resumeCourse");
        if (resume && course.completed) {
            resume.innerHTML =
                '<i class="bi bi-check-circle" aria-hidden="true"></i> Course completed';
        }
    }

    function gradeQuiz(event) {
        event.preventDefault();

        const form = event.currentTarget;
        let correct = 0;

        course.quiz.forEach((question, index) => {
            const selected = form.querySelector(
                `input[name="question-${index}"]:checked`
            );

            if (selected && Number(selected.value) === Number(question.correct_index)) {
                correct++;
            }
        });

        const total = course.quiz.length;
        const score = total ? Math.round(correct / total * 100) : 0;
        const result = $("courseQuizResult");

        if (!result) return;

        result.hidden = false;
        result.innerHTML = `
            <strong>Your score: ${score}% (${correct}/${total})</strong>
            <p>${score >= 70
                ? "Good work! Review any topics you found difficult."
                : "Review the lessons and try the quiz again."}</p>
        `;
    }

    function renderCourse() {
        setText("courseCategory", categoryLabel(course.category));
        setText("courseTitle", course.title);
        setText(
            "courseDescription",
            course.description || "Learn practical safety steps for this disaster."
        );
        setText("courseDuration",
            course.duration ? `${course.duration} minutes` : "Self-paced");
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
        if (resume) resume.href = "#lessonList";

        setHidden("courseLoading", true);
        setHidden("courseError", true);
        setHidden("courseContent", false);
    }

    async function loadCourse() {
        const slug = getSlug();

        if (!slug) {
            showError("The URL is missing a course slug. Return to Learn and select a course.");
            return;
        }

        showLoading();

        try {
            const data = await requestJSON(
                `/api/courses/${encodeURIComponent(slug)}`
            );

            course = normalizeCourse(data);
            viewed = new Set(course.viewedSections);
            renderCourse();
        } catch (error) {
            console.error("[AapdaSetu Learn] Course loading failed:", error);

            if (error.status === 401) {
                showError("Your session has expired. Sign in again and reopen this course.");
            } else if (error.status === 404) {
                showError(`Course "${slug}" was not found. Check the slug in your database.`);
            } else {
                showError(error.message || "Unable to load course details.");
            }
        }
    }

    function init() {
        $("retryCourse")?.addEventListener("click", loadCourse);

        if (!$("courseLoading") || !$("courseContent") || !$("courseError")) {
            console.error("Course page is missing required loading/content/error elements.");
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
