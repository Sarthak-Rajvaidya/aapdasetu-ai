
/* =========================================================
   AAPDASETU AI — LEARN COURSE LIBRARY
   File: Frontend/js/modules.js
   ========================================================= */

(() => {
    "use strict";

    const state = {
        courses: [],
        progress: [],
        category: "all",
        search: "",
        sort: "recommended",
        loading: false,
        error: null
    };

    const $ = (selector) => document.querySelector(selector);

    const elements = {
        loading: $("#courseLoading"),
        grid: $("#courseGrid"),
        empty: $("#courseEmpty"),
        error: $("#courseError"),
        errorMessage: $("#courseErrorMessage"),
        search: $("#courseSearch"),
        sort: $("#courseSort"),
        filters: $("#courseFilters"),
        courseCount: $("#learnCourseCount"),
        completedCount: $("#learnCompletedCount"),
        inProgressCount: $("#learnInProgressCount"),
        libraryCount: $("#libraryCountLabel"),
        continueSection: $("#continueSection"),
        continueCard: $("#continueCourseCard"),
        clearFilters: $("#clearCourseFilters"),
        retry: $("#retryCourses")
    };

    const CATEGORY_META = {
        "earthquake": {
            category: "natural-disasters",
            label: "Natural disaster",
            icon: "bi-activity",
            art: ""
        },
        "flood": {
            category: "natural-disasters",
            label: "Natural disaster",
            icon: "bi-water",
            art: "art-flood"
        },
        "cyclone": {
            category: "natural-disasters",
            label: "Natural disaster",
            icon: "bi-wind",
            art: "art-cyclone"
        },
        "tornado": {
            category: "natural-disasters",
            label: "Natural disaster",
            icon: "bi-tornado",
            art: "art-cyclone"
        },
        "wildfire": {
            category: "natural-disasters",
            label: "Natural disaster",
            icon: "bi-fire",
            art: "art-fire"
        },
        "first-aid": {
            category: "first-aid",
            label: "First aid",
            icon: "bi-heart-pulse",
            art: "art-firstaid"
        },
        "emergency-kit": {
            category: "emergency-response",
            label: "Emergency response",
            icon: "bi-backpack2",
            art: "art-general"
        },
        "communication": {
            category: "general-safety",
            label: "General safety",
            icon: "bi-broadcast",
            art: "art-general"
        }
    };

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, (character) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]);
    }

    function numberOrNull(value) {
        if (value === null || value === undefined || value === "") return null;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    function slugify(value) {
        return String(value ?? "")
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
    }

    function safeProgress(value) {
        const number = numberOrNull(value);
        if (number === null) return 0;
        return Math.min(100, Math.max(0, number));
    }

    function formatDuration(value) {
        const minutes = numberOrNull(value);
        if (minutes === null || minutes <= 0) return "Self-paced";
        if (minutes < 60) return `${minutes} min`;
        const hours = Math.floor(minutes / 60);
        const remaining = minutes % 60;
        return remaining ? `${hours} hr ${remaining} min` : `${hours} hr`;
    }

    function normalizeList(payload) {
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload?.items)) return payload.items;
        if (Array.isArray(payload?.courses)) return payload.courses;
        if (Array.isArray(payload?.data)) return payload.data;
        if (Array.isArray(payload?.data?.items)) return payload.data.items;
        if (Array.isArray(payload?.data?.courses)) return payload.data.courses;
        return null;
    }

    function getApiBase() {
        const config = window.APP_CONFIG || window.API_CONFIG || {};
        return String(
            config.API_BASE_URL ||
            config.API_URL ||
            config.apiBaseUrl ||
            window.API_BASE_URL ||
            ""
        ).replace(/\/+$/, "");
    }

    function getAccessToken() {
        const candidates = ["access_token", "token", "auth_token"];

        for (const key of candidates) {
            try {
                const value = localStorage.getItem(key);
                if (value && value !== "null" && value !== "undefined") {
                    return value;
                }
            } catch (_) {
                // Storage may be disabled; cookie-based auth can still work.
            }
        }

        try {
            const user = JSON.parse(localStorage.getItem("user") || "null");
            return user?.access_token || user?.token || null;
        } catch (_) {
            return null;
        }
    }

    async function requestJSON(path) {
        /*
         * Prefer the application's shared API client if it exists.
         * It may already handle authentication, API prefixes and errors.
         */
        if (typeof window.apiFetch === "function") {
            const result = await window.apiFetch(path);
            if (result instanceof Response) {
                if (!result.ok) throw new Error(`Request failed (${result.status})`);
                return result.json();
            }
            return result;
        }

        if (typeof window.apiRequest === "function") {
            const result = await window.apiRequest(path);
            if (result instanceof Response) {
                if (!result.ok) throw new Error(`Request failed (${result.status})`);
                return result.json();
            }
            return result;
        }

        const headers = { Accept: "application/json" };
        const token = getAccessToken();

        if (token) headers.Authorization = `Bearer ${token}`;

        const response = await fetch(`${getApiBase()}${path}`, {
            method: "GET",
            headers,
            credentials: "include"
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new Error("Your session may have expired. Please sign in and try again.");
            }
            throw new Error(`Unable to load learning data (HTTP ${response.status}).`);
        }

        return response.json();
    }

    function normalizeCourse(raw) {
        const slug = String(raw.slug || raw.course_slug || raw.id || "").trim();
        if (!slug) return null;

        const key = slugify(slug);
        const known = CATEGORY_META[key] || {};
        const rawCategory = slugify(
            raw.category || raw.category_slug || raw.topic || raw.disaster_type || key
        );

        let category = known.category || rawCategory;
        if (!["natural-disasters", "emergency-response", "first-aid", "general-safety"].includes(category)) {
            if (["earthquake", "flood", "cyclone", "tornado", "wildfire"].includes(rawCategory)) {
                category = "natural-disasters";
            } else if (rawCategory.includes("first") || rawCategory.includes("medical")) {
                category = "first-aid";
            } else if (rawCategory.includes("emergency") || rawCategory.includes("response")) {
                category = "emergency-response";
            } else {
                category = "general-safety";
            }
        }

        const title = String(raw.title || raw.name || raw.course_name || slug);
        const progressValue =
            raw.progress ??
            raw.progress_percent ??
            raw.completion_percentage ??
            raw.completion ??
            0;

        const lessonsCount = numberOrNull(
            raw.lessons_count ?? raw.lesson_count ?? raw.total_lessons ?? raw.lessons?.length
        );

        const videoCount = numberOrNull(
            raw.video_count ?? raw.videos_count ?? raw.total_videos
        );

        const duration = numberOrNull(
            raw.duration_minutes ?? raw.estimated_minutes ?? raw.duration
        );

        const completed = raw.completed === true || raw.is_completed === true ||
            (numberOrNull(progressValue) !== null && Number(progressValue) >= 100);

        return {
            slug,
            key,
            title,
            description: String(raw.description || raw.summary || "Explore this course to build practical disaster-preparedness skills."),
            category,
            categoryLabel: known.label || String(raw.category_label || raw.category || "Preparedness"),
            icon: known.icon || "bi-shield-check",
            art: known.art || "art-general",
            level: String(raw.level || raw.difficulty || "Self-paced"),
            duration,
            lessonsCount,
            videoCount,
            progress: safeProgress(progressValue),
            completed,
            raw
        };
    }

    function normalizeProgressRecords(payload) {
        const items = normalizeList(payload);
        if (!items) return [];

        return items.map((item) => ({
            slug: String(item.course_slug || item.slug || item.course?.slug || ""),
            progress: safeProgress(item.progress ?? item.progress_percent ?? 0),
            completed: item.completed === true || item.is_completed === true
        })).filter((item) => item.slug);
    }

    function mergeProgress(courses, progressRecords) {
        const progressMap = new Map(
            progressRecords.map((record) => [record.slug, record])
        );

        return courses.map((course) => {
            const record = progressMap.get(course.slug);
            if (!record) return course;

            return {
                ...course,
                progress: record.progress,
                completed: record.completed || course.completed
            };
        });
    }

    async function fetchCourses() {
        let lastError;

        for (const endpoint of ["/api/courses", "/api/courses/"]) {
            try {
                const payload = await requestJSON(endpoint);
                const list = normalizeList(payload);

                if (!list) {
                    throw new Error("The courses API returned an unexpected response format.");
                }

                return list.map(normalizeCourse).filter(Boolean);
            } catch (error) {
                lastError = error;
                if (error.message?.includes("session may have expired")) throw error;
            }
        }

        throw lastError || new Error("Unable to load courses.");
    }

    async function fetchProgress() {
        /*
         * Progress is supplementary. Course browsing still works if the
         * dashboard endpoint is unavailable, but no progress is fabricated.
         */
        try {
            const payload = await requestJSON("/api/dashboard");
            const dashboard = payload?.data || payload;
            return normalizeProgressRecords(dashboard?.course_progress);
        } catch (error) {
            console.warn("[Learn] Course progress unavailable:", error.message);
            return [];
        }
    }

    function getCourseURL(course) {
        return `course.html?slug=${encodeURIComponent(course.slug)}`;
    }

    function getLessonURL(course) {
        return `lesson.html?course=${encodeURIComponent(course.slug)}`;
    }

    function categoryMatches(course, selected) {
        if (selected === "all") return true;
        return course.category === selected;
    }

    function searchMatches(course, query) {
        if (!query) return true;

        const searchable = [
            course.title,
            course.description,
            course.categoryLabel,
            course.level,
            course.slug
        ].join(" ").toLowerCase();

        return searchable.includes(query);
    }

    function getFilteredCourses() {
        const query = state.search.trim().toLowerCase();

        const courses = state.courses.filter((course) =>
            categoryMatches(course, state.category) &&
            searchMatches(course, query)
        );

        switch (state.sort) {
            case "title":
                courses.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case "duration":
                courses.sort((a, b) =>
                    (a.duration ?? Number.MAX_SAFE_INTEGER) -
                    (b.duration ?? Number.MAX_SAFE_INTEGER)
                );
                break;
            case "progress":
                courses.sort((a, b) => b.progress - a.progress);
                break;
            default:
                courses.sort((a, b) => {
                    const rank = (course) =>
                        course.completed ? 2 : course.progress > 0 ? 0 : 1;
                    return rank(a) - rank(b) || a.title.localeCompare(b.title);
                });
        }

        return courses;
    }

    function renderSummary() {
        const completed = state.courses.filter((course) => course.completed).length;
        const inProgress = state.courses.filter(
            (course) => !course.completed && course.progress > 0
        ).length;

        elements.courseCount.textContent = String(state.courses.length);
        elements.completedCount.textContent = String(completed);
        elements.inProgressCount.textContent = String(inProgress);
    }

    function renderCourseCard(course) {
        const courseURL = getCourseURL(course);
        const progress = course.progress;
        const status = course.completed
            ? "Completed"
            : progress > 0 ? "In progress" : "Not started";

        const lessonText = course.lessonsCount === null
            ? "Lessons"
            : `${course.lessonsCount} lesson${course.lessonsCount === 1 ? "" : "s"}`;

        const videoText = course.videoCount === null
            ? ""
            : `<span><i class="bi bi-play-circle"></i> ${course.videoCount} video${course.videoCount === 1 ? "" : "s"}</span>`;

        const durationText = formatDuration(course.duration);

        return `
            <article class="learn-course-card">
                <div class="learn-course-art ${escapeHTML(course.art)}">
                    <span class="learn-course-icon">
                        <i class="bi ${escapeHTML(course.icon)}"></i>
                    </span>
                    <span class="learn-course-tag">${escapeHTML(course.categoryLabel)}</span>
                </div>

                <div class="learn-course-body">
                    <div class="learn-course-meta">
                        <span><i class="bi bi-journal-text"></i> ${escapeHTML(lessonText)}</span>
                        <span><i class="bi bi-clock"></i> ${escapeHTML(durationText)}</span>
                        ${videoText}
                    </div>

                    <h3>${escapeHTML(course.title)}</h3>
                    <p class="learn-course-description">${escapeHTML(course.description)}</p>

                    <div class="learn-course-progress">
                        <div class="learn-course-progress-label">
                            <span>${escapeHTML(status)}</span>
                            <strong>${progress}%</strong>
                        </div>
                        <div class="learn-progress-track"
                             role="progressbar"
                             aria-label="${escapeHTML(course.title)} progress"
                             aria-valuemin="0"
                             aria-valuemax="100"
                             aria-valuenow="${progress}">
                            <div class="learn-progress-fill" style="width:${progress}%"></div>
                        </div>
                    </div>

                    <div class="learn-course-footer">
                        <span class="learn-level">${escapeHTML(course.level)}</span>
                        <a class="learn-course-link" href="${courseURL}">
                            ${course.completed ? "Review course" : progress > 0 ? "Continue" : "Explore course"}
                            <i class="bi bi-arrow-up-right"></i>
                        </a>
                    </div>
                </div>
            </article>
        `;
    }

    function renderCourses() {
        const filtered = getFilteredCourses();

        elements.loading.hidden = true;
        elements.error.hidden = true;
        elements.grid.hidden = filtered.length === 0;
        elements.empty.hidden = filtered.length !== 0;

        elements.grid.innerHTML = filtered.map(renderCourseCard).join("");
        elements.libraryCount.textContent =
            `${filtered.length} course${filtered.length === 1 ? "" : "s"}`;

        if (state.courses.length === 0) {
            elements.empty.hidden = false;
            elements.grid.hidden = true;
            elements.empty.querySelector("h3").textContent = "No courses available yet";
            elements.empty.querySelector("p").textContent =
                "Learning courses will appear here when they are available.";
        } else {
            elements.empty.querySelector("h3").textContent = "No matching courses";
            elements.empty.querySelector("p").textContent =
                "Try another search term or select a different category.";
        }

        renderContinueCard();
    }

    function renderContinueCard() {
        const course = state.courses.find(
            (item) => !item.completed && item.progress > 0
        );

        if (!course) {
            elements.continueSection.hidden = true;
            elements.continueCard.innerHTML = "";
            return;
        }

        elements.continueSection.hidden = false;
        elements.continueCard.innerHTML = `
            <article class="learn-continue-card">
                <div>
                    <div class="learn-continue-meta">
                        <span><i class="bi bi-journal-bookmark"></i> ${escapeHTML(course.categoryLabel)}</span>
                        <span><i class="bi bi-clock"></i> ${escapeHTML(formatDuration(course.duration))}</span>
                    </div>
                    <h3>${escapeHTML(course.title)}</h3>
                    <p>${escapeHTML(course.description)}</p>
                    <div class="learn-progress-track"
                         role="progressbar"
                         aria-label="Course progress"
                         aria-valuemin="0"
                         aria-valuemax="100"
                         aria-valuenow="${course.progress}">
                        <div class="learn-progress-fill" style="width:${course.progress}%"></div>
                    </div>
                    <div class="learn-continue-progress">
                        <span>${course.progress}% completed</span>
                        <span>${course.lessonsCount === null ? "Course in progress" : `${course.lessonsCount} total lessons`}</span>
                    </div>
                </div>
                <a class="learn-btn learn-btn-primary" href="${getCourseURL(course)}">
                    Continue learning <i class="bi bi-arrow-right"></i>
                </a>
            </article>
        `;
    }

    function showError(error) {
        elements.loading.hidden = true;
        elements.grid.hidden = true;
        elements.empty.hidden = true;
        elements.error.hidden = false;
        elements.libraryCount.textContent = "Unavailable";
        elements.errorMessage.textContent =
            error?.message || "An unexpected error occurred. Please try again.";
    }

    async function loadCourses() {
        if (state.loading) return;

        state.loading = true;
        state.error = null;
        elements.loading.hidden = false;
        elements.grid.hidden = true;
        elements.empty.hidden = true;
        elements.error.hidden = true;
        elements.libraryCount.textContent = "Loading courses…";

        try {
            const [rawCourses, progress] = await Promise.all([
                fetchCourses(),
                fetchProgress()
            ]);

            state.progress = progress;
            state.courses = mergeProgress(rawCourses, progress);

            renderSummary();
            renderCourses();
        } catch (error) {
            console.error("[Learn] Unable to load courses:", error);
            state.error = error;
            showError(error);
        } finally {
            state.loading = false;
        }
    }

    function setCategory(category) {
        state.category = category;

        elements.filters.querySelectorAll("[data-category]").forEach((button) => {
            const active = button.dataset.category === category;
            button.classList.toggle("active", active);
            button.setAttribute("aria-pressed", String(active));
        });

        renderCourses();
    }

    function bindEvents() {
        elements.search.addEventListener("input", () => {
            state.search = elements.search.value;
            renderCourses();
        });

        elements.sort.addEventListener("change", () => {
            state.sort = elements.sort.value;
            renderCourses();
        });

        elements.filters.addEventListener("click", (event) => {
            const button = event.target.closest("[data-category]");
            if (!button) return;
            setCategory(button.dataset.category);
        });

        elements.clearFilters.addEventListener("click", () => {
            elements.search.value = "";
            elements.sort.value = "recommended";
            state.search = "";
            state.sort = "recommended";
            setCategory("all");
        });

        elements.retry.addEventListener("click", loadCourses);

        document.addEventListener("keydown", (event) => {
            const target = event.target;
            const typing = target instanceof HTMLElement &&
                (target.isContentEditable ||
                 ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

            if (event.key === "/" && !typing && !event.ctrlKey && !event.metaKey && !event.altKey) {
                event.preventDefault();
                elements.search.focus();
            }

            if (event.key === "Escape" && document.activeElement === elements.search) {
                elements.search.value = "";
                state.search = "";
                renderCourses();
                elements.search.blur();
            }
        });
    }

    function init() {
        bindEvents();
        loadCourses();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
