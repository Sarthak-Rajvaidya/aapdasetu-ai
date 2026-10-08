/**
 * Generic, reusable course-progress tracker.
 * Each course page calls `initCourseProgress("earthquake", 7)` once on load,
 * where 7 is the number of `.section-card` elements (`id="section1..N"`)
 * on the page. As the learner scrolls through sections, progress is
 * computed as (sections viewed / total sections) * 100 and persisted via
 * POST /api/courses/{slug}/progress — identified by the authenticated user's
 * JWT, never a client-supplied user id.
 *
 * `markCompleted()` (bound to the existing "Mark as Completed" button on
 * every course page) force-completes the course to 100%.
 */
let _courseSlug = null;
let _courseTotalSections = 0;
const _viewedSections = new Set();

function _updateProgressUI(progressPct) {
  const bar = document.getElementById("progressBar");
  const text = document.getElementById("progressText");
  if (bar) bar.style.width = `${progressPct}%`;
  if (text) text.textContent = `${progressPct}%`;
}

function initCourseProgress(slug, totalSections) {
  _courseSlug = slug;
  _courseTotalSections = totalSections;

  // Resume: fetch existing progress so a returning learner sees it immediately.
  apiFetch(`/api/courses/${slug}`)
    .then((course) => {
      _updateProgressUI(course.progress || 0);
      (course.viewed_sections || []).forEach((s) => _viewedSections.add(s));
    })
    .catch(() => {
      /* course not found / network issue — progress just starts at 0, non-fatal */
    });

  const sections = document.querySelectorAll('[id^="section"]');
  if (!("IntersectionObserver" in window) || sections.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          _viewedSections.add(entry.target.id);
          const pct = Math.min(95, Math.round((_viewedSections.size / _courseTotalSections) * 100));
          _updateProgressUI(pct);
          _persistProgress(pct);
        }
      });
    },
    { threshold: 0.4 }
  );
  sections.forEach((s) => observer.observe(s));
}

let _persistTimer = null;
function _persistProgress(pct) {
  clearTimeout(_persistTimer);
  _persistTimer = setTimeout(() => {
    submitCourseCompletion(_courseSlug, pct, Array.from(_viewedSections));
  }, 600); // debounce rapid scroll events
}

function markCompleted() {
  _updateProgressUI(100);
  submitCourseCompletion(_courseSlug, 100, Array.from(_viewedSections));
  if (typeof showToast === "function") {
    showToast("Course marked as complete — nice work!", "success");
  } else {
    alert("Course marked as complete!");
  }
}
