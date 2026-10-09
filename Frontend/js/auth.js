
/**
 * AapdaSetu AI — Authentication helpers
 * Requires assets/config.js and js/api.js to load first.
 */

(function () {
  "use strict";

  function getLoginPath() {
    const path = window.location.pathname;

    const subfolders = [
      "earthquake",
      "flood",
      "tornado",
      "wildfire",
      "cyclone",
      "legacy"
    ];

    const inSubfolder = subfolders.some(folder =>
      path.includes("/" + folder + "/")
    );

    return inSubfolder ? "../login.html" : "login.html";
  }

  function getToken() {
    try {
      return localStorage.getItem("token");
    } catch {
      return null;
    }
  }

  function getCurrentUser() {
    try {
      const value = localStorage.getItem("user");
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  }

  function saveUser(user) {
    localStorage.setItem("user", JSON.stringify(user));
  }

  async function login(userId, password) {
    if (typeof window.apiFetch !== "function") {
      return {
        ok: false,
        message: "API client did not load. Check the script order in login.html."
      };
    }

    try {
      const data = await window.apiFetch("/api/auth/login-json", {
        method: "POST",
        auth: false,
        body: {
          user_id: String(userId || "").trim(),
          password: String(password || "")
        }
      });

      if (!data || !data.access_token) {
        return {
          ok: false,
          message: "The server did not return an access token."
        };
      }

      localStorage.setItem("token", data.access_token);

      // Validate the new token with the backend.
      const user = await window.apiFetch("/api/auth/me");
      saveUser(user);

      return { ok: true, user };
    } catch (error) {
      // Clear only the failed login session.
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      return {
        ok: false,
        message: error.message || "Login failed."
      };
    }
  }

  async function register(userData) {
    if (typeof window.apiFetch !== "function") {
      return {
        ok: false,
        message: "API client did not load. Check the script order."
      };
    }

    try {
      const result = await window.apiFetch("/api/auth/register", {
        method: "POST",
        auth: false,
        body: userData
      });

      return { ok: true, data: result };
    } catch (error) {
      return {
        ok: false,
        message: error.message || "Registration failed."
      };
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = getLoginPath();
  }

  function checkAuth() {
    const path = window.location.pathname;

    const publicPages = [
      "login.html",
      "register.html",
      "index.html"
    ];

    const isPublic =
      path === "/" ||
      publicPages.some(page => path.endsWith("/" + page));

    if (!isPublic && !getToken()) {
      window.location.replace(getLoginPath());
      return false;
    }

    return true;
  }

  async function refreshCurrentUser() {
    if (!getToken()) return null;

    try {
      const user = await window.apiFetch("/api/auth/me");
      saveUser(user);
      return user;
    } catch (error) {
      console.error("Unable to validate session:", error.message);
      return null;
    }
  }

  // Maintain compatibility with existing pages.
  window.login = login;
  window.register = register;
  window.logout = logout;
  window.getToken = getToken;
  window.getCurrentUser = getCurrentUser;
  window.checkAuth = checkAuth;
  window.refreshCurrentUser = refreshCurrentUser;

  document.addEventListener("DOMContentLoaded", function () {
    const path = window.location.pathname;

    const isLoginOrRegister =
      path.endsWith("/login.html") ||
      path.endsWith("/register.html");

    if (!isLoginOrRegister) {
      checkAuth();
    }

    if (typeof window.paintUserName === "function") {
      window.paintUserName();
    }
  });
})();
