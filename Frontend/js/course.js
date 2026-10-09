javascript
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const state = {
    course: null,
    sections: [],
    loading: false
  };

  const CATEGORY_LABELS = {
    flood: "Flood Preparedness",
    earthquake: "Earthquake Safety",
    fire: "Fire Safety",
    wildfire: "Wildfire Safety",
    cyclone: "Cyclone Preparedness",
    tornado: "Tornado Safety",
    landslide: "Landslide Safety",
    drought: "Drought Preparedness",
    tsunami: "Tsunami Safety",
    general: "Disaster Preparedness"
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

  function getCourseSlug() {
    const params = new URLSearchParams(window.location.search);

    return (
      params.get("slug")
      || params.get("course")
      || params.get("id")
      || ""
    ).trim();
  }

  function getApiBase() {
    const config = window.APP_CONFIG || {};
    return String(config.API_BASE_URL || "").replace(/\/+$/, "");
  }

  /*
   * apiFetch() in your existing api.js already returns parsed JSON.
   * Do not call result.json() on its return value.
   */
  async function requestJSON(path) {
    if (typeof window.apiFetch === "function") {
      return await window.apiFetch(path, { method: "GET" });
    }

    // Fallback for pages where api.js did not load.
    const token = localStorage.getItem("token");
    const headers = { Accept: "application/json" };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${getApiBase()}${path}`, {
      method: "GET",
      headers
    });

    const text = await response.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!response.ok) {
      const message = data?.detail || data?.message || `Request failed (${response.status})`;
      throw new Error(
        typeof message === "string" ? message : JSON.stringify(message)
      );
    }

    return data;
  }

  function normalizeCourse(raw) {
    // Your current GET /api/courses/{slug} returns a course object directly.
    const course = raw?.course || raw?.data || raw;

    if (!course || typeof course !== "object" || Array.isArray(course)) {
      throw new Error("The server returned an unexpected course response.");
    }

    const totalSections = Math.max(
      0,
      Number(course.total_sections || 0)
    );

    const viewedSections = Array.isArray(course.viewed_sections)
      ? course.viewed_sections
      : [];

    let progress = Number(course.progress || 0);

    if (!Number.isFinite(progress)) {
      progress = 0;
    }

    progress = Math.max(0, Math.min(100, progress));

    return {
      id: course.id ?? "",
      slug: String(course.slug || getCourseSlug()),
      title: course.title || "Untitled course",
      description: course.description || "",
      category: course.disaster_type || course.category || "general",
      totalSections,
      viewedSections,
      progress,
      completed: Boolean(course.completed)
    };
  }

  function categoryLabel(category) {
    const key = String(category || "general")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_");

    return CATEGORY_LABELS[key]
      || String(category || "Disaster Preparedness")
        .replace(/[_-]+/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function formatDuration(minutes) {
    const value = Number(minutes);

    if (!Number.isFinite(value) || value <= 0) {
      return "Duration not specified";
    }

    if (value < 60) {
      return `${value} minutes`;
    }

    const hours = Math.floor(value / 60);
    const remaining = value % 60;

    return remaining
      ? `${hours} hr ${remaining} min`
      : `${hours} hr`;
  }

  function showLoading() {
    $("courseLoading").hidden = false;
    $("courseError").hidden = true;
    $("courseContent").hidden = true;
  }

  function showError(message) {
    $("courseLoading").hidden = true;
    $("courseContent").hidden = true;
    $("courseError").hidden = false;
    $("courseErrorMessage").textContent = message;
  }

  function renderObjectives() {
    const container = $("courseObjectives");

    container.innerHTML = `
      <li class="mb-2">Understand ${escapeHTML(state.course.title)}.</li>
      <li class="mb-2">Review the available course sections.</li>
      <li class="mb-2">Track your learning progress as you study.</li>
    `;
  }

  function renderSections() {
    const container = $("lessonList");
    const course = state.course;

    /*
     * The current backend response includes total_sections and viewed_sections,
     * but does not include section titles or section content.
     *
     * Do not fabricate lesson titles or links. Show a clear explanation until
     * the backend provides actual section metadata.
     */
    if (!course.totalSections) {
      container.innerHTML = `
        <div class="course-state">
          <i class="bi bi-journal-text" aria-hidden="true"></i>
          <strong>No course sections are configured yet.</strong>
          <p class="mb-0 mt-2">
            This course exists, but its section count is zero. Add course
            sections in the backend before starting lessons.
          </p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="course-state">
        <i class="bi bi-journal-check" aria-hidden="true"></i>
        <strong>${course.totalSections} course sections configured</strong>
        <p class="mb-0 mt-2">
          Your backend currently returns section counts and viewed-section
          progress, but not the section titles or lesson content. The syllabus
          will appear here once those details are exposed by the API.
        </p>
      </div>
    `;
  }

  function renderCourse() {
    const course = state.course;

    $("courseCategory").textContent = categoryLabel(course.category);
    $("courseTitle").textContent = course.title;
    $("courseDescription").textContent = course.description
      || "Explore this disaster-preparedness course and track your learning progress.";

    $("courseDuration").textContent = formatDuration(0);
    $("courseLevel").textContent = "All levels";
    $("courseLessonCount").textContent =
      `${course.totalSections} ${course.totalSections === 1 ? "section" : "sections"}`;

    $("courseProgressPercent").textContent = `${course.progress}%`;

    const viewedCount = course.viewedSections.length;
    const total = course.totalSections;

    $("courseCompletedLessons").textContent = viewedCount;
    $("courseRemainingLessons").textContent = Math.max(0, total - viewedCount);

    // The current API does not return quiz counts.
    $("courseQuizCount").textContent = "—";

    $("courseProgressFill").style.width = `${course.progress}%`;
    $("courseProgressBar").setAttribute(
      "aria-valuenow",
      String(course.progress)
    );

    renderObjectives();
    renderSections();

    const resumeButton = $("resumeCourse");

    /*
     * There is currently no section-detail route in the supplied courses.py.
     * Avoid linking users to a lesson page that the backend cannot populate.
     */
    resumeButton.href = "#courseLessons";
    resumeButton.innerHTML = course.completed
      ? '<i class="bi bi-check-circle" aria-hidden="true"></i> Course completed'
      : '<i class="bi bi-journal-text" aria-hidden="true"></i> View course sections';

    $("courseLoading").hidden = true;
    $("courseError").hidden = true;
    $("courseContent").hidden = false;
  }

  async function fetchCourse() {
    if (state.loading) return;

    const slug = getCourseSlug();

    if (!slug) {
      showError(
        "The course URL is missing its slug. Return to the course library and select a course."
      );
      return;
    }

    state.loading = true;
    showLoading();

    try {
      const path = `/api/courses/${encodeURIComponent(slug)}`;
      const response = await requestJSON(path);

      if (!response) {
        throw new Error("The server returned an empty response.");
      }

      state.course = normalizeCourse(response);
      renderCourse();
    } catch (error) {
      console.error("Failed to load course:", error);

      const message = error?.status === 404
        ? "This course was not found. Check that the course slug exists in your database."
        : error?.status === 401
          ? "Your session has expired. Please sign in again."
          : error?.message || "An unexpected error occurred while loading the course.";

      showError(message);
    } finally {
      state.loading = false;
    }
  }

  function init() {
    const retryButton = $("retryCourse");

    if (retryButton) {
      retryButton.addEventListener("click", fetchCourse);
    }

    fetchCourse();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
