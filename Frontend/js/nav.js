/**
 * Injects a consistent navbar + footer into any page that has
 * <div id="as-navbar-root"></div> and/or <div id="as-footer-root"></div>.
 * Keeps navigation identical across ~15 static pages without a build step.
 *
 * Auth-aware: shows Login/Register for guests, Profile/Logout for signed-in
 * users, via the existing [data-auth-show]/[data-guest-show] convention
 * from auth.js (paintUserName() already handles the show/hide toggling —
 * this just needs to render the elements with those attributes).
 */
function _asPrefix() {
  const inSubfolder = ["earthquake", "flood", "tornado", "wildfire", "cyclone"].some((f) =>
    window.location.pathname.includes(`/${f}/`)
  );
  return inSubfolder ? "../" : "";
}

function _asNavLink(href, icon, label) {
  const current = window.location.pathname.split("/").pop();
  const isActive = current === href.replace("../", "");
  return `<li class="nav-item">
    <a class="nav-link${isActive ? " active" : ""}" href="${href}">
      <i class="bi ${icon} me-1"></i>${label}
    </a>
  </li>`;
}

function renderNavbar() {
  const root = document.getElementById("as-navbar-root");
  if (!root) return;
  const p = _asPrefix();

  root.innerHTML = `
  <nav class="navbar navbar-expand-lg as-navbar sticky-top" aria-label="Main navigation">
    <div class="container-fluid px-4">
      <a class="navbar-brand" href="${p}index.html">
        <span class="as-logo-badge"><i class="bi bi-shield-check"></i></span>
        AapdaSetu AI
      </a>
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#asNavCollapse"
        aria-controls="asNavCollapse" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="asNavCollapse">
        <ul class="navbar-nav ms-auto me-3 mb-2 mb-lg-0">
          ${_asNavLink(p + "dashboard.html", "bi-speedometer2", "Dashboard")}
          ${_asNavLink(p + "modules.html", "bi-journal-bookmark", "Learn")}
          ${_asNavLink(p + "simulation.html", "bi-controller", "Simulations")}
          ${_asNavLink(p + "ai-assistant.html", "bi-stars", "AI Assistant")}
          ${_asNavLink(p + "predictor.html", "bi-graph-up-arrow", "Risk Predictor")}
          ${_asNavLink(p + "profile.html", "bi-person-circle", "Profile")}
        </ul>
        <div class="d-flex align-items-center gap-2" data-guest-show>
          <a href="${p}login.html" class="btn btn-as-outline btn-sm">Login</a>
          <a href="${p}register.html" class="btn btn-as-primary btn-sm">Register</a>
        </div>
        <div class="d-flex align-items-center gap-3" data-auth-show style="display:none">
          <span class="text-white-50 small d-none d-lg-inline">
            <i class="bi bi-person-check me-1"></i><span data-user-name>User</span>
          </span>
          <button class="btn btn-as-outline btn-sm" onclick="if(confirm('Log out of AapdaSetu AI?')) logout();">
            <i class="bi bi-box-arrow-right me-1"></i>Logout
          </button>
        </div>
      </div>
    </div>
  </nav>`;

  if (typeof paintUserName === "function") paintUserName();
}

function renderFooter() {
  const root = document.getElementById("as-footer-root");
  if (!root) return;
  const p = _asPrefix();
  const year = new Date().getFullYear();
  root.innerHTML = `
  <footer class="as-footer">
    <div class="container">
      <div class="row gy-4">
        <div class="col-md-4">
          <div class="as-footer-brand mb-2"><i class="bi bi-shield-check me-2"></i>AapdaSetu AI</div>
          <p class="small mb-0">Learn. Simulate. Prepare. Respond.<br>An AI-powered disaster preparedness, training and simulation platform.</p>
        </div>
        <div class="col-md-2">
          <h6 class="text-white">Platform</h6>
          <ul class="list-unstyled small">
            <li><a href="${p}modules.html">Learn</a></li>
            <li><a href="${p}simulation.html">Simulations</a></li>
            <li><a href="${p}predictor.html">Risk Predictor</a></li>
            <li><a href="${p}ai-assistant.html">AI Assistant</a></li>
          </ul>
        </div>
        <div class="col-md-3">
          <h6 class="text-white">Account</h6>
          <ul class="list-unstyled small">
            <li><a href="${p}dashboard.html">Dashboard</a></li>
            <li><a href="${p}profile.html">Profile</a></li>
            <li><a href="${p}login.html">Login</a></li>
          </ul>
        </div>
        <div class="col-md-3">
          <h6 class="text-white">Important</h6>
          <p class="small mb-0">AapdaSetu AI is an educational preparedness platform. It does not replace official emergency services — always follow local authority guidance in a real emergency.</p>
        </div>
      </div>
      <hr class="border-secondary my-4">
      <p class="small mb-0 text-center">&copy; ${year} AapdaSetu AI. Built for education and disaster-preparedness training.</p>
    </div>
  </footer>`;
}

document.addEventListener("DOMContentLoaded", () => {
  renderNavbar();
  renderFooter();
});
