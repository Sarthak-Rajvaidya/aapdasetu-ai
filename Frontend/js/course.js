
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

    /* -------------------- API -------------------- */

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

    /* -------------------- Course Data -------------------- */

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

    /* -------------------- Sidebar: Videos & Quiz -------------------- */

    function safeExternalURL(value) {
        try {
            const url = new URL(String(value || ""), window.location.href);

            if (url.protocol !== "https:" && url.protocol !== "http:") {
                return "";
            }

            return url.href;
        } catch {
            return "";
        }
    }

    function renderSidebarLearningExtras() {
        const objectives = $("courseObjectives");
        if (!objectives || !course) return;

        // Remove an old sidebar before rebuilding it.
        $("courseSidebarExtras")?.remove();

        const mediaLessons = course.lessons
            .filter(lesson =>
                lesson.media &&
                lesson.media.url &&
                safeExternalURL(lesson.media.url)
            )
            .slice(0, 3);

        const videoItems = mediaLessons.map(lesson => {
            const url = safeExternalURL(lesson.media.url);
            const isVideo = lesson.media.type === "video";

            return `
                <a
                    class="sidebar-video-item"
                    href="${escapeHTML(url)}"
                    target="_blank"
                    rel="noopener noreferrer">

                    <span class="sidebar-play">
                        <i class="bi ${isVideo ? "bi-play-fill" : "bi-shield-check"}"
                           aria-hidden="true"></i>
                    </span>

                    <span class="sidebar-video-copy">
                        <strong>
                            ${escapeHTML(
                                lesson.media.title ||
                                lesson.title ||
                                "Safety resource"
                            )}
                        </strong>
                        <small>
                            ${escapeHTML(lesson.title || "Course resource")}
                        </small>
                    </span>

                    <i class="bi bi-arrow-up-right sidebar-external-icon"
                       aria-hidden="true"></i>
                </a>
            `;
        }).join("");

        const fallbackResources = course.slug === "cyclone"
            ? `
                <a class="sidebar-video-item"
                   href="https://mausam.imd.gov.in/imd_latest/contents/cyclone.php"
                   target="_blank"
                   rel="noopener noreferrer">

                    <span class="sidebar-play">
                        <i class="bi bi-cloud-lightning-rain"
                           aria-hidden="true"></i>
                    </span>

                    <span class="sidebar-video-copy">
                        <strong>Official cyclone updates</strong>
                        <small>India Meteorological Department</small>
                    </span>

                    <i class="bi bi-arrow-up-right sidebar-external-icon"
                       aria-hidden="true"></i>
                </a>

                <a class="sidebar-video-item"
                   href="https://sachet.ndma.gov.in/DosDont"
                   target="_blank"
                   rel="noopener noreferrer">

                    <span class="sidebar-play">
                        <i class="bi bi-broadcast" aria-hidden="true"></i>
                    </span>

                    <span class="sidebar-video-copy">
                        <strong>Alerts &amp; safety guidance</strong>
                        <small>NDMA SACHET</small>
                    </span>

                    <i class="bi bi-arrow-up-right sidebar-external-icon"
                       aria-hidden="true"></i>
                </a>
            `
            : `
                <a class="sidebar-video-item"
                   href="https://sachet.ndma.gov.in/DosDont"
                   target="_blank"
                   rel="noopener noreferrer">

                    <span class="sidebar-play">
                        <i class="bi bi-shield-check" aria-hidden="true"></i>
                    </span>

                    <span class="sidebar-video-copy">
                        <strong>Official safety guidance</strong>
                        <small>NDMA SACHET</small>
                    </span>

                    <i class="bi bi-arrow-up-right sidebar-external-icon"
                       aria-hidden="true"></i>
                </a>
            `;

        const extras = document.createElement("div");
        extras.id = "courseSidebarExtras";

        extras.innerHTML = `
            <section class="sidebar-learning-card">
                <div class="sidebar-learning-heading">
                    <span class="sidebar-learning-icon video-icon">
                        <i class="bi bi-play-circle-fill"
                           aria-hidden="true"></i>
                    </span>

                    <div>
                        <h3>Videos &amp; Resources</h3>
                        <p>Learn with trusted visual guides</p>
                    </div>
                </div>

                <div class="sidebar-video-list">
                    ${videoItems || fallbackResources}
                </div>
            </section>

            <section class="sidebar-learning-card sidebar-quiz-card">
                <div class="sidebar-learning-heading">
                    <span class="sidebar-learning-icon quiz-icon">
                        <i class="bi bi-patch-question-fill"
                           aria-hidden="true"></i>
                    </span>

                    <div>
                        <h3>Test Your Knowledge</h3>
                        <p>Review what you have learned</p>
                    </div>
                </div>

                <div class="sidebar-quiz-summary">
                    <div class="sidebar-quiz-stat">
                        <strong>${course.quiz.length}</strong>
                        <span>Questions</span>
                    </div>

                    <div class="sidebar-quiz-stat">
                        <strong>${course.lessons.length}</strong>
                        <span>Lessons</span>
                    </div>
                </div>

                <button
                    type="button"
                    class="sidebar-quiz-button"
                    id="sidebarStartQuiz"
                    ${course.quiz.length ? "" : "disabled"}>

                    Start knowledge quiz
                    <i class="bi bi-arrow-right" aria-hidden="true"></i>
                </button>

                <p class="sidebar-quiz-note">
                    Get feedback and explanations after submitting your answers.
                </p>
            </section>
        `;

        // Place videos and quiz directly under "What you'll learn".
        objectives.insertAdjacentElement("afterend", extras);

        $("sidebarStartQuiz")?.addEventListener("click", () => {
            const quiz = $("courseKnowledgeQuiz");

            if (quiz) {
                quiz.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            } else {
                $("lessonList")?.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        });

        injectSidebarLearningStyles();
    }

    function injectSidebarLearningStyles() {
        if ($("aapda-sidebar-learning-styles")) return;

        const style = document.createElement("style");
        style.id = "aapda-sidebar-learning-styles";

        style.textContent = `
            #courseSidebarExtras {
                display: grid;
                gap: 16px;
                margin-top: 22px;
                width: 100%;
                min-width: 0;
            }

            #courseSidebarExtras .sidebar-learning-card {
                box-sizing: border-box;
                min-width: 0;
                padding: 18px;
                color: #e2e8f0;
                background: linear-gradient(145deg, #12243a, #0d1b2e);
                border: 1px solid #263b55;
                border-radius: 16px;
                box-shadow: 0 8px 24px rgba(0, 0, 0, .12);
            }

            #courseSidebarExtras .sidebar-learning-heading {
                display: flex;
                align-items: center;
                gap: 11px;
                margin-bottom: 15px;
            }

            #courseSidebarExtras .sidebar-learning-icon {
                display: grid;
                place-items: center;
                flex-shrink: 0;
                width: 40px;
                height: 40px;
                border-radius: 12px;
                font-size: 1.1rem;
            }

            #courseSidebarExtras .video-icon {
                color: #67e8f9;
                background: #123846;
            }

            #courseSidebarExtras .quiz-icon {
                color: #c4b5fd;
                background: #2b2450;
            }

            #courseSidebarExtras h3 {
                margin: 0 0 4px;
                color: #f8fafc;
                font-size: 1rem;
                font-weight: 700;
                line-height: 1.4;
            }

            #courseSidebarExtras .sidebar-learning-heading p {
                margin: 0;
                color: #94a3b8;
                font-size: .8rem;
                line-height: 1.5;
            }

            #courseSidebarExtras .sidebar-video-list {
                display: grid;
                gap: 9px;
            }

            #courseSidebarExtras .sidebar-video-item {
                display: flex;
                align-items: center;
                gap: 10px;
                min-width: 0;
                padding: 11px;
                color: #e2e8f0;
                background: #14263d;
                border: 1px solid #263b55;
                border-radius: 11px;
                text-decoration: none;
                transition: background .2s, border-color .2s;
            }

            #courseSidebarExtras .sidebar-video-item:hover {
                color: #f8fafc;
                background: #1a304b;
                border-color: #3b7187;
            }

            #courseSidebarExtras .sidebar-play {
                display: grid;
                place-items: center;
                flex-shrink: 0;
                width: 32px;
                height: 32px;
                color: #67e8f9;
                background: #123846;
                border-radius: 9px;
            }

            #courseSidebarExtras .sidebar-video-copy {
                display: grid;
                gap: 3px;
                flex: 1;
                min-width: 0;
            }

            #courseSidebarExtras .sidebar-video-copy strong {
                color: #eaf2ff;
                font-size: .82rem;
                line-height: 1.45;
                overflow-wrap: anywhere;
            }

            #courseSidebarExtras .sidebar-video-copy small {
                color: #94a3b8;
                font-size: .73rem;
                line-height: 1.4;
            }

            #courseSidebarExtras .sidebar-external-icon {
                flex-shrink: 0;
                color: #64748b;
                font-size: .8rem;
            }

            #courseSidebarExtras .sidebar-quiz-card {
                background: linear-gradient(145deg, #171d3b, #111b30);
                border-color: #33385e;
            }

            #courseSidebarExtras .sidebar-quiz-summary {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 10px;
                margin: 14px 0;
            }

            #courseSidebarExtras .sidebar-quiz-stat {
                display: grid;
                gap: 5px;
                padding: 12px 10px;
                background: #172641;
                border: 1px solid #2c3c5b;
                border-radius: 11px;
            }

            #courseSidebarExtras .sidebar-quiz-stat strong {
                color: #c4b5fd;
                font-size: 1.3rem;
                line-height: 1.2;
            }

            #courseSidebarExtras .sidebar-quiz-stat span {
                color: #a5b4cc;
                font-size: .76rem;
            }

            #courseSidebarExtras .sidebar-quiz-button {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                width: 100%;
                padding: 12px 14px;
                color: #081522;
                background: linear-gradient(100deg, #67e8f9, #5eead4);
                border: 0;
                border-radius: 10px;
                font: inherit;
                font-size: .85rem;
                font-weight: 700;
                cursor: pointer;
            }

            #courseSidebarExtras .sidebar-quiz-button:hover:not(:disabled) {
                filter: brightness(1.06);
            }

            #courseSidebarExtras .sidebar-quiz-button:disabled {
                opacity: .5;
                cursor: not-allowed;
            }

            #courseSidebarExtras .sidebar-quiz-note {
                margin: 10px 0 0;
                color: #94a3b8;
                font-size: .76rem;
                line-height: 1.6;
            }

            @media (max-width: 900px) {
                #courseSidebarExtras {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
            }

            @media (max-width: 560px) {
                #courseSidebarExtras {
                    grid-template-columns: minmax(0, 1fr);
                }
            }
        `;

        document.head.appendChild(style);
    }

    /* -------------------- Quiz -------------------- */

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
                id="courseKnowledgeQuiz">

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

                <div
                    id="courseQuizResult"
                    class="mt-3"
                    role="status"
                    hidden>
                </div>
            </section>
        `;
    }

    /* -------------------- Lessons -------------------- */

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
            attachQuizHandler();
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

            const mediaURL = safeExternalURL(lesson.media?.url);

            const media = lesson.media && mediaURL ? `
                <aside class="lesson-media-card">
                    <div class="lesson-media-icon">
                        <i class="bi ${
                            lesson.media.type === "video"
                                ? "bi-play-circle-fill"
                                : "bi-shield-check"
                        }"></i>
                    </div>

                    <div class="lesson-media-copy">
                        <span class="lesson-section-kicker">
                            ${lesson.media.type === "video"
                                ? "WATCH & LEARN"
                                : "OFFICIAL RESOURCE"}
                        </span>

                        <h4>${escapeHTML(
                            lesson.media.title || "Recommended resource"
                        )}</h4>

                        <p>${escapeHTML(
                            lesson.media.source ||
                            "Trusted disaster-preparedness resource"
                        )}</p>

                        <a
                            class="lesson-resource-link"
                            href="${escapeHTML(mediaURL)}"
                            target="_blank"
                            rel="noopener noreferrer">
                            ${lesson.media.type === "video"
                                ? "Watch video"
                                : "Open official resource"}
                            <i class="bi bi-arrow-up-right"></i>
                        </a>
                    </div>
                </aside>
            ` : "";

            const takeaway = lesson.takeaway ? `
                <aside class="lesson-takeaway">
                    <i class="bi bi-lightbulb-fill"></i>
                    <div>
                        <strong>Remember this</strong>
                        <p>${escapeHTML(lesson.takeaway)}</p>
                    </div>
                </aside>
            ` : "";

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

                    <div class="lesson-reading-time">
                        <i class="bi bi-book-half"></i>
                        FIELD GUIDE
                        <span>•</span>
                        ${Math.max(2, (lesson.content || []).length * 2)} min read
                    </div>

                    ${sections}
                    ${takeaway}
                    ${media}
                    ${actions}

                    <button
                        type="button"
                        class="learn-btn ${
                            complete
                                ? "learn-btn-secondary"
                                : "learn-btn-primary"
                        }"
                        data-complete-lesson="${escapeHTML(id)}"
                        ${complete ? "disabled" : ""}>
                        ${complete ? "Lesson completed" : "Mark as completed"}
                    </button>
                </article>
            `;
        }).join("");

        container.innerHTML = lessonHTML + renderQuiz();

        container.querySelectorAll("[data-complete-lesson]").forEach(button => {
            button.addEventListener("click", () => completeLesson(button));
        });

        attachQuizHandler();
    }

    function attachQuizHandler() {
        const quizForm = $("courseQuizForm");

        if (quizForm) {
            quizForm.addEventListener("submit", gradeQuiz);
        }
    }

    /* -------------------- Save Lesson Progress -------------------- */

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

        const validCount = nextViewed.filter(sectionId =>
            course.lessons.some(lesson => String(lesson.id) === sectionId)
        ).length;

        const percentage = course.lessons.length
            ? Math.round(validCount / course.lessons.length * 100)
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

    /* -------------------- Progress Display -------------------- */

    function updateProgressDisplay() {
        const total = course.lessons.length;

        const done = course.lessons.filter(lesson =>
            viewed.has(String(lesson.id))
        ).length;

        const percentage = total
            ? Math.round(done / total * 100)
            : 0;

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

    /* -------------------- Quiz Scoring -------------------- */

    function gradeQuiz(event) {
        event.preventDefault();

        const form = event.currentTarget;

        if (!form.reportValidity()) return;

        let correct = 0;

        course.quiz.forEach((question, index) => {
            const selected = form.querySelector(
                `input[name="question-${index}"]:checked`
            );

            const selectedIndex = selected ? Number(selected.value) : -1;
            const correctIndex = Number(question.correct_index);
            const isCorrect = selectedIndex === correctIndex;

            if (isCorrect) correct++;

            // Display explanations when the backend provides them.
            const fieldset = form.querySelectorAll("fieldset")[index];
            if (!fieldset) return;

            let feedback = fieldset.querySelector(".quiz-feedback");

            if (!feedback) {
                feedback = document.createElement("div");
                feedback.className = "quiz-feedback";
                feedback.setAttribute("aria-live", "polite");
                fieldset.appendChild(feedback);
            }

            const options = Array.isArray(question.options)
                ? question.options
                : [];

            feedback.className =
                `quiz-feedback ${isCorrect ? "correct" : "incorrect"}`;

            feedback.innerHTML = `
                <strong>${isCorrect ? "✓ Correct answer" : "✗ Incorrect answer"}</strong>
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
            `;
        });

        const total = course.quiz.length;
        const score = total ? Math.round(correct / total * 100) : 0;
        const result = $("courseQuizResult");

        if (!result) return;

        result.hidden = false;
        result.innerHTML = `
            <div class="quiz-score-line">
                <span class="quiz-score-icon">
                    <i class="bi ${
                        score >= 70
                            ? "bi-check2-circle"
                            : "bi-arrow-repeat"
                    }"></i>
                </span>

                <div>
                    <strong>Your score: ${score}% (${correct}/${total})</strong>
                    <p>
                        ${score >= 70
                            ? "Good work! Review any explanations for questions you missed."
                            : "Review the field guides and try again. In a real emergency, follow current official instructions."}
                    </p>
                </div>
            </div>
        `;

        form.querySelectorAll('input[type="radio"]').forEach(input => {
            input.disabled = true;
        });

        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) submitButton.disabled = true;
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
                   target="_blank"
                   rel="noopener noreferrer">
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
                   target="_blank"
                   rel="noopener noreferrer">
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
                   target="_blank"
                   rel="noopener noreferrer">
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

        // New sidebar cards appear beneath "What you'll learn".
        renderSidebarLearningExtras();

        updateProgressDisplay();

        const resume = $("resumeCourse");
        if (resume) resume.href = "#lessonList";

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
                "Course page is missing required loading/content/error elements."
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
