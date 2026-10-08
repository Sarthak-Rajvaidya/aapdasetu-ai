/**
 * Shared fetch helper used by every page. Centralizes:
 *  - API_BASE_URL resolution (from assets/config.js)
 *  - attaching the JWT bearer token
 *  - 401 handling (expired/invalid token -> redirect to login)
 *  - consistent error shape for callers
 */
const API_BASE_URL = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) || "";

function apiAuthHeader() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function apiLoginRedirectPath() {
  const depth = window.location.pathname.split("/").filter(Boolean);
  // Pages under /earthquake/, /flood/, /tornado/, /wildfire/, /cyclone/ are one level deep.
  const inSubfolder = ["earthquake", "flood", "tornado", "wildfire", "cyclone", "legacy"].some((f) =>
    window.location.pathname.includes(`/${f}/`)
  );
  return inSubfolder ? "../login.html" : "login.html";
}

function apiHandleUnauthorized() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = apiLoginRedirectPath();
}

/**
 * apiFetch(path, { method, body, auth }) -> parsed JSON (or throws Error with .status)
 * `path` should start with "/api/...".
 */
async function apiFetch(path, options = {}) {
  const { method = "GET", body, auth = true, isForm = false } = options;

  const headers = {};
  if (!isForm) headers["Content-Type"] = "application/json";
  if (auth) Object.assign(headers, apiAuthHeader());

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    });
  } catch (networkErr) {
    const err = new Error("Network error — is the backend running / reachable?");
    err.status = 0;
    throw err;
  }

  if (response.status === 401 && auth) {
    apiHandleUnauthorized();
    const err = new Error("Session expired");
    err.status = 401;
    throw err;
  }

  let data = null;
  const text = await response.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message = (data && (data.detail || data.message)) || `Request failed (${response.status})`;
    const err = new Error(typeof message === "string" ? message : JSON.stringify(message));
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}
