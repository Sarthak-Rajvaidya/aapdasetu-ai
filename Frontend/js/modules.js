
/* AapdaSetu AI — Learn Course Library */
(() => {
    "use strict";

    const $ = (selector) => document.querySelector(selector);

    const el = {
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

    const state = {
        courses: [],
        category: "all",
        search: "",
        sort: "recommended",
        loading: false
    };

    const META = {
        earthquake: {
            category: "natural-disasters",
            label: "Natural disaster",
            icon: "bi-activity",
            art: "art-general"
        },
        flood: {
            category: "natural-disasters",
            label: "Natural disaster",
            icon: "bi-water",
            art: "art-flood"
        },
        cyclone: {
            category: "natural-disasters",
            label: "Natural disaster",
            icon: "bi-wind",
            art: "art-cyclone"
        },
        tornado: {
            category: "natural-disasters",
            label: "Natural disaster",
            icon: "bi-cloud-lightning",
            art: "art-cyclone"
        },
        wildfire: {
            category: "natural-disasters",
            label: "Natural disaster",
            icon: "bi-fire",
            art: "art-fire"
        }
    };

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, (c) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[c]);
    }

    function safeProgress(value) {
        const n = Number(value ?? 0);
        return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
    }

    function durationText(minutes) {
        const n = Number(minutes);
        if (!Number.isFinite(n) || n <= 0) return "Self-paced";
        if (n < 60) return `${n} min`;
        const hours = Math.floor(n / 60);
        const remaining = n % 60;
        return remaining ? `${hours} hr ${remaining} min` : `${hours} hr`;
    }

    async function requestJSON(path) {
        if (typeof window.apiFetch === "function") {
            return await window.apiFetch(path, { method: "GET" });
        }

        const config = window.APP_CONFIG || {};
        const base = String(config.API_BASE_URL || "").replace(/\/+$/, "");
        const token = localStorage.getItem("token");
        const headers = { Accept: "application/json" };

        if (token) headers.Authorization = `Bearer ${token}`;

        const response = await fetch(`${base}${path}`, {
            headers,
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
            throw new Error(
                typeof message === "string" ? message : JSON.stringify(message)
            );
        }

        return data;
    }

    function normalizeList(data) {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.courses)) return data.courses;
        if (Array.isArray(data?.items)) return data.items;
        if (Array.isArray(data?.data)) return data.data;
        return [];
    }

    function normalizeCourse(raw) {
        const slug = String(raw.slug || raw.course_slug || "").trim();
        if (!slug) return null;

        const key = slug.toLowerCase();
        const meta = META[key] || {};
        const progress = safeProgress(raw.progress);

        return {
            slug,
            title: String(raw.title || slug),
            description: String(
                raw.description ||
                "Learn practical steps to prepare for this disaster."
            ),
            category: meta.category || "general-safety",
            categoryLabel: meta.label || "Preparedness",
            icon: meta.icon || "bi-shield-check",
            art: meta.art || "art-general",
            duration: Number(raw.duration_minutes) || null,
            lessonsCount: Number(raw.lessons_count ?? raw.total_sections ?? 0),
            progress,
            completed: raw.completed === true || progress >= 100
        };
    }

    function categoryMatches(course) {
        return state.category === "all" ||
            course.category === state.category;
    }

    function getFilteredCourses() {
        const query = state.search.trim().toLowerCase();

        const list = state.courses.filter(course => {
            const matchesSearch = !query || [
                course.title,
                course.description,
                course.slug,
                course.categoryLabel
            ].join(" ").toLowerCase().includes(query);

            return categoryMatches(course) && matchesSearch;
        });

        if (state.sort === "title") {
            list.sort((a, b) => a.title.localeCompare(b.title));
        } else if (state.sort === "duration") {
            list.sort((a, b) =>
                (a.duration ?? Infinity) - (b.duration ?? Infinity)
            );
        } else if (state.sort === "progress") {
            list.sort((a, b) => b.progress - a.progress);
        } else {
            list.sort((a, b) => {
                const rank = c => c.completed ? 2 : c.progress > 0 ? 0 : 1;
                return rank(a) - rank(b) || a.title.localeCompare(b.title);
            });
        }

        return list;
    }

    function renderSummary() {
        if (el.courseCount) {
            el.courseCount.textContent = String(state.courses.length);
        }
        if (el.completedCount) {
            el.completedCount.textContent = String(
                state.courses.filter(c => c.completed).length
            );
        }
        if (el.inProgressCount) {
            el.inProgressCount.textContent = String(
                state.courses.filter(c => !c.completed && c.progress > 0).length
            );
        }
    }

    function renderCard(course) {
        const status = course.completed
            ? "Completed"
            : course.progress > 0 ? "In progress" : "Not started";

        const action = course.completed
            ? "Review course"
            : course.progress > 0 ? "Continue" : "Explore course";

        return `
            <article class="learn-course-card">
                <div class="learn-course-art ${escapeHTML(course.art)}">
                    <span class="learn-course-icon">
                        <i class="bi ${escapeHTML(course.icon)}"></i>
                    </span>
                    <span class="learn-course-tag">
                        ${escapeHTML(course.categoryLabel)}
                    </span>
                </div>

                <div class="learn-course-body">
                    <div class="learn-course-meta">
                        <span>
                            <i class="bi bi-journal-text"></i>
                            ${course.lessonsCount} lessons
                        </span>
                        <span>
                            <i class="bi bi-clock"></i>
                            ${escapeHTML(durationText(course.duration))}
                        </span>
                    </div>

                    <h3>${escapeHTML(course.title)}</h3>
                    <p class="learn-course-description">
                        ${escapeHTML(course.description)}
                    </p>

                    <div class="learn-course-progress">
                        <div class="learn-course-progress-label">
                            <span>${status}</span>
                            <strong>${course.progress}%</strong>
                        </div>
                        <div class="learn-progress-track"
                             role="progressbar"
                             aria-label="${escapeHTML(course.title)} progress"
                             aria-valuemin="0"
                             aria-valuemax="100"
                             aria-valuenow="${course.progress}">
                            <div class="learn-progress-fill"
                                 style="width:${course.progress}%"></div>
                        </div>
                    </div>

                    <div class="learn-course-footer">
                        <span class="learn-level">Self-paced</span>
                        <a class="learn-course-link"
                           href="course.html?slug=${encodeURIComponent(course.slug)}">
                            ${action}
                            <i class="bi bi-arrow-up-right"></i>
                        </a>
                    </div>
                </div>
            </article>
        `;
    }

    function renderContinue() {
        if (!el.continueSection || !el.continueCard) return;

        const course = state.courses.find(
            c => !c.completed && c.progress > 0
        );

        if (!course) {
            el.continueSection.hidden = true;
            el.continueCard.innerHTML = "";
            return;
        }

        el.continueSection.hidden = false;
        el.continueCard.innerHTML = `
            <article class="learn-continue-card">
                <div>
                    <div class="learn-continue-meta">
                        <span>${escapeHTML(course.categoryLabel)}</span>
                        <span>${course.progress}% complete</span>
                    </div>
                    <h3>${escapeHTML(course.title)}</h3>
                    <p>${escapeHTML(course.description)}</p>
                    <div class="learn-progress-track"
                         role="progressbar"
                         aria-valuemin="0"
                         aria-valuemax="100"
                         aria-valuenow="${course.progress}">
                        <div class="learn-progress-fill"
                             style="width:${course.progress}%"></div>
                    </div>
                </div>
                <a class="learn-btn learn-btn-primary"
                   href="course.html?slug=${encodeURIComponent(course.slug)}">
                    Continue learning <i class="bi bi-arrow-right"></i>
                </a>
            </article>
        `;
    }

    function renderCourses() {
        if (!el.grid || !el.loading || !el.empty) return;

        const filtered = getFilteredCourses();
        el.loading.hidden = true;
        if (el.error) el.error.hidden = true;

        el.grid.innerHTML = filtered.map(renderCard).join("");
        el.grid.hidden = filtered.length === 0;
        el.empty.hidden = filtered.length !== 0;

        if (el.libraryCount) {
            el.libraryCount.textContent =
                `${filtered.length} course${filtered.length === 1 ? "" : "s"}`;
        }

        const heading = el.empty?.querySelector("h3");
        const paragraph = el.empty?.querySelector("p");

        if (heading && paragraph) {
            if (state.courses.length === 0) {
                heading.textContent = "No courses available yet";
                paragraph.textContent =
                    "Add course records to your database to display courses here.";
            } else {
                heading.textContent = "No matching courses";
                paragraph.textContent =
                    "Try another search term or select a different category.";
            }
        }

        renderContinue();
    }

    function showError(error) {
        if (el.loading) el.loading.hidden = true;
        if (el.grid) el.grid.hidden = true;
        if (el.empty) el.empty.hidden = true;
        if (el.error) el.error.hidden = false;

        if (el.errorMessage) {
            el.errorMessage.textContent =
                error?.message || "Unable to load courses.";
        }
        if (el.libraryCount) el.libraryCount.textContent = "Unavailable";
    }

    async function loadCourses() {
        if (state.loading) return;
        state.loading = true;

        if (el.loading) el.loading.hidden = false;
        if (el.grid) el.grid.hidden = true;
        if (el.empty) el.empty.hidden = true;
        if (el.error) el.error.hidden = true;
        if (el.libraryCount) el.libraryCount.textContent = "Loading courses…";

        try {
            const data = await requestJSON("/api/courses");
            state.courses = normalizeList(data).map(normalizeCourse).filter(Boolean);

            renderSummary();
            renderCourses();
        } catch (error) {
            console.error("[AapdaSetu Learn] Course loading failed:", error);
            showError(error);
        } finally {
            state.loading = false;
        }
    }

    function bindEvents() {
        el.search?.addEventListener("input", () => {
            state.search = el.search.value;
            renderCourses();
        });

        el.sort?.addEventListener("change", () => {
            state.sort = el.sort.value;
            renderCourses();
        });

        el.filters?.addEventListener("click", event => {
            const button = event.target.closest("[data-category]");
            if (!button) return;

            state.category = button.dataset.category;

            el.filters.querySelectorAll("[data-category]").forEach(item => {
                const active = item === button;
                item.classList.toggle("active", active);
                item.setAttribute("aria-pressed", String(active));
            });

            renderCourses();
        });

        el.clearFilters?.addEventListener("click", () => {
            if (el.search) el.search.value = "";
            if (el.sort) el.sort.value = "recommended";
            state.search = "";
            state.sort = "recommended";
            state.category = "all";

            el.filters?.querySelectorAll("[data-category]").forEach(item => {
                const active = item.dataset.category === "all";
                item.classList.toggle("active", active);
                item.setAttribute("aria-pressed", String(active));
            });

            renderCourses();
        });

        el.retry?.addEventListener("click", loadCourses);

        document.addEventListener("keydown", event => {
            const target = event.target;
            const typing = target instanceof HTMLElement &&
                (target.isContentEditable ||
                 ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

            if (event.key === "/" && !typing) {
                event.preventDefault();
                el.search?.focus();
            }

            if (event.key === "Escape" && document.activeElement === el.search) {
                el.search.value = "";
                state.search = "";
                renderCourses();
                el.search.blur();
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
