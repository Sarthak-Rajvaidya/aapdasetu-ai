javascript
(() => {
  "use strict";

  console.info("[AapdaSetu Learn] course.js loaded");

  const $ = (id) => document.getElementById(id);

  const state = {
    loading: false,
    requestId: 0
  };

  function setText(id, value) {
    const element = $(id);
    if (element) element.textContent = String(value ?? "");
  }

  function setHidden(id, hidden) {
    const element = $(id);
    if (element) element.hidden = hidden;
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      };

      return entities[character];
    });
  }

  function getSlug() {
    const params = new URLSearchParams(window.location.search);

    return (
      params.get("slug") ||
      params.get("course") ||
      params.get("id") ||
      ""
    ).trim();
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
    setHidden("courseError", true);
    setHidden("courseContent", true);
  }

  function normalizeCourse(data) {
    const course = data?.course ?? data?.data ?? data;

    if (
      !course ||
      typeof course !== "object" ||
      Array.isArray(course)
    ) {
      throw new Error("The API returned an invalid course response.");
    }

    const progressNumber = Number(course.progress ?? 0);
    const totalNumber = Number(course.total_sections ?? 0);

    return {
      id: course.id ?? "",
      slug: String(course.slug || getSlug()),
      title: String(course.title || "Untitled course"),
      description: String(course.description || ""),
      category: String(
        course.disaster_type || course.category || "general"
      ),
      totalSections: Number.isFinite(totalNumber)
        ? Math.max(0, totalNumber)
        : 0,
      viewedSections: Array.isArray(course.viewed_sections)
        ? course.viewed_sections
        : [],
      progress: Number.isFinite(progressNumber)
        ? Math.max(0, Math.min(100, progressNumber))
        : 0,
      completed: Boolean(course.completed)
    };
  }

  function categoryLabel(category) {
    const labels = {
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

    const key = String(category || "general").toLowerCase().trim();

    return labels[key] ||
      key.replace(/[_-]+/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }

  async function requestCourse(slug) {
    const path = `/api/courses/${encodeURIComponent(slug)}`;

    console.info("[AapdaSetu Learn] Requesting:", path);
    console.info("[AapdaSetu Learn] apiFetch available:", typeof window.apiFetch);

    // Prefer the application's shared API client.
    if (typeof window.apiFetch === "function") {
      return window.apiFetch(path, { method: "GET" });
    }

    // Fallback if api.js failed to expose the helper.
    const config = window.APP_CONFIG || {};
    const baseURL = String(config.API_BASE_URL || "").replace(/\/+$/, "");
    const token = localStorage.getItem("token");

    const headers = { Accept: "application/json" };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(`${baseURL}${path}`, {
        method: "GET",
        headers,
        signal: controller.signal
      });

      const responseText = await response.text();
      let data;

      try {
        data = responseText ? JSON.parse(responseText) : null;
      } catch {
        data = responseText;
      }

      console.info("[AapdaSetu Learn] HTTP status:", response.status);

      if (!response.ok) {
        const detail = data && typeof data === "object"
          ? data.detail || data.message
          : null;

        const error = new Error(
          typeof detail === "string"
            ? detail
            : `Course request failed (HTTP ${response.status}).`
        );

        error.status = response.status;
        throw error;
      }

      return data;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function renderObjectives(course) {
    const element = $("courseObjectives");
    if (!element) return;

    element.innerHTML = `
      <li class="mb-2">Understand ${escapeHTML(course.title)}.</li>
      <li class="mb-2">Review the course sections and safety guidance.</li>
      <li class="mb-2">Track your progress through the course.</li>
    `;
  }

  function renderSections(course) {
    const container = $("lessonList");
    if (!container) {
      throw new Error(
        'The HTML is missing the element with id="lessonList".'
      );
    }

    if (course.totalSections === 0) {
      container.innerHTML = `
        <div class="course-state">
          <i class="bi bi-journal-text" aria-hidden="true"></i>
          <strong>No sections are configured for this course yet.</strong>
          <p class="mb-0 mt-2">
            The course was loaded successfully, but the backend reports
            zero sections. Course section content must be added in the backend.
          </p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="course-state">
        <i class="bi bi-journal-check" aria-hidden="true"></i>
        <strong>${course.totalSections} sections configured</strong>
        <p class="mb-0 mt-2">
          Your current API provides the section count and viewed-section
          progress, but not section titles or lesson content yet.
        </p>
      </div>
    `;
  }

  function renderCourse(course) {
    const requiredIds = [
      "courseCategory",
      "courseTitle",
      "courseDescription",
      "courseDuration",
      "courseLevel",
      "courseLessonCount",
      "courseProgressPercent",
      "courseCompletedLessons",
      "courseRemainingLessons",
      "courseQuizCount",
      "courseProgressFill",
      "courseProgressBar",
      "resumeCourse"
    ];

    const missingIds = requiredIds.filter((id) => !$(id));

    if (missingIds.length) {
      throw new Error(
        "Missing HTML elements: " + missingIds.join(", ")
      );
    }

    setText("courseCategory", categoryLabel(course.category));
    setText("courseTitle", course.title);
    setText(
      "courseDescription",
      course.description ||
        "Explore this disaster-preparedness course and track your learning progress."
    );
    setText("courseDuration", "Duration not specified");
    setText("courseLevel", "All levels");
    setText(
      "courseLessonCount",
      `${course.totalSections} ${
        course.totalSections === 1 ? "section" : "sections"
      }`
    );

    setText("courseProgressPercent", `${course.progress}%`);
    setText("courseCompletedLessons", course.viewedSections.length);
    setText(
      "courseRemainingLessons",
      Math.max(0, course.totalSections - course.viewedSections.length)
    );
    setText("courseQuizCount", "—");

    $("courseProgressFill").style.width = `${course.progress}%`;
    $("courseProgressBar").setAttribute(
      "aria-valuenow",
      String(course.progress)
    );

    renderObjectives(course);
    renderSections(course);

    const resumeButton = $("resumeCourse");
    resumeButton.href = "#courseLessons";
    resumeButton.innerHTML = course.completed
      ? '<i class="bi bi-check-circle" aria-hidden="true"></i> Course completed'
      : '<i class="bi bi-journal-text" aria-hidden="true"></i> View course sections';

    setHidden("courseLoading", true);
    setHidden("courseError", true);
    setHidden("courseContent", false);

    console.info("[AapdaSetu Learn] Course rendered:", course.slug);
  }

  async function loadCourse() {
    if (state.loading) return;

    const slug = getSlug();

    if (!slug) {
      showError(
        "The URL is missing a course slug. Open Learn and select a course again."
      );
      return;
    }

    state.loading = true;
    const requestId = ++state.requestId;

    showLoading();

    // A visible timeout message prevents a permanent loading screen.
    const loadingTimeout = window.setTimeout(() => {
      if (state.loading && requestId === state.requestId) {
        showError(
          "The course request is taking too long. Check that FastAPI is running, the API URL is correct, and your session is valid."
        );
      }
    }, 18000);

    try {
      const data = await requestCourse(slug);

      if (requestId !== state.requestId) return;

      if (!data) {
        throw new Error("The server returned an empty response.");
      }

      const course = normalizeCourse(data);
      renderCourse(course);
    } catch (error) {
      if (requestId !== state.requestId) return;

      console.error("[AapdaSetu Learn] Course loading failed:", error);

      let message = error.message || "Unable to load course details.";

      if (error.name === "AbortError") {
        message = "The course request timed out. Check that the backend is running.";
      } else if (error.status === 401) {
        message = "Your session has expired. Sign in again, then reopen this course.";
      } else if (error.status === 403) {
        message = "You do not have permission to view this course.";
      } else if (error.status === 404) {
        message = `Course "${slug}" was not found. Check the course slug in your database.`;
      } else if (error.status === 0) {
        message = "Cannot connect to the backend. Check your API URL and server status.";
      }

      showError(message);
    } finally {
      window.clearTimeout(loadingTimeout);
      if (requestId === state.requestId) {
        state.loading = false;
      }
    }
  }

  function init() {
    const retryButton = $("retryCourse");

    if (retryButton) {
      retryButton.addEventListener("click", loadCourse);
    }

    // Ensure required containers exist before starting the request.
    if (!$("courseLoading") || !$("courseContent") || !$("courseError")) {
      console.error(
        "[AapdaSetu Learn] Required loading/content/error elements are missing. Check course.html."
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
