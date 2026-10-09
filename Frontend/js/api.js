javascript
/**
 * AapdaSetu AI — Shared API Client
 * Compatible with existing login, dashboard, courses and other pages.
 */

(function () {
  "use strict";

  var config = window.APP_CONFIG || {};

  var API_BASE_URL = String(config.API_BASE_URL || "")
    .replace(/\/+$/, "");

  function apiAuthHeader() {
    var token = null;

    try {
      token = localStorage.getItem("token");
    } catch (error) {
      console.warn("Could not read authentication token.");
    }

    return token
      ? { Authorization: "Bearer " + token }
      : {};
  }

  function apiLoginRedirectPath() {
    var pathname = window.location.pathname;

    var folders = [
      "earthquake",
      "flood",
      "tornado",
      "wildfire",
      "cyclone",
      "legacy"
    ];

    var inSubfolder = folders.some(function (folder) {
      return pathname.indexOf("/" + folder + "/") !== -1;
    });

    return inSubfolder ? "../login.html" : "login.html";
  }

  function apiHandleUnauthorized() {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    } catch (error) {
      console.warn("Could not clear authentication storage.");
    }

    if (!/\/login\.html$/.test(window.location.pathname)) {
      window.location.href = apiLoginRedirectPath();
    }
  }

  function apiBuildURL(path) {
    if (typeof path !== "string" || !path.trim()) {
      throw new Error("apiFetch requires a valid URL path.");
    }

    if (/^https?:\/\//i.test(path)) {
      return path;
    }

    return API_BASE_URL +
      (path.charAt(0) === "/" ? path : "/" + path);
  }

  async function apiParseResponse(response) {
    if (response.status === 204) {
      return null;
    }

    var text = await response.text();

    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch (error) {
      return text;
    }
  }

  function apiCreateError(response, data) {
    var message = "Request failed (" + response.status + ")";

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

    var error = new Error(message);
    error.status = response.status;
    error.data = data;

    return error;
  }

  /**
   * apiFetch(path, options) returns parsed response data.
   *
   * Examples:
   *   await apiFetch("/api/courses");
   *
   *   await apiFetch("/api/courses/cyclone/progress", {
   *     method: "POST",
   *     body: { progress: 25, viewed_sections: ["section-1"] }
   *   });
   */
  async function apiFetch(path, options) {
    options = options || {};

    var method = options.method || "GET";
    var body = options.body;
    var auth = options.auth !== false;
    var isForm = options.isForm === true;
    var headers = {
      Accept: "application/json"
    };

    if (options.headers) {
      Object.keys(options.headers).forEach(function (key) {
        headers[key] = options.headers[key];
      });
    }

    if (auth) {
      Object.assign(headers, apiAuthHeader());
    }

    var requestBody;

    if (body !== undefined && body !== null) {
      var isFormData =
        typeof FormData !== "undefined" &&
        body instanceof FormData;

      if (isForm || isFormData) {
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

    var response;

    try {
      response = await fetch(apiBuildURL(path), {
        method: method,
        headers: headers,
        body: requestBody,
        credentials: options.credentials || "same-origin",
        signal: options.signal
      });
    } catch (networkError) {
      if (networkError.name === "AbortError") {
        throw networkError;
      }

      var error = new Error(
        "API fetch failed. Check the backend URL, server status, and network connection."
      );

      error.status = 0;
      error.cause = networkError;

      throw error;
    }

    if (response.status === 401 && auth) {
      apiHandleUnauthorized();

      var authError = new Error(
        "Authentication failed. Please sign in again."
      );

      authError.status = 401;
      throw authError;
    }

    var data = await apiParseResponse(response);

    if (!response.ok) {
      throw apiCreateError(response, data);
    }

    return data;
  }

  // Keep these names available to existing frontend scripts.
  window.apiFetch = apiFetch;
  window.API_BASE_URL = API_BASE_URL;
  window.apiAuthHeader = apiAuthHeader;
  window.apiHandleUnauthorized = apiHandleUnauthorized;

})();
