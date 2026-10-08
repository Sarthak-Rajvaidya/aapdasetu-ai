/**
 * Shared navbar + footer for AapdaSetu AI.
 * Pages include <div id="as-navbar-root"></div> and <div id="as-footer-root"></div>.
 *
 * The navbar renders ONE of two states based on the cached login state:
 *   - Guest:  Login / Register buttons
 *   - Signed in: avatar chip with dropdown (Dashboard, Profile, Logout)
 * Logout uses a confirmation modal instead of the browser's confirm() box.
 */

const _AS_LINKS = [
  { href: "dashboard.html",    icon: "bi-speedometer2",     label: "Dashboard",      match: ["dashboard.html"] },
  { href: "modules.html",      icon: "bi-journal-bookmark", label: "Learn",          match: ["modules.html", "quiz.html"] },
  { href: "simulation.html",   icon: "bi-controller",       label: "Simulations",    match: ["simulation.html", "simulation-play.html"] },
  { href: "ai-assistant.html", icon: "bi-stars",            label: "AI Assistant",   match: ["ai-assistant.html"] },
  { href: "predictor.html",    icon: "bi-graph-up-arrow",   label: "Risk Predictor", match: ["predictor.html"] },
];

function _asPrefix() {
  const inSubfolder = ["earthquake", "flood", "tornado", "wildfire", "cyclone"].some((f) =>
    window.location.pathname.includes(`/${f}/`)
  );
  return inSubfolder ? "../" : "";
}

function _asEscape(str) {
  const d = document.createElement("div");
  d.textContent = str == null ? "" : String(str);
  return d.innerHTML;
}

function _asInitials(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function _asRoleLabel(role) {
  const map = { student: "Learner", elderly: "Senior learner", admin: "Administrator" };
  return map[role] || "Learner";
}

function _asNavItem(link, prefix) {
  const current = window.location.pathname.split("/").pop() || "index.html";
  const active = link.match.includes(current);
  return `
    <li class="nav-item">
      <a class="nav-link${active ? " active" : ""}" href="${prefix}${link.href}"${active ? ' aria-current="page"' : ""}>
        <i class="bi ${link.icon}" aria-hidden="true"></i><span>${link.label}</span>
      </a>
    </li>`;
}

function _asGuestActions(p) {
  return `
    <div class="as-nav-actions">
      <a href="${p}login.html" class="btn btn-as-outline btn-sm">Log in</a>
      <a href="${p}register.html" class="btn btn-as-primary btn-sm">Get started</a>
    </div>`;
}

function _asUserActions(user, p) {
  const name = user.name || user.user_id || "User";
  return `
    <div class="as-nav-actions">
      <div class="dropdown as-user-dropdown">
        <button class="as-user-chip" type="button" data-bs-toggle="dropdown" aria-expanded="false"
                aria-label="Account menu for ${_asEscape(name)}">
          <span class="as-avatar" aria-hidden="true">${_asEscape(_asInitials(name))}</span>
          <span class="as-user-meta">
            <span class="as-user-name" data-user-name>${_asEscape(name)}</span>
            <span class="as-user-role">${_asEscape(_asRoleLabel(user.role))}</span>
          </span>
          <i class="bi bi-chevron-down as-chevron" aria-hidden="true"></i>
        </button>
        <ul class="dropdown-menu dropdown-menu-end as-user-menu">
          <li class="as-user-menu-header">
            <span class="as-avatar as-avatar-lg" aria-hidden="true">${_asEscape(_asInitials(name))}</span>
            <div>
              <div class="fw-semibold">${_asEscape(name)}</div>
              <div class="small text-secondary">@${_asEscape(user.user_id || "")}</div>
            </div>
          </li>
          <li><hr class="dropdown-divider"></li>
          <li><a class="dropdown-item" href="${p}dashboard.html"><i class="bi bi-speedometer2 me-2"></i>Dashboard</a></li>
          <li><a class="dropdown-item" href="${p}profile.html"><i class="bi bi-person-circle me-2"></i>My profile</a></li>
          <li><hr class="dropdown-divider"></li>
          <li>
            <button type="button" class="dropdown-item text-danger" data-as-logout>
              <i class="bi bi-box-arrow-right me-2"></i>Log out
            </button>
          </li>
        </ul>
      </div>
    </div>`;
}

function _asEnsureLogoutModal() {
  if (document.getElementById("asLogoutModal")) return;
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div class="modal fade" id="asLogoutModal" tabindex="-1" aria-labelledby="asLogoutTitle" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered modal-sm">
        <div class="modal-content border-0 shadow-lg" style="border-radius:18px;">
          <div class="modal-body text-center p-4">
            <div class="mb-3" style="font-size:2rem;color:#ef4444;"><i class="bi bi-box-arrow-right"></i></div>
            <h5 class="fw-bold mb-1" id="asLogoutTitle">Log out?</h5>
            <p class="text-secondary small mb-4">You'll need to sign in again to continue your training.</p>
            <div class="d-flex gap-2">
              <button type="button" class="btn btn-light flex-fill" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-danger flex-fill" id="asLogoutConfirm">Log out</button>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(wrap.firstElementChild);
  document.getElementById("asLogoutConfirm").addEventListener("click", () => {
    if (typeof logout === "function") logout();
  });
}

function _asBindLogout(root) {
  root.querySelectorAll("[data-as-logout]").forEach((btn) => {
    btn.addEventListener("click", () => {
      _asEnsureLogoutModal();
      if (window.bootstrap && bootstrap.Modal) {
        bootstrap.Modal.getOrCreateInstance(document.getElementById("asLogoutModal")).show();
      } else if (confirm("Log out of AapdaSetu AI?") && typeof logout === "function") {
        logout();
      }
    });
  });
}

function renderNavbar() {
  const root = document.getElementById("as-navbar-root");
  if (!root) return;

  const p = _asPrefix();
  const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;

  root.innerHTML = `
  <nav class="navbar navbar-expand-xl as-navbar sticky-top" data-bs-theme="dark" aria-label="Main navigation">
    <div class="container-xl">
      <a class="navbar-brand" href="${p}index.html" aria-label="AapdaSetu AI home">
        <span class="as-logo-badge"><i class="bi bi-shield-check" aria-hidden="true"></i></span>
        <span class="as-brand-text">AapdaSetu <span class="as-brand-ai">AI</span></span>
      </a>

      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#asNavCollapse"
              aria-controls="asNavCollapse" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>

      <div class="collapse navbar-collapse" id="asNavCollapse">
        <ul class="navbar-nav mx-xl-auto mb-3 mb-xl-0">
          ${_AS_LINKS.map((l) => _asNavItem(l, p)).join("")}
        </ul>
        ${user ? _asUserActions(user, p) : _asGuestActions(p)}
      </div>
    </div>
  </nav>`;

  _asBindLogout(root);
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
        <div class="col-6 col-md-2">
          <h6 class="text-white">Platform</h6>
          <ul class="list-unstyled small">
            <li><a href="${p}modules.html">Learn</a></li>
            <li><a href="${p}simulation.html">Simulations</a></li>
            <li><a href="${p}predictor.html">Risk Predictor</a></li>
            <li><a href="${p}ai-assistant.html">AI Assistant</a></li>
          </ul>
        </div>
        <div class="col-6 col-md-3">
          <h6 class="text-white">Account</h6>
          <ul class="list-unstyled small">
            <li><a href="${p}dashboard.html">Dashboard</a></li>
            <li><a href="${p}profile.html">Profile</a></li>
            <li><a href="${p}login.html">Log in</a></li>
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