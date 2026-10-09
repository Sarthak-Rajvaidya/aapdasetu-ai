javascript
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const state = {
    course: null,
    lessons: [],
    progress: 0,
    completedLessonIds: new Set(),
    completedLessonSlugs: new Set(),
    completedLessonIndexes: new Set(),
    activeLesson: null
  };

  const CATEGORY_LABELS = {
    flood: "Flood Preparedness",
    earthquake: "Earthquake Safety",
    fire: "Fire Safety",
    cyclone: "Cyclone Preparedness",
    landslide: "Landslide Safety",
    drought: "Drought Preparedness",
    tsunami: "Tsunami Safety",
    first_aid: "First Aid",
    emergency: "Emergency Response",
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

  async function requestJSON(path) {
    const headers = { Accept: "application/json" };
    const token = getToken();

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    // Prefer the existing API client if it exposes a compatible GET helper.
    if (typeof window.apiFetch === "function") {
      const result = await window.apiFetch(path, { method: "GET", headers });
      if (result && typeof result.json === "function") {
        if (!result.ok) throw new Error(`Request failed (${result.status})`);
        return result.json();
      }
      if (result !== undefined && result !== null) return result;
    }

    if (typeof window.apiRequest === "function") {
      const result = await window.apiRequest(path, {
        method: "GET",
        headers
      });
      if (result !== undefined && result !== null) return result;
    }

    const response = await fetch(`${getApiBase()}${path}`, {
      method: "GET",
      headers,
      credentials: "include"
    });

    if (!response.ok) {
      const message = await response.text().catch(() => "");
      throw new Error(message || `Request failed (${response.status})`);
    }

    if (response.status === 204) return null;
    return response.json();
  }

  function unwrapObject(value) {
    let current = value;

    for (let i = 0; i < 3; i += 1) {
      if (!current || typeof current !== "object" || Array.isArray(current)) {
        break;
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

  function getCourseSlug() {
    const params = new URLSearchParams(window.location.search);
    return (
      params.get("slug")
      || params.get("course")
      || params.get("id")
      || ""
    ).trim();
  }

  function getCourseIdentifier(course) {
    return String(
      course.slug
      || course.course_slug
      || course.id
      || course.course_id
      || ""
    );
  }

  function normalizeLesson(lesson, index) {
    const rawId = lesson.id ?? lesson.lesson_id ?? lesson.slug ?? index + 1;
    const rawSlug = lesson.slug ?? lesson.lesson_slug ?? "";

    return {
      id: String(rawId),
      slug: String(rawSlug),
      title: lesson.title || lesson.name || lesson.lesson_title || `Lesson ${index + 1}`,
      description: lesson.description || lesson.summary || lesson.objective || "",
      order: Number(lesson.order ?? lesson.sequence ?? lesson.position ?? index + 1),
      duration: Number(lesson.duration_minutes ?? lesson.duration ?? 0),
      videoUrl: lesson.video_url || lesson.videoUrl || lesson.video || "",
      completed: Boolean(
        lesson.is_completed
        ?? lesson.completed
        ?? lesson.completion_status
        ?? false
      ),
      raw: lesson
    };
  }

  function normalizeCourse(raw) {
    const course = unwrapObject(raw);

    const lessonList = unwrapList(
      course.lessons || course.modules || course.units || [],
      ["lessons", "items", "results"]
    );

    const rawProgress = Number(
      course.progress_percent
      ?? course.progress_percentage
      ?? course.completion_percentage
      ?? course.progress
      ?? 0
    );

    const objectives = Array.isArray(course.objectives)
      ? course.objectives
      : Array.isArray(course.learning_objectives)
        ? course.learning_objectives
        : [];

    return {
      id: String(course.id ?? course.course_id ?? ""),
      slug: getCourseIdentifier(course) || getCourseSlug(),
      title: course.title || course.name || course.course_name || "Untitled course",
      description: course.description || course.summary || course.overview || "",
      category: course.category || course.topic || course.disaster_type || "general",
      level: course.level || course.difficulty || "All levels",
      duration: Number(
        course.duration_minutes
        ?? course.estimated_minutes
        ?? course.duration
        ?? 0
      ),
      lessons: lessonList.map(normalizeLesson),
      objectives,
      progress: Math.max(0, Math.min(100, rawProgress)),
      raw: course
    };
  }

  function isLessonCompleted(lesson, index) {
    return lesson.completed
      || state.completedLessonIds.has(lesson.id)
      || (lesson.slug && state.completedLessonSlugs.has(lesson.slug))
      || state.completedLessonIndexes.has(index);
  }

  function lessonURL(lesson) {
    const params = new URLSearchParams();

    params.set("course", state.course.slug);

    if (lesson.slug) {
      params.set("lesson", lesson.slug);
    } else {
      params.set("lesson_id", lesson.id);
    }

    return `lesson.html?${params.toString()}`;
  }

  function getCategoryLabel(category) {
    const key = String(category || "general").toLowerCase().replace(/\s+/g, "_");
    return CATEGORY_LABELS[key]
      || String(category || "Disaster Preparedness")
          .replace(/[_-]+/g, " ")
          .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function formatDuration(minutes) {
    if (!minutes || minutes < 1) return "Duration varies";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    return remaining ? `${hours} hr ${remaining} min` : `${hours} hr`;
  }

  function showError(message) {
    $("courseLoading").hidden = true;
    $("courseContent").hidden = true;
    $("courseError").hidden = false;
    $("courseErrorMessage").textContent = message;
  }

  function renderObjectives(objectives) {
    const container = $("courseObjectives");

    if (!objectives.length) {
      container.innerHTML = "<li>Review the lesson objectives and key takeaways as you learn.</li>";
      return;
    }

    container.innerHTML = objectives
      .map((item) => {
        const text = typeof item === "string"
          ? item
          : item.title || item.text || item.description || "";

        return text ? `<li class="mb-2">${escapeHTML(text)}</li>` : "";
      })
      .join("");
  }

  function renderLessons() {
    const container = $("lessonList");

    if (!state.lessons.length) {
      container.innerHTML = `
        <div class="course-state">
          <i class="bi bi-journal-text" aria-hidden="true"></i>
          <strong>No lessons are available yet.</strong>
          <p class="mb-0 mt-2">Please check back when lessons have been added to this course.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = state.lessons.map((lesson, index) => {
      const completed = isLessonCompleted(lesson, index);
      const action = completed ? "Review lesson" : "Open lesson";
      const icon = completed ? "bi-check-circle-fill" : "bi-arrow-up-right";
      const duration = lesson.duration ? `${lesson.duration} min` : "Lesson";

      return `
        <article class="lesson-item">
          <div class="lesson-number" aria-label="Lesson ${index + 1}">
            ${completed
              ? '<i class="bi bi-check-lg" aria-hidden="true"></i>'
              : index + 1}
          </div>

          <div class="lesson-copy">
            <h3 class="lesson-title">${escapeHTML(lesson.title)}</h3>
            <p class="lesson-description">
              ${escapeHTML(lesson.description || duration)}
              ${lesson.description && lesson.duration ? ` · ${escapeHTML(duration)}` : ""}
              ${completed ? " · Completed" : ""}
            </p>
          </div>

          <a class="lesson-action"
             href="${escapeHTML(lessonURL(lesson))}"
             aria-label="${escapeHTML(action)}: ${escapeHTML(lesson.title)}">
            ${escapeHTML(action)}
            <i class="bi ${icon}" aria-hidden="true"></i>
          </a>
        </article>
      `;
    }).join("");
  }

  function renderCourse() {
    const course = state.course;
    const lessons = state.lessons;
    const completedCount = lessons.filter(isLessonCompleted).length;
    const totalCount = lessons.length;

    // Prefer the lesson-level completion records when available.
    if (totalCount > 0) {
      state.progress = Math.round((completedCount / totalCount) * 100);
    } else {
      state.progress = course.progress;
    }

    $("courseCategory").textContent = getCategoryLabel(course.category);
    $("courseTitle").textContent = course.title;
    $("courseDescription").textContent =
      course.description || "Explore the lessons in this course to build your preparedness skills.";

    $("courseDuration").textContent = formatDuration(course.duration);
    $("courseLevel").textContent = course.level;
    $("courseLessonCount").textContent =
      `${totalCount} ${totalCount === 1 ? "lesson" : "lessons"}`;

    $("courseProgressPercent").textContent = `${state.progress}%`;
    $("courseCompletedLessons").textContent = completedCount;
    $("courseRemainingLessons").textContent = Math.max(0, totalCount - completedCount);

    const quizCount = lessons.reduce((sum, lesson) => {
      const quizzes = lesson.raw.quizzes || lesson.raw.quiz || lesson.raw.questions;
      if (Array.isArray(quizzes)) return sum + (quizzes.length ? 1 : 0);
      return sum + (quizzes ? 1 : 0);
    }, 0);

    $("courseQuizCount").textContent = quizCount || "—";

    $("courseProgressFill").style.width = `${state.progress}%`;
    $("courseProgressBar").setAttribute("aria-valuenow", String(state.progress));

    renderObjectives(course.objectives);
    renderLessons();

    const nextIndex = lessons.findIndex((lesson, index) => !isLessonCompleted(lesson, index));
    const resumeLink = $("resumeCourse");

    if (nextIndex >= 0) {
      resumeLink.href = lessonURL(lessons[nextIndex]);
      resumeLink.innerHTML =
        '<i class="bi bi-play-fill" aria-hidden="true"></i> Continue learning';
    } else if (totalCount > 0) {
      resumeLink.href = lessonURL(lessons[0]);
      resumeLink.innerHTML =
        '<i class="bi bi-arrow-repeat" aria-hidden="true"></i> Review course';
    } else {
      resumeLink.href = "#courseLessons";
      resumeLink.innerHTML =
        '<i class="bi bi-journal-text" aria-hidden="true"></i> View syllabus';
    }

    $("courseLoading").hidden = true;
    $("courseError").hidden = true;
    $("courseContent").hidden = false;
  }

  async function fetchCourse() {
    const identifier = getCourseSlug();

    if (!identifier) {
      showError("The course link is missing its identifier. Return to the course library and select a course.");
      return;
    }

    $("courseLoading").hidden = false;
    $("courseError").hidden = true;
    $("courseContent").hidden = true;

    const encoded = encodeURIComponent(identifier);

    try {
      let courseResponse;
      let lastError;

      // These routes are common REST conventions. Keep the route that matches
      // your backend once its actual endpoint contract is confirmed.
      const coursePaths = [
        `/api/courses/${encoded}`,
        `/api/courses/slug/${encoded}`
      ];

      for (const path of coursePaths) {
        try {
          courseResponse = await requestJSON(path);
          if (courseResponse) break;
        } catch (error) {
          lastError = error;
        }
      }

      if (!courseResponse) {
        throw lastError || new Error("Course data was not returned by the API.");
      }

      state.course = normalizeCourse(courseResponse);
      state.lessons = state.course.lessons;

      // If the detail endpoint doesn't include lessons, try a dedicated
      // lesson endpoint. Confirm the actual route with the backend.
      if (!state.lessons.length) {
        const lessonPaths = [
          `/api/courses/${encoded}/lessons`,
          `/api/lessons?course_slug=${encoded}`
        ];

        for (const path of lessonPaths) {
          try {
            const response = await requestJSON(path);
            const items = unwrapList(response, ["lessons", "items", "results"]);
            if (items.length) {
              state.lessons = items.map(normalizeLesson);
              break;
            }
          } catch {
            // The detail endpoint may already be the source of lesson data.
          }
        }
      }

      // Merge dashboard progress if the API exposes course_progress.
      // Failure here should not prevent the course page from loading.
      try {
        const dashboard = await requestJSON("/api/dashboard");
        const data = unwrapObject(dashboard);
        const progressItems = unwrapList(
          data.course_progress || data.courses_progress || [],
          ["course_progress", "items", "results"]
        );

        const match = progressItems.find((item) => {
          const itemSlug = String(item.course_slug || item.slug || "");
          const itemId = String(item.course_id || item.id || "");
          return itemSlug === state.course.slug
            || (state.course.id && itemId === state.course.id);
        });

        if (match) {
          const completed = match.completed_lessons
            || match.completed_lesson_ids
            || match.lessons_completed;

          if (Array.isArray(completed)) {
            completed.forEach((id) => state.completedLessonIds.add(String(id)));
          }

          const completedSlugs = match.completed_lesson_slugs;
          if (Array.isArray(completedSlugs)) {
            completedSlugs.forEach((slug) => state.completedLessonSlugs.add(String(slug)));
          }

          const progress = Number(
            match.progress_percent ?? match.progress ?? match.completion_percentage
          );

          if (Number.isFinite(progress)) {
            state.course.progress = Math.max(0, Math.min(100, progress));
          }
        }
      } catch {
        // Dashboard progress is optional; course detail remains usable.
      }

      renderCourse();
    } catch (error) {
      console.error("Course page load failed:", error);
      showError(
        "We couldn't load this course from the server. Check your connection and API route, then try again."
      );
    }
  }

  function init() {
    $("retryCourse").addEventListener("click", fetchCourse);
    fetchCourse();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
