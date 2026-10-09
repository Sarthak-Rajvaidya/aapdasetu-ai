
/**
 * AapdaSetu AI — Authentication helpers
 * Requires assets/config.js and js/api.js to load first.
 */

(function () {
  "use strict";

  const PUBLIC_PAGES = [
    "login.html",
    "register.html",
    "index.html"
  ];

  function isPublicPage() {
    const path = window.location.pathname;
    return path === "/" ||
      PUBLIC_PAGES.some(page => path.endsWith("/" + page));
  }

  function getLoginPath() {
    const path = window.location.pathname;

    const folders = [
      "earthquake",
      "flood",
      "tornado",
      "wildfire",
      "cyclone",
      "legacy"
    ];

    const inSubfolder = folders.some(folder =>
      path.includes("/" + folder + "/")
    );

    return inSubfolder ? "../login.html" : "login.html";
  }

  function getToken() {
    try {
      return localStorage.getItem("token");
    } catch (error) {
      console.error("Unable to read authentication storage.");
      return null;
    }
  }

  function getCurrentUser() {
    try {
      const value = localStorage.getItem("user");
      return value ? JSON.parse(value) : null;
    } catch (error) {
      return null;
    }
  }

  function logout() {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    } catch (error) {
      console.error("Unable to clear authentication storage.");
    }

    window.location.href = getLoginPath();
  }

  async function login(userId, password) {
    try {
      const data = await window.apiFetch("/api/auth/login-json", {
        method: "POST",
        auth: false,
        body: {
          user_id: userId.trim(),
          password: password
        }
      });

      if (!data || !data.access_token) {
        return {
          ok: false,
          message: "Login response did not contain an access token."
        };
      }

      // Store the token before requesting the current user.
      localStorage.setItem("token", data.access_token);

      const user = await window.apiFetch("/api/auth/me");

      localStorage.setItem("user", JSON.stringify(user));

      return {
        ok: true,
        user: user
      };
    } catch (error) {
      // Do not silently replace API errors with a success response.
      return {
        ok: false,
        message: error.message || "Login failed."
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
    } catch (error) {
      return {
        ok: false,
        message: error.message || "Registration failed."
      };
    }
  }

  function checkAuth() {
    if (!isPublicPage() && !getToken()) {
      window.location.replace(getLoginPath());
    }
  }

  async function refreshCurrentUser() {
    const token = getToken();

    if (!token) {
      return null;
    }

    try {
      const user = await window.apiFetch("/api/auth/me");
      localStorage.setItem("user", JSON.stringify(user));
      return user;
    } catch (error) {
      console.error("Could not validate the current user:", error.message);
      return null;
    }
  }

  // Expose functions for existing frontend pages.
  window.login = login;
  window.register = register;
  window.logout = logout;
  window.getToken = getToken;
  window.getCurrentUser = getCurrentUser;
  window.checkAuth = checkAuth;
  window.refreshCurrentUser = refreshCurrentUser;

  document.addEventListener("DOMContentLoaded", function () {
    if (!isPublicPage()) {
      checkAuth();
    }

    if (typeof window.paintUserName === "function") {
      window.paintUserName();
    }
  });
})();
