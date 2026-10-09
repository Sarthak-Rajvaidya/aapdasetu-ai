javascript
/**
 * AapdaSetu AI — Shared API Client
 *
 * Usage:
 *   const courses = await apiFetch("/api/courses");
 *
 *   const course = await apiFetch("/api/courses/cyclone");
 *
 *   await apiFetch("/api/courses/cyclone/progress", {
 *     method: "POST",
 *     body: {
 *       progress: 25,
 *       viewed_sections: ["section-1"]
 *     }
 *   });
 *
 * Options:
 *   method: HTTP method, defaults to GET
 *   body: JavaScript object, string, or FormData
 *   auth: attach JWT and handle 401, defaults to true
 *   isForm: send FormData without JSON encoding
 *   credentials: fetch credentials mode, defaults to same-origin
 */

(function () {
  "use strict";

  const config = window.APP_CONFIG || {};

  const API_BASE_URL = String(
    config.API_BASE_URL || ""
  ).replace(/\/+$/, "");

  function apiAuthHeader() {
    let token = null;

    try {
      token = localStorage.getItem("token");
    } catch (error) {
      console.warn("Unable to access stored authentication token.");
    }

    return token
      ? { Authorization: `Bearer ${token}` }
      : {};
  }

  function apiLoginRedirectPath() {
    const pathname = window.location.pathname;

    const subfolders = [
      "earthquake",
      "flood",
      "tornado",
      "wildfire",
      "cyclone",
      "legacy"
    ];

    const inSubfolder = subfolders.some((folder) =>
      pathname.includes(`/${folder}/`)
    );

    return inSubfolder
      ? "../login.html"
      : "login.html";
  }

  function apiHandleUnauthorized() {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    } catch (error) {
      console.warn("Unable to clear local authentication data.");
    }

    const loginPath = apiLoginRedirectPath();

    // Avoid repeatedly redirecting when already on the login page.
    if (!window.location.pathname.endsWith("/login.html")) {
      window.location.href = loginPath;
    }
  }

  function apiBuildURL(path) {
    if (typeof path !== "string" || !path.trim()) {
      throw new Error("apiFetch requires a non-empty URL path.");
    }

    if (/^https?:\/\//i.test(path)) {
      const target = new URL(path);
      const baseOrigin = API_BASE_URL
        ? new URL(API_BASE_URL, window.location.origin).origin
        : window.location.origin;

      if (
        target.origin !== baseOrigin
        && target.origin !== window.location.origin
      ) {
        throw new Error(
          "Cross-origin API requests are not allowed by this API client."
        );
      }

      return target.href;
    }

    const normalizedPath = path.startsWith("/")
      ? path
      : `/${path}`;

    return `${API_BASE_URL}${normalizedPath}`;
  }

  async function apiParseResponse(response) {
    if (response.status === 204) {
      return null;
    }

    const text = await response.text();

    if (!text) {
      return null;
    }

    const contentType = (
      response.headers.get("content-type") || ""
    ).toLowerCase();

    if (contentType.includes("application/json")) {
      try {
        return JSON.parse(text);
      } catch {
        throw new Error("The server returned invalid JSON.");
      }
    }

    return text;
  }

  function apiCreateHTTPError(response, data) {
    const detail = data && typeof data === "object"
      ? (data.detail ?? data.message ?? data.error)
      : null;

    const message = detail == null
      ? `Request failed (${response.status})`
      : typeof detail === "string"
        ? detail
        : JSON.stringify(detail);

    const error = new Error(message);

    error.status = response.status;
    error.data = data;

    return error;
  }

  /**
   * Send a request and return parsed response data.
   *
   * This function returns JSON directly; it does not return a Response object.
   */
  async function apiFetch(path, options = {}) {
    const {
      method = "GET",
      body,
      auth = true,
      isForm = false,
      credentials = "same-origin",
      headers: customHeaders = {},
      signal
    } = options;

    const requestMethod = String(method).toUpperCase();

    const headers = {
      Accept: "application/json",
      ...customHeaders
    };

    if (auth) {
      Object.assign(headers, apiAuthHeader());
    }

    let requestBody;

    if (body !== undefined && body !== null) {
      const isFormData = (
        typeof FormData !== "undefined"
        && body instanceof FormData
      );

      if (isForm || isFormData) {
        // The browser must set the multipart boundary itself.
        delete headers["Content-Type"];
        delete headers["content-type"];
        requestBody = body;
      } else if (
        typeof body === "string"
        || body instanceof Blob
        || body instanceof ArrayBuffer
      ) {
        requestBody = body;

        if (
          typeof body === "string"
          && !headers["Content-Type"]
          && !headers["content-type"]
        ) {
          headers["Content-Type"] = "application/json";
        }
      } else {
        headers["Content-Type"] = "application/json";
        requestBody = JSON.stringify(body);
      }
    }

    let response;

    try {
      response = await fetch(apiBuildURL(path), {
        method: requestMethod,
        headers,
        body: requestBody,
        credentials,
        signal
      });
    } catch (networkError) {
      if (networkError.name === "AbortError") {
        throw networkError;
      }

      const error = new Error(
        "Network error. Check whether the backend is running and the API URL is correct."
      );

      error.status = 0;
      error.cause = networkError;

      throw error;
    }

    if (response.status === 401 && auth) {
      apiHandleUnauthorized();

      const error = new Error(
        "Your session has expired. Please sign in again."
      );

      error.status = 401;

      throw error;
    }

    const data = await apiParseResponse(response);

    if (!response.ok) {
      throw apiCreateHTTPError(response, data);
    }

    return data;
  }

  // Expose a single consistent client to classic frontend scripts.
  window.apiFetch = apiFetch;
  window.API_BASE_URL = API_BASE_URL;

  // Preserve compatibility with code using these helpers directly.
  window.apiAuthHeader = apiAuthHeader;
  window.apiHandleUnauthorized = apiHandleUnauthorized;
})();
