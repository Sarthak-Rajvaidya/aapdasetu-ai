const COURSE_ICONS = {
  earthquake: "bi-globe-americas",
  flood: "bi-water",
  wildfire: "bi-fire",
  tornado: "bi-tornado",
  cyclone: "bi-wind",
};
const COURSE_PAGES = {
  earthquake: "earthquake/course-earthquake.html",
  flood: "flood/course-flood.html",
  wildfire: "wildfire/course-wildfire.html",
  tornado: "tornado/course-tornado.html",
  cyclone: "cyclone/course-cyclone.html",
};

async function loadCourses() {
  const skeleton = document.getElementById("coursesSkeleton");
  const grid = document.getElementById("coursesGrid");
  const errorBox = document.getElementById("coursesError");

  try {
    const courses = await apiFetch("/api/courses");
    skeleton.classList.add("d-none");
    grid.classList.remove("d-none");

    grid.innerHTML = courses
      .map((c) => {
        const href = COURSE_PAGES[c.slug] || "#";
        return `
        <div class="col-md-4">
          <div class="as-card p-4 h-100 d-flex flex-column">
            <div class="as-icon-tile mb-3"><i class="bi ${COURSE_ICONS[c.slug] || "bi-journal"}"></i></div>
            <h5 class="fw-bold">${c.title}</h5>
            <p class="as-muted small flex-grow-1">${c.description}</p>
            <div class="as-progress mb-2"><span style="width:${c.progress}%"></span></div>
            <div class="d-flex justify-content-between align-items-center small mb-3">
              <span class="as-muted">${c.progress}% complete</span>
              ${c.completed ? '<span class="as-badge-soft"><i class="bi bi-patch-check-fill me-1"></i>Completed</span>' : ""}
            </div>
            <a href="${href}" class="btn btn-as-primary mt-auto">
              ${c.progress > 0 ? "Continue" : "Start"} Course <i class="bi bi-arrow-right ms-1"></i>
            </a>
          </div>
        </div>`;
      })
      .join("");
  } catch (err) {
    skeleton.classList.add("d-none");
    errorBox.textContent = `Couldn't load courses: ${err.message}`;
    errorBox.classList.remove("d-none");
  }
}

document.addEventListener("DOMContentLoaded", loadCourses);
