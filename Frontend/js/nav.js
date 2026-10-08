/**
 * AapdaSetu AI
 * Production Navbar + Footer
 *
 * Features:
 * - Responsive Bootstrap navbar
 * - Clean desktop navigation
 * - Logged-in user profile on right
 * - Profile dropdown with Profile + Sign Out
 * - Guest Login/Register buttons
 * - Automatic active navigation item
 * - Works with pages inside subfolders
 */

function _asPrefix() {
  const inSubfolder = [
    "earthquake",
    "flood",
    "tornado",
    "wildfire",
    "cyclone"
  ].some((folder) =>
    window.location.pathname.includes(`/${folder}/`)
  );

  return inSubfolder ? "../" : "";
}


/* ---------------------------------------------------------
   Navigation Link
--------------------------------------------------------- */

function _asNavLink(href, icon, label) {
  const current = window.location.pathname.split("/").pop();

  const cleanHref = href.replace("../", "");
  const isActive = current === cleanHref;

  return `
    <li class="nav-item">
      <a
        class="nav-link${isActive ? " active" : ""}"
        href="${href}"
        ${isActive ? 'aria-current="page"' : ""}
      >
        <i class="bi ${icon}"></i>
        <span>${label}</span>
      </a>
    </li>
  `;
}


/* ---------------------------------------------------------
   Get Current User
--------------------------------------------------------- */

function _asGetUser() {
  try {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error("Unable to read user information:", error);
    return null;
  }
}


/* ---------------------------------------------------------
   Get User Initials
--------------------------------------------------------- */

function _asGetInitials(user) {
  if (!user) return "U";

  const name = user.name || user.user_id || "User";

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length >= 2) {
    return (
      parts[0].charAt(0) +
      parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  }

  return name.substring(0, 2).toUpperCase();
}


/* ---------------------------------------------------------
   Render Navbar
--------------------------------------------------------- */

function renderNavbar() {
  const root = document.getElementById("as-navbar-root");

  if (!root) return;

  const p = _asPrefix();
  const user = _asGetUser();

  const userName = user
    ? (user.name || user.user_id || "User")
    : "User";

  const userEmail = user
    ? (user.email || user.user_id || "")
    : "";

  const initials = _asGetInitials(user);


  root.innerHTML = `
    <nav
      class="navbar navbar-expand-lg as-navbar sticky-top"
      aria-label="Main navigation"
    >

      <div class="container-fluid as-navbar-container">

        <!-- Brand -->
        <a
          class="navbar-brand"
          href="${p}index.html"
          aria-label="AapdaSetu AI Home"
        >
          <span class="as-logo-badge">
            <i class="bi bi-shield-check"></i>
          </span>

          <span class="as-brand-text">
            AapdaSetu AI
          </span>
        </a>


        <!-- Mobile Toggle -->
        <button
          class="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#asNavCollapse"
          aria-controls="asNavCollapse"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span class="navbar-toggler-icon"></span>
        </button>


        <!-- Navbar Content -->
        <div
          class="collapse navbar-collapse"
          id="asNavCollapse"
        >

          <!-- Main Navigation -->
          <ul class="navbar-nav as-main-nav">

            ${_asNavLink(
              p + "dashboard.html",
              "bi-speedometer2",
              "Dashboard"
            )}

            ${_asNavLink(
              p + "modules.html",
              "bi-journal-bookmark",
              "Learn"
            )}

            ${_asNavLink(
              p + "simulation.html",
              "bi-controller",
              "Simulations"
            )}

            ${_asNavLink(
              p + "ai-assistant.html",
              "bi-stars",
              "AI Assistant"
            )}

            ${_asNavLink(
              p + "predictor.html",
              "bi-graph-up-arrow",
              "Risk Predictor"
            )}

          </ul>


          <!-- Right Side -->
          <div class="as-navbar-right">

            <!-- Guest -->
            <div
              class="as-guest-actions"
              data-guest-show
            >
              <a
                href="${p}login.html"
                class="btn btn-as-outline btn-sm"
              >
                Login
              </a>

              <a
                href="${p}register.html"
                class="btn btn-as-primary btn-sm"
              >
                Register
              </a>
            </div>


            <!-- Logged In User -->
            <div
              class="dropdown as-profile-wrapper"
              data-auth-show
              style="display:none"
            >

              <!-- Profile Button -->
              <button
                class="as-profile-trigger"
                type="button"
                id="asProfileDropdown"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >

                <!-- Avatar -->
                <span class="as-profile-avatar">
                  ${initials}
                </span>


                <!-- User Info -->
                <span class="as-profile-info">

                  <span class="as-profile-name">
                    ${userName}
                  </span>

                  <span class="as-profile-role">
                    My Account
                  </span>

                </span>


                <!-- Arrow -->
                <i class="bi bi-chevron-down as-profile-arrow"></i>

              </button>


              <!-- Dropdown -->
              <ul
                class="dropdown-menu dropdown-menu-end as-profile-menu"
                aria-labelledby="asProfileDropdown"
              >

                <!-- Dropdown Header -->
                <li class="as-profile-menu-header">

                  <div class="as-dropdown-avatar">
                    ${initials}
                  </div>

                  <div class="as-dropdown-user">

                    <strong>
                      ${userName}
                    </strong>

                    ${
                      userEmail
                        ? `<span>${userEmail}</span>`
                        : `<span>AapdaSetu AI User</span>`
                    }

                  </div>

                </li>


                <li>
                  <hr class="dropdown-divider">
                </li>


                <!-- Profile -->
                <li>
                  <a
                    class="dropdown-item as-dropdown-item"
                    href="${p}profile.html"
                  >
                    <span class="as-dropdown-icon">
                      <i class="bi bi-person"></i>
                    </span>

                    <span>
                      <strong>Profile</strong>
                      <small>View your profile</small>
                    </span>
                  </a>
                </li>


                <!-- Dashboard -->
                <li>
                  <a
                    class="dropdown-item as-dropdown-item"
                    href="${p}dashboard.html"
                  >
                    <span class="as-dropdown-icon">
                      <i class="bi bi-speedometer2"></i>
                    </span>

                    <span>
                      <strong>Dashboard</strong>
                      <small>View your progress</small>
                    </span>
                  </a>
                </li>


                <li>
                  <hr class="dropdown-divider">
                </li>


                <!-- Sign Out -->
                <li>

                  <button
                    type="button"
                    class="dropdown-item as-dropdown-item as-signout-item"
                    onclick="_asHandleLogout()"
                  >

                    <span class="as-dropdown-icon">
                      <i class="bi bi-box-arrow-right"></i>
                    </span>

                    <span>
                      <strong>Sign out</strong>
                      <small>End your current session</small>
                    </span>

                  </button>

                </li>

              </ul>

            </div>

          </div>

        </div>

      </div>

    </nav>
  `;


  /*
   * Update username visibility through the existing
   * authentication system.
   */
  if (typeof paintUserName === "function") {
    paintUserName();
  }


  /*
   * Bootstrap dropdown/mobile navbar works automatically
   * because Bootstrap JS is already loaded in the project.
   */
}


/* ---------------------------------------------------------
   Logout Handler
--------------------------------------------------------- */

function _asHandleLogout() {

  const confirmed = window.confirm(
    "Are you sure you want to sign out of AapdaSetu AI?"
  );

  if (!confirmed) return;


  /*
   * Use the existing logout() function from auth.js
   * so the authentication logic stays centralized.
   */
  if (typeof logout === "function") {

    logout();

  } else {

    /*
     * Fallback if auth.js is unavailable.
     */
    localStorage.removeItem("user");
    localStorage.removeItem("token");

    window.location.href = "login.html";
  }
}


/* ---------------------------------------------------------
   Footer
--------------------------------------------------------- */

function renderFooter() {

  const root = document.getElementById("as-footer-root");

  if (!root) return;

  const p = _asPrefix();
  const year = new Date().getFullYear();


  root.innerHTML = `

    <footer class="as-footer">

      <div class="container">

        <div class="row gy-4">

          <!-- Brand -->
          <div class="col-md-4">

            <div class="as-footer-brand mb-2">

              <i class="bi bi-shield-check me-2"></i>

              AapdaSetu AI

            </div>

            <p class="small mb-0">

              Learn. Simulate. Prepare. Respond.

              <br>

              An AI-powered disaster preparedness,
              training and simulation platform.

            </p>

          </div>


          <!-- Platform -->
          <div class="col-md-2">

            <h6 class="text-white">
              Platform
            </h6>

            <ul class="list-unstyled small">

              <li>
                <a href="${p}modules.html">
                  Learn
                </a>
              </li>

              <li>
                <a href="${p}simulation.html">
                  Simulations
                </a>
              </li>

              <li>
                <a href="${p}predictor.html">
                  Risk Predictor
                </a>
              </li>

              <li>
                <a href="${p}ai-assistant.html">
                  AI Assistant
                </a>
              </li>

            </ul>

          </div>


          <!-- Account -->
          <div class="col-md-3">

            <h6 class="text-white">
              Account
            </h6>

            <ul class="list-unstyled small">

              <li>
                <a href="${p}dashboard.html">
                  Dashboard
                </a>
              </li>

              <li>
                <a href="${p}profile.html">
                  Profile
                </a>
              </li>

              <li>
                <a href="${p}login.html">
                  Login
                </a>
              </li>

            </ul>

          </div>


          <!-- Important -->
          <div class="col-md-3">

            <h6 class="text-white">
              Important
            </h6>

            <p class="small mb-0">

              AapdaSetu AI is an educational
              preparedness platform. It does not replace
              official emergency services — always follow
              local authority guidance in a real emergency.

            </p>

          </div>

        </div>


        <hr class="border-secondary my-4">


        <p class="small mb-0 text-center">

          &copy; ${year} AapdaSetu AI.
          Built for education and disaster-preparedness training.

        </p>

      </div>

    </footer>

  `;
}


/* ---------------------------------------------------------
   Initialize
--------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {

  renderNavbar();

  renderFooter();

});