
/* ============================================================
   AapdaSetu AI — Course Details, Lessons & Knowledge Quiz
   File: Frontend/course.js
   ============================================================ */

(() => {
    "use strict";

    const $ = id => document.getElementById(id);

    let course = null;
    let viewed = new Set();
    let saving = false;

    /* -------------------- Utilities -------------------- */

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

    /* -------------------- Dark Theme Fix -------------------- */

    function injectCourseStyles() {
        if ($("aapda-course-enhanced-styles")) return;

        const style = document.createElement("style");
        style.id = "aapda-course-enhanced-styles";

        style.textContent = `
            /* Main lesson cards: prevent white cards with pale text */
            #lessonList {
                display: grid;
                gap: 24px;
                min-width: 0;
            }

            #lessonList .lesson-card,
            #lessonList .course-state {
                box-sizing: border-box;
                min-width: 0;
                padding: clamp(18px, 3vw, 30px);
                color: #e5edf8 !important;
                background: #101e32 !important;
                border: 1px solid #263b55 !important;
                border-radius: 18px;
                box-shadow: 0 8px 24px rgba(0, 0, 0, .18);
            }

            #lessonList .lesson-card h2,
            #lessonList .lesson-card h3,
            #lessonList .lesson-card h4,
            #lessonList .lesson-card legend,
            #lessonList .course-state h3 {
                color: #f8fafc !important;
                opacity: 1 !important;
                line-height: 1.5;
            }

            #lessonList .lesson-card p,
            #lessonList .lesson-card li,
            #lessonList .lesson-card label,
            #lessonList .lesson-card .lesson-description,
            #lessonList .course-state p {
                color: #cbd5e1 !important;
                opacity: 1 !important;
            }

            #lessonList .lesson-card .lesson-card-heading {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 16px;
                margin-bottom: 24px;
            }

            #lessonList .lesson-number {
                display: inline-block;
                margin-bottom: 8px;
                color: #5eead4 !important;
                font-size: .8rem;
                font-weight: 700;
                letter-spacing: .07em;
                text-transform: uppercase;
            }

            #lessonList .lesson-duration {
                flex-shrink: 0;
                padding: 6px 10px;
                color: #cbd5e1 !important;
                background: #1e3048 !important;
                border-radius: 999px;
                font-size: .82rem;
            }

            #lessonList .lesson-reading-time {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                align-items: center;
                margin: 16px 0 24px;
                color: #94a3b8 !important;
                font-size: .8rem;
                letter-spacing: .05em;
            }

            #lessonList .lesson-section-kicker {
                display: block;
                margin-bottom: 8px;
                color: #5eead4 !important;
                font-size: .75rem;
                font-weight: 700;
                letter-spacing: .08em;
            }

            #lessonList .lesson-content-block {
                max-width: 78ch;
                margin: 26px 0;
            }

            #lessonList .lesson-content-block h4,
            #lessonList .lesson-media-card h4,
            #lessonList .lesson-action-heading {
                margin: 0 0 10px;
                color: #f1f5f9 !important;
                font-size: 1.08rem;
                line-height: 1.5;
            }

            #lessonList .lesson-content-block p,
            #lessonList .lesson-takeaway p,
            #lessonList .lesson-media-card p {
                margin: 0;
                color: #cbd5e1 !important;
                font-size: 1rem;
                line-height: 1.9;
                white-space: pre-line;
                overflow-wrap: anywhere;
            }

            #lessonList .lesson-takeaway {
                display: flex;
                align-items: flex-start;
                gap: 14px;
                margin: 26px 0;
                padding: 20px;
                color: #dbeafe !important;
                background: #172b46 !important;
                border: 1px solid #2b4770 !important;
                border-radius: 14px;
            }

            #lessonList .lesson-takeaway > i {
                color: #93c5fd !important;
                margin-top: 3px;
            }

            #lessonList .lesson-takeaway strong {
                display: block;
                margin-bottom: 8px;
                color: #93c5fd !important;
            }

            #lessonList .lesson-action-list {
                margin: 0 0 24px;
                padding-left: 24px;
            }

            #lessonList .lesson-action-list li {
                margin: 10px 0;
                padding-left: 3px;
                line-height: 1.8;
            }

            #lessonList .lesson-card > h4 {
                margin-top: 24px;
                color: #f8fafc !important;
            }

            #lessonList .lesson-media-card {
                display: flex;
                gap: 16px;
                align-items: flex-start;
                margin: 26px 0;
                padding: 20px;
                background: #14243a !important;
                border: 1px solid #33465e !important;
                border-radius: 14px;
            }

            #lessonList .lesson-media-icon {
                display: grid;
                flex-shrink: 0;
                width: 44px;
                height: 44px;
                place-items: center;
                color: #5eead4 !important;
                background: #1e3a4b !important;
                border-radius: 12px;
                font-size: 1.25rem;
            }

            #lessonList .lesson-resource-link {
                display: inline-block;
                margin-top: 12px;
                color: #5eead4 !important;
                font-weight: 700;
                text-decoration: underline;
                text-underline-offset: 3px;
            }

            #lessonList .lesson-resource-link:hover {
                color: #99f6e4 !important;
            }

            #lessonList .lesson-card .learn-btn {
                margin-top: 12px;
            }

            #lessonList .lesson-card .learn-btn:disabled {
                opacity: .85;
                cursor: default;
            }

            /* Quiz */
            #lessonList .quiz-question {
                min-width: 0;
                margin: 22px 0;
                padding: 18px;
                color: #e2e8f0 !important;
                background: #132239 !important;
                border: 1px solid #33465e !important;
                border-radius: 14px;
            }

            #lessonList .quiz-question legend {
                max-width: 100%;
                padding: 0 6px;
                font-weight: 700;
                white-space: normal;
            }

            #lessonList .quiz-option {
                display: flex;
                align-items: flex-start;
                gap: 10px;
                margin: 10px 0;
                padding: 12px;
                color: #e2e8f0 !important;
                background: #14243a !important;
                border: 1px solid #33465e !important;
                border-radius: 10px;
                cursor: pointer;
                line-height: 1.7;
            }

            #lessonList .quiz-option:hover {
                background: #1e334d !important;
            }

            #lessonList .quiz-option input {
                flex-shrink: 0;
                margin-top: 5px;
                accent-color: #2dd4bf;
            }

            #lessonList .quiz-option span {
                color: #e2e8f0 !important;
            }

            #lessonList .quiz-feedback {
                margin-top: 14px;
                padding: 16px;
                border-radius: 12px;
                line-height: 1.8;
            }

            #lessonList .quiz-feedback p {
                margin: 8px 0 0;
            }

            #lessonList .quiz-feedback.correct {
                color: #bbf7d0 !important;
                background: #12352d !important;
                border: 1px solid #26765d !important;
            }

            #lessonList .quiz-feedback.incorrect {
                color: #fed7aa !important;
                background: #3a281b !important;
                border: 1px solid #92552a !important;
            }

            #lessonList .quiz-feedback small {
                display: block;
                margin-top: 8px;
            }

            #lessonList .quiz-score-line {
                display: flex;
                align-items: flex-start;
                gap: 14px;
            }

            #lessonList .quiz-score-icon {
                color: #5eead4 !important;
                font-size: 1.5rem;
            }

            #lessonList .quiz-score-line p {
                margin: 8px 0 0;
                color: #cbd5e1 !important;
                line-height: 1.8;
            }

            #lessonList .quiz-overall-result {
                margin-top: 20px;
                padding: 18px;
                color: #e2e8f0 !important;
                background: #17263b !important;
                border: 1px solid #33465e !important;
                border-radius: 14px;
                line-height: 1.8;
            }

            #lessonList .quiz-overall-result h4,
            #lessonList .quiz-overall-result strong {
                color: #f8fafc !important;
            }

            #lessonList .course-state p {
                line-height: 1.8;
            }

            #lessonList button:focus-visible,
            #lessonList a:focus-visible,
            #lessonList input:focus-visible {
                outline: 3px solid #2dd4bf;
                outline-offset: 3px;
            }

            @media (max-width: 600px) {
                #lessonList .lesson-card-heading {
                    flex-direction: column;
                    gap: 10px;
                }

                #lessonList .lesson-takeaway,
                #lessonList .lesson-media-card {
                    padding: 15px;
                }

                #lessonList .quiz-question {
                    padding: 12px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    /* -------------------- API Requests -------------------- */

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

        const responseText = await response.text();
        let data = null;

        try {
            data = responseText ? JSON.parse(responseText) : null;
        } catch {
            data = responseText;
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

    /* -------------------- Normalize Course -------------------- */

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

    /* -------------------- Objectives -------------------- */

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

    /* -------------------- Quiz Rendering -------------------- */

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
                <p>Answer each question to review what you learned.</p>

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
                        id="courseQuizSubmit"
                        type="submit">
                        Check answers
                    </button>

                    <button
                        class="learn-btn learn-btn-secondary"
                        id="courseQuizRetry"
                        type="button"
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

    function attachQuizHandlers() {
        const quizForm = $("courseQuizForm");
        if (quizForm) quizForm.addEventListener("submit", gradeQuiz);

        const retryButton = $("courseQuizRetry");
        if (retryButton) retryButton.addEventListener("click", retryQuiz);
    }

    function gradeQuiz(event) {
        event.preventDefault();

        const form = event.currentTarget;
        if (!form.reportValidity()) return;

        let correct = 0;
        const total = course.quiz.length;

        course.quiz.forEach((question, index) => {
            const selected = form.querySelector(
                `input[name="question-${index}"]:checked`
            );

            const feedback = $(`quizFeedback-${index}`);
            if (!selected || !feedback) return;

            const selectedIndex = Number(selected.value);
            const correctIndex = Number(question.correct_index);
            const isCorrect = selectedIndex === correctIndex;

            if (isCorrect) correct++;

            const options = Array.isArray(question.options)
                ? question.options
                : [];

            feedback.hidden = false;
            feedback.className =
                `quiz-feedback ${isCorrect ? "correct" : "incorrect"}`;

            feedback.innerHTML = `
                <strong>
                    ${isCorrect ? "✓ Correct answer!" : "✗ Incorrect answer"}
                </strong>
                <p>
                    <strong>Your answer:</strong>
                    ${escapeHTML(options[selectedIndex] ?? "No answer")}
                </p>
                <p>
                    <strong>Correct answer:</strong>
                    ${escapeHTML(options[correctIndex] ?? "Not provided")}
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

        const score = total ? Math.round(correct / total * 100) : 0;
        const result = $("courseQuizResult");

        if (result) {
            result.hidden = false;
            result.innerHTML = `
                <div class="quiz-score-line">
                    <span class="quiz-score-icon">
                        <i class="bi ${score >= 70 ? "bi-check2-circle" : "bi-arrow-repeat"}"></i>
                    </span>
                    <div>
                        <strong>Your score: ${score}% (${correct}/${total})</strong>
                        <p>
                            ${score >= 80
                                ? "Excellent work! Keep reviewing these safety actions so you can recall them during an emergency."
                                : score >= 70
                                    ? "Good work! Review the explanations for any questions you missed."
                                    : "Review the field guides and explanations, then try the quiz again."}
                        </p>
                        <p>
                            This knowledge check is educational and does not replace
                            current official emergency instructions.
                        </p>
                    </div>
                </div>
            `;
        }

        form.querySelectorAll('input[type="radio"]').forEach(input => {
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

        form.querySelectorAll('input[type="radio"]').forEach(input => {
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

    /* -------------------- Lesson Media -------------------- */

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

    function renderLessonMedia(media) {
        if (!media || !media.url) return "";

        const url = safeExternalURL(media.url);
        if (!url) return "";

        const isVideo = media.type === "video";

        return `
            <aside class="lesson-media-card">
                <div class="lesson-media-icon">
                    <i class="bi ${isVideo ? "bi-play-circle-fill" : "bi-shield-check"}"></i>
                </div>
                <div class="lesson-media-copy">
                    <span class="lesson-section-kicker">
                        ${isVideo ? "WATCH & LEARN" : "OFFICIAL RESOURCE"}
                    </span>
                    <h4>${escapeHTML(media.title || "Recommended resource")}</h4>
                    <p>${escapeHTML(media.source || "Trusted disaster-preparedness resource")}</p>
                    <a
                        class="lesson-resource-link"
                        href="${escapeHTML(url)}"
                        target="_blank"
                        rel="noopener noreferrer">
                        ${isVideo ? "Watch video" : "Open official resource"}
                        <i class="bi bi-arrow-up-right"></i>
                    </a>
                </div>
            </aside>
        `;
    }

    /* -------------------- Render Lessons -------------------- */

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

            const sections = (lesson.content || []).map((section, sectionIndex) => `
                <section class="lesson-content-block">
                    <span class="lesson-section-kicker">
                        ${String(sectionIndex + 1).padStart(2, "0")} / FIELD GUIDE
                    </span>
                    ${section.heading
                        ? `<h4>${escapeHTML(section.heading)}</h4>`
                        : ""}
                    <p>${escapeHTML(section.text || "")}</p>
                </section>
            `).join("");

            const takeaway = lesson.takeaway ? `
                <aside class="lesson-takeaway">
                    <i class="bi bi-lightbulb-fill" aria-hidden="true"></i>
                    <div>
                        <strong>Remember this</strong>
                        <p>${escapeHTML(lesson.takeaway)}</p>
                    </div>
                </aside>
            ` : "";

            const actions = (lesson.key_actions || []).length
                ? `
                    <section class="lesson-action-panel">
                        <h4 class="lesson-action-heading">Key safety actions</h4>
                        <ul class="lesson-action-list">
                            ${lesson.key_actions.map(action =>
                                `<li>${escapeHTML(action)}</li>`
                            ).join("")}
                        </ul>
                    </section>
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
                                ${escapeHTML(lesson.title || `Lesson ${index + 1}`)}
                            </h3>
                        </div>

                        <span class="lesson-duration">
                            ${Number(lesson.duration_minutes) || 5} min
                        </span>
                    </div>

                    <div class="lesson-reading-time">
                        <i class="bi bi-book-half" aria-hidden="true"></i>
                        FIELD GUIDE
                        <span>•</span>
                        ${Math.max(2, (lesson.content || []).length * 2)} min read
                    </div>

                    ${sections || `
                        <p class="lesson-description">
                            Detailed lesson content is not available yet.
                        </p>
                    `}

                    ${takeaway}
                    ${media}
                    ${actions}

                    <button
                        type="button"
                        class="learn-btn ${complete ? "learn-btn-secondary" : "learn-btn-primary"}"
                        data-complete-lesson="${escapeHTML(id)}"
                        ${complete ? "disabled" : ""}>
                        ${complete ? "✓ Lesson completed" : "Mark as completed"}
                    </button>
                </article>
            `;
        }).join("");

        container.innerHTML = lessonHTML + renderQuiz();

        container.querySelectorAll("[data-complete-lesson]").forEach(button => {
            button.addEventListener("click", () => completeLesson(button));
        });

        attachQuizHandlers();
    }

    /* -------------------- Save Progress -------------------- */

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

        const validCompletedCount = nextViewed.filter(sectionId =>
            course.lessons.some(lesson => String(lesson.id) === sectionId)
        ).length;

        const percentage = course.lessons.length
            ? Math.round(validCompletedCount / course.lessons.length * 100)
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

            course.progress = Math.max(
                0,
                Math.min(100, Number(result?.progress ?? percentage) || 0)
            );

            course.completed = Boolean(result?.completed);

            // Refresh lesson state without reloading the page.
            renderLessons();
            updateProgressDisplay();

            if (typeof window.showToast === "function") {
                window.showToast("Lesson progress saved.", "success");
            }
        } catch (error) {
            console.error("[AapdaSetu Learn] Progress save failed:", error);

            button.disabled = false;
            button.textContent = "Retry completion";

            if (typeof window.showToast === "function") {
                window.showToast(
                    error.message || "Unable to save progress. Please try again.",
                    "error"
                );
            } else {
                alert(error.message || "Unable to save progress. Please try again.");
            }
        } finally {
            saving = false;
        }
    }

    /* -------------------- Progress Display -------------------- */

    function updateProgressDisplay() {
        if (!course) return;

        const total = course.lessons.length;
        const done = course.lessons.filter(lesson =>
            viewed.has(String(lesson.id))
        ).length;

        const percentage = total
            ? Math.round(done / total * 100)
            : 0;

        // The completion percentage is derived from known lesson IDs.
        course.progress = percentage;

        setText("courseProgressPercent", `${percentage}%`);
        setText("courseCompletedLessons", done);
        setText("courseRemainingLessons", Math.max(0, total - done));

        const fill = $("courseProgressFill");
        if (fill) fill.style.width = `${percentage}%`;

        const bar = $("courseProgressBar");
        if (bar) {
            bar.setAttribute("aria-valuenow", String(percentage));
            bar.setAttribute("aria-valuemin", "0");
            bar.setAttribute("aria-valuemax", "100");
        }

        const resume = $("resumeCourse");

        if (resume) {
            if (total > 0 && done === total) {
                resume.innerHTML =
                    '<i class="bi bi-check-circle" aria-hidden="true"></i> Course completed';
                resume.href = "#courseKnowledgeQuiz";
            } else {
                const nextIndex = course.lessons.findIndex(lesson =>
                    !viewed.has(String(lesson.id))
                );

                resume.href = nextIndex >= 0
                    ? `#lesson-${nextIndex + 1}`
                    : "#lessonList";

                resume.textContent = "Continue learning";
            }
        }
    }

    /* -------------------- Official Resources -------------------- */

    function renderOfficialResources() {
        const host = $("courseOfficialResources");
        if (!host) return;

        if (course.slug !== "cyclone") {
            host.hidden = true;
            return;
        }

        host.hidden = false;

        host.innerHTML = `
            <h2 class="course-section-title">
                Trusted resources for real emergencies
            </h2>

            <p class="course-muted">
                Use official sources for current warnings. Course content is
                educational and does not replace local emergency instructions.
            </p>

            <div class="official-resource-grid">
                <a class="official-resource"
                   href="https://mausam.imd.gov.in/imd_latest/contents/cyclone.php"
                   target="_blank" rel="noopener noreferrer">
                    <span class="official-resource-icon">
                        <i class="bi bi-cloud-lightning-rain"></i>
                    </span>
                    <span>
                        <strong>IMD cyclone bulletins</strong>
                        <small>Forecasts, track, wind and storm-surge information</small>
                    </span>
                    <i class="bi bi-arrow-up-right"></i>
                </a>

                <a class="official-resource"
                   href="https://sachet.ndma.gov.in/DosDont"
                   target="_blank" rel="noopener noreferrer">
                    <span class="official-resource-icon">
                        <i class="bi bi-broadcast"></i>
                    </span>
                    <span>
                        <strong>NDMA SACHET</strong>
                        <small>Official alerts and disaster do's and don'ts</small>
                    </span>
                    <i class="bi bi-arrow-up-right"></i>
                </a>

                <a class="official-resource"
                   href="https://www.youtube.com/watch?v=B9qR2e3xyJo"
                   target="_blank" rel="noopener noreferrer">
                    <span class="official-resource-icon">
                        <i class="bi bi-play-circle"></i>
                    </span>
                    <span>
                        <strong>NDMA cyclone video</strong>
                        <small>Preparedness information and safety guidance</small>
                    </span>
                    <i class="bi bi-arrow-up-right"></i>
                </a>
            </div>
        `;
    }

    /* -------------------- Render Course -------------------- */

    function renderCourse() {
        setText("courseCategory", categoryLabel(course.category));
        setText("courseTitle", course.title);

        setText(
            "courseDescription",
            course.description || "Learn practical safety steps for this disaster."
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
        renderOfficialResources();
        updateProgressDisplay();

        setHidden("courseLoading", true);
        setHidden("courseError", true);
        setHidden("courseContent", false);
    }

    /* -------------------- Load Course -------------------- */

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

            viewed = new Set(
                course.viewedSections.filter(id =>
                    course.lessons.some(lesson => String(lesson.id) === id)
                )
            );

            injectCourseStyles();
            renderCourse();
        } catch (error) {
            console.error("[AapdaSetu Learn] Course loading failed:", error);

            if (error.status === 401) {
                showError(
                    "Your session has expired. Sign in again and reopen this course."
                );
            } else if (error.status === 404) {
                showError(
                    `Course "${slug}" was not found. Check the slug in your database.`
                );
            } else {
                showError(error.message || "Unable to load course details.");
            }
        }
    }

    /* -------------------- Initialize -------------------- */

    function init() {
        $("retryCourse")?.addEventListener("click", loadCourse);

        if (!$("courseLoading") || !$("courseContent") || !$("courseError")) {
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
