
/**
 * AapdaSetu AI — Shared API Client
 * Load assets/config.js before this file.
 */

(function () {
  "use strict";

  const config = window.APP_CONFIG || {};

  const API_BASE_URL = String(config.API_BASE_URL || "")
    .replace(/\/+$/, "");

  function apiAuthHeader() {
    let token = null;

    try {
      token = localStorage.getItem("token");
    } catch (error) {
      console.warn("Unable to read authentication token.");
    }

    return token ? { Authorization: "Bearer " + token } : {};
  }

  function apiBuildURL(path) {
    if (typeof path !== "string" || !path.trim()) {
      throw new Error("apiFetch requires a valid URL path.");
    }

    if (/^https?:\/\//i.test(path)) {
      return path;
    }

    return API_BASE_URL + (path.startsWith("/") ? path : "/" + path);
  }

  async function apiParseResponse(response) {
    if (response.status === 204) return null;

    const text = await response.text();
    if (!text) return null;

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  function apiCreateError(response, data) {
    let message = "Request failed (" + response.status + ")";

    if (data && typeof data === "object") {
      if (typeof data.detail === "string") {
        message = data.detail;
      } else if (typeof data.message === "string") {
        message = data.message;
      } else if (data.detail) {
        message = JSON.stringify(data.detail);
      }
    } else if (typeof data === "string" && data.trim()) {
      message = data;
    }

    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    return error;
  }

  async function apiFetch(path, options = {}) {
    const method = options.method || "GET";
    const auth = options.auth !== false;
    const body = options.body;

    const headers = {
      Accept: "application/json",
      ...(options.headers || {})
    };

    if (auth) {
      Object.assign(headers, apiAuthHeader());
    }

    let requestBody;

    if (body !== undefined && body !== null) {
      if (body instanceof FormData) {
        requestBody = body;
        delete headers["Content-Type"];
        delete headers["content-type"];
      } else if (typeof body === "string") {
        requestBody = body;

        if (!headers["Content-Type"] && !headers["content-type"]) {
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
        method,
        headers,
        body: requestBody,
        credentials: options.credentials || "same-origin",
        signal: options.signal
      });
    } catch (error) {
      if (error.name === "AbortError") throw error;

      const networkError = new Error(
        "Cannot connect to the API. Check the backend URL and server."
      );
      networkError.status = 0;
      networkError.cause = error;
      throw networkError;
    }

    const data = await apiParseResponse(response);

    if (!response.ok) {
      throw apiCreateError(response, data);
    }

    return data;
  }

  // Export functions globally for existing classic-script pages.
  window.apiFetch = apiFetch;
  window.API_BASE_URL = API_BASE_URL;
  window.apiAuthHeader = apiAuthHeader;

  console.info("AapdaSetu API client loaded.");
})();
