/**
 * Central runtime configuration for the AapdaSetu AI frontend.
 *
 * Because the backend serves this Frontend/ folder as static files from the
 * SAME origin (see Backend/app/main.py StaticFiles mount), an empty string
 * correctly resolves relative fetch("/api/...") calls to "wherever this
 * page was loaded from" — no hard-coded localhost, works unchanged after
 * deployment to Render or any other host.
 *
 * If you ever split the frontend onto a different origin from the API,
 * set API_BASE_URL to the full backend URL (e.g. "https://api.example.com").
 */
window.APP_CONFIG = {
  API_BASE_URL: "",
  APP_NAME: "AapdaSetu AI",
  APP_TAGLINE: "Learn. Simulate. Prepare. Respond.",
  // Optional: only needed for the "use my location" auto-fill on the Risk
  // Predictor page. Leave blank to disable that button gracefully — never
  // commit a real key here in a public repo.
  OPENWEATHER_API_KEY: ""
};
