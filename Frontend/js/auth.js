/**
 * Authentication helpers. Depends on assets/config.js + js/api.js being
 * loaded first.
 *
 * Security note: the frontend NEVER decides "who the user is" for
 * protected calls — it only stores the JWT it receives at login. Every
 * protected backend route re-derives identity from that token.
 */

async function login(user_id, password) {
  try {
    const data = await apiFetch("/api/auth/login-json", {
      method: "POST",
      auth: false,
      body: { user_id, password },
    });
    localStorage.setItem("token", data.access_token);

    const me = await apiFetch("/api/auth/me");
    localStorage.setItem("user", JSON.stringify(me));
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}

async function register(userData) {
  try {
    await apiFetch("/api/auth/register", {
      method: "POST",
      auth: false,
      body: userData,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}

function logout() {
  localStorage.removeItem("user");
  localStorage.removeItem("token");
  window.location.href = apiLoginRedirectPath();
}

function getCurrentUser() {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

function getToken() {
  return localStorage.getItem("token");
}

function checkAuth() {
  const publicPages = ["login.html", "register.html", "index.html"];
  const isPublic = publicPages.some((p) => window.location.pathname.endsWith(p)) ||
    window.location.pathname === "/" ;
  if (!getToken() && !isPublic) {
    window.location.href = apiLoginRedirectPath();
  }
}

/** Populates any element with [data-user-name] using the cached profile. */
function paintUserName() {
  const user = getCurrentUser();
  document.querySelectorAll("[data-user-name]").forEach((el) => {
    el.textContent = user ? (user.name || user.user_id) : "Guest";
  });
  document.querySelectorAll("[data-auth-show]").forEach((el) => {
    el.style.display = user ? "" : "none";
  });
  document.querySelectorAll("[data-guest-show]").forEach((el) => {
    el.style.display = user ? "none" : "";
  });
}

async function submitCourseCompletion(courseSlug, progress = 100, viewedSections = []) {
  try {
    await apiFetch(`/api/courses/${courseSlug}/progress`, {
      method: "POST",
      body: { progress: Math.round(progress), viewed_sections: Array.from(viewedSections) },
    });
    if (typeof showToast === "function") showToast("Progress saved", "success");
  } catch (err) {
    if (typeof showToast === "function") showToast(`Save failed: ${err.message}`, "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const publicPages = ["login.html", "register.html"];
  const isPublic = publicPages.some((p) => window.location.pathname.endsWith(p));
  if (!isPublic) {
    checkAuth();
    paintUserName();
  }
});
