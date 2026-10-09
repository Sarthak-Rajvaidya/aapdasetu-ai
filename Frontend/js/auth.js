
/**
 * AapdaSetu AI — Authentication helpers
 * Requires assets/config.js and js/api.js to load first.
 */

(function () {
  "use strict";

  function redirectToLogin() {
    if (typeof window.apiLoginRedirectPath === "function") {
      window.location.href = window.apiLoginRedirectPath();
      return;
    }

    const path = window.location.pathname;
    const folders = [
      "earthquake", "flood", "tornado",
      "wildfire", "cyclone", "legacy"
    ];

    const nested = folders.some(function (folder) {
      return path.includes("/" + folder + "/");
    });

    window.location.href = nested ? "../login.html" : "login.html";
  }

  async function login(user_id, password) {
    try {
      const data = await window.apiFetch("/api/auth/login-json", {
        method: "POST",
        auth: false,
        body: { user_id: user_id, password: password }
      });

      if (!data || typeof data.access_token !== "string" ||
          !data.access_token.trim()) {
        throw new Error(
          "The login response did not contain an access token. Check the backend login response."
        );
      }

      // Save the token before requesting the protected profile endpoint.
      localStorage.setItem("token", data.access_token);

      try {
        const me = await window.apiFetch("/api/auth/me");

        if (!me || typeof me !== "object") {
          throw new Error("The profile endpoint returned invalid user data.");
        }

        localStorage.setItem("user", JSON.stringify(me));
      } catch (profileError) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        throw profileError;
      }

      return { ok: true };
    } catch (err) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      return {
        ok: false,
        message: err.message || "Login failed. Please try again."
      };
    }
  }

  async function register(userData) {
    try {
      await window.apiFetch("/api/auth/register", {
        method: "POST",
        auth: false,
        body: userData
      });

      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        message: err.message || "Registration failed."
      };
    }
  }

  function logout() {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    redirectToLogin();
  }

  function getCurrentUser() {
    try {
      const value = localStorage.getItem("user");
      return value ? JSON.parse(value) : null;
    } catch (err) {
      return null;
    }
  }

  function getToken() {
    return localStorage.getItem("token");
  }

  function checkAuth() {
    const publicPages = [
      "login.html",
      "register.html",
      "index.html"
    ];

    const path = window.location.pathname;
    const isPublic =
      path === "/" ||
      publicPages.some(function (page) {
        return path.endsWith("/" + page) || path === page;
      });

    if (!getToken() && !isPublic) {
      redirectToLogin();
      return false;
    }

    return true;
  }

  function paintUserName() {
    const user = getCurrentUser();

    document.querySelectorAll("[data-user-name]").forEach(function (el) {
      el.textContent = user
        ? (user.name || user.user_id || "User")
        : "Guest";
    });

    document.querySelectorAll("[data-auth-show]").forEach(function (el) {
      el.style.display = user ? "" : "none";
    });

    document.querySelectorAll("[data-guest-show]").forEach(function (el) {
      el.style.display = user ? "none" : "";
    });
  }

  async function submitCourseCompletion(
    courseSlug,
    progress,
    viewedSections
  ) {
    try {
      const result = await window.apiFetch(
        "/api/courses/" + encodeURIComponent(courseSlug) + "/progress",
        {
          method: "POST",
          body: {
            progress: Math.round(progress == null ? 100 : progress),
            viewed_sections: Array.from(viewedSections || [])
          }
        }
      );

      if (typeof window.showToast === "function") {
        window.showToast("Progress saved.", "success");
      }

      return { ok: true, data: result };
    } catch (err) {
      if (typeof window.showToast === "function") {
        window.showToast(
          "Could not save progress: " + err.message,
          "error"
        );
      }

      return { ok: false, message: err.message };
    }
  }

  // Preserve the global function names used by existing pages.
  window.login = login;
  window.register = register;
  window.logout = logout;
  window.getCurrentUser = getCurrentUser;
  window.getToken = getToken;
  window.checkAuth = checkAuth;
  window.paintUserName = paintUserName;
  window.submitCourseCompletion = submitCourseCompletion;

  document.addEventListener("DOMContentLoaded", function () {
    const path = window.location.pathname;
    const publicPages = ["login.html", "register.html"];

    const isPublic = publicPages.some(function (page) {
      return path.endsWith("/" + page) || path === page;
    });

    if (!isPublic) {
      if (checkAuth()) {
        paintUserName();
      }
    }
  });
})();
