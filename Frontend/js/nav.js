/**
 * AapdaSetu AI — Shared Navigation
 * ---------------------------------
 * Renders the platform navbar and footer.
 *
 * Authentication-aware:
 *   Guest  -> Login / Register
 *   User   -> Profile chip + dropdown + Sign out
 *
 * Depends on:
 *   - js/auth.js
 *   - Bootstrap 5 bundle
 */

"use strict";


/* ============================================================================
   PATH HELPERS
   ============================================================================ */

function _asPrefix() {

  const subfolders = [
    "earthquake",
    "flood",
    "tornado",
    "wildfire",
    "cyclone"
  ];

  const pathname =
    window.location.pathname;

  const inSubfolder =
    subfolders.some(
      (folder) =>
        pathname.includes(`/${folder}/`)
    );

  return inSubfolder ? "../" : "";
}


/* ============================================================================
   CURRENT PAGE
   ============================================================================ */

function _asCurrentPage() {

  const pathname =
    window.location.pathname;

  const page =
    pathname.split("/").pop();

  return page || "index.html";
}


/* ============================================================================
   NAVIGATION LINK
   ============================================================================ */

function _asNavLink(
  href,
  icon,
  label
) {

  const current =
    _asCurrentPage();

  const cleanHref =
    href.replace("../", "");

  const isActive =
    current === cleanHref;

  return `
    <li class="nav-item">

      <a
        class="nav-link${isActive ? " active" : ""}"
        href="${href}"
        ${isActive ? 'aria-current="page"' : ""}
      >

        <i
          class="bi ${icon}"
          aria-hidden="true"
        ></i>

        <span>${label}</span>

      </a>

    </li>
  `;
}


/* ============================================================================
   USER HELPERS
   ============================================================================ */

function _asGetUser() {

  try {

    if (typeof getCurrentUser === "function") {
      return getCurrentUser();
    }

    const raw =
      localStorage.getItem("user");

    return raw
      ? JSON.parse(raw)
      : null;

  } catch (error) {

    console.warn(
      "AapdaSetu: unable to read cached user.",
      error
    );

    return null;
  }
}


function _asInitials(user) {

  if (!user) {
    return "G";
  }

  const name =
    String(
      user.name ||
      user.user_id ||
      "User"
    ).trim();


  const parts =
    name
      .split(/\s+/)
      .filter(Boolean);


  if (parts.length >= 2) {

    return (
      parts[0][0] +
      parts[parts.length - 1][0]
    ).toUpperCase();

  }


  return name
    .substring(0, 2)
    .toUpperCase();
}


function _asRoleLabel(role) {

  const roles = {
    student: "Student",
    elderly: "Learner",
    admin: "Administrator"
  };

  return roles[role] ||
    "Learner";
}


/* ============================================================================
   NAVBAR
   ============================================================================ */

function renderNavbar() {

  const root =
    document.getElementById(
      "as-navbar-root"
    );

  if (!root) {
    return;
  }


  const prefix =
    _asPrefix();


  root.innerHTML = `

    <nav
      class="navbar
             navbar-expand-lg
             as-navbar
             sticky-top"
      aria-label="Primary navigation"
    >

      <div class="container-fluid px-3 px-xl-4">


        <!-- ================================================================
             BRAND
             ================================================================ -->

        <a
          class="navbar-brand"
          href="${prefix}index.html"
          aria-label="AapdaSetu AI home"
        >

          <span
            class="as-logo-badge"
            aria-hidden="true"
          >
            <i class="bi bi-shield-check"></i>
          </span>

          <span>
            AapdaSetu
            <span class="as-brand-ai">AI</span>
          </span>

        </a>


        <!-- ================================================================
             MOBILE TOGGLER
             ================================================================ -->

        <button
          class="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#asNavCollapse"
          aria-controls="asNavCollapse"
          aria-expanded="false"
          aria-label="Open navigation menu"
        >

          <span
            class="navbar-toggler-icon"
          ></span>

        </button>


        <!-- ================================================================
             NAVIGATION
             ================================================================ -->

        <div
          class="collapse navbar-collapse"
          id="asNavCollapse"
        >


          <ul
            class="navbar-nav
                   mx-auto
                   mb-2
                   mb-lg-0"
          >

            ${_asNavLink(
              prefix + "dashboard.html",
              "bi-speedometer2",
              "Dashboard"
            )}

            ${_asNavLink(
              prefix + "modules.html",
              "bi-journal-bookmark",
              "Learn"
            )}

            ${_asNavLink(
              prefix + "simulation.html",
              "bi-broadcast",
              "Simulations"
            )}

            ${_asNavLink(
              prefix + "ai-assistant.html",
              "bi-stars",
              "AI Assistant"
            )}

            ${_asNavLink(
              prefix + "predictor.html",
              "bi-graph-up-arrow",
              "Risk Predictor"
            )}

          </ul>


          <!-- ==============================================================
               RIGHT SIDE — GUEST
               ============================================================== -->

          <div
            class="as-nav-actions"
            data-guest-show
          >

            <a
              href="${prefix}login.html"
              class="btn btn-as-outline"
            >
              Sign in
            </a>

            <a
              href="${prefix}register.html"
              class="btn btn-as-primary"
            >
              Get started
            </a>

          </div>


          <!-- ==============================================================
               RIGHT SIDE — AUTHENTICATED USER
               ============================================================== -->

          <div
            class="as-nav-actions"
            data-auth-show
            style="display:none;"
          >

            <div
              class="dropdown as-user-dropdown"
            >

              <button
                class="as-user-chip
                       dropdown-toggle"
                type="button"

                id="asUserMenuButton"

                data-bs-toggle="dropdown"

                data-bs-display="static"

                aria-expanded="false"

                aria-label="Open account menu"
              >

                <!-- Avatar -->

                <span
                  class="as-avatar"
                  data-user-initials
                  aria-hidden="true"
                >
                  U
                </span>


                <!-- User information -->

                <span class="as-user-meta">

                  <span
                    class="as-user-name"
                    data-user-name
                  >
                    User
                  </span>

                  <span
                    class="as-user-role"
                    data-user-role
                  >
                    Learner
                  </span>

                </span>


                <i
                  class="bi bi-chevron-down as-chevron"
                  aria-hidden="true"
                ></i>

              </button>


              <!-- ==========================================================
                   USER DROPDOWN
                   ========================================================== -->

              <ul
                class="dropdown-menu
                       dropdown-menu-end
                       as-user-menu"
                aria-labelledby="asUserMenuButton"
              >

                <li>

                  <div
                    class="as-user-menu-header"
                  >

                    <span
                      class="as-avatar as-avatar-lg"
                      data-user-initials
                      aria-hidden="true"
                    >
                      U
                    </span>

                    <div
                      class="overflow-hidden"
                    >

                      <div
                        class="fw-semibold
                               text-truncate"
                        data-user-name
                      >
                        User
                      </div>

                      <div
                        class="small
                               text-white-50
                               text-truncate"
                        data-user-role
                      >
                        Learner
                      </div>

                    </div>

                  </div>

                </li>


                <li>
                  <hr class="dropdown-divider">
                </li>


                <li>

                  <a
                    class="dropdown-item"
                    href="${prefix}dashboard.html"
                  >

                    <i
                      class="bi bi-speedometer2"
                      aria-hidden="true"
                    ></i>

                    <span>
                      Dashboard
                    </span>

                  </a>

                </li>


                <li>

                  <a
                    class="dropdown-item"
                    href="${prefix}profile.html"
                  >

                    <i
                      class="bi bi-person-circle"
                      aria-hidden="true"
                    ></i>

                    <span>
                      My Profile
                    </span>

                  </a>

                </li>


                <li>

                  <a
                    class="dropdown-item"
                    href="${prefix}ai-assistant.html"
                  >

                    <i
                      class="bi bi-stars"
                      aria-hidden="true"
                    ></i>

                    <span>
                      AI Assistant
                    </span>

                  </a>

                </li>


                <li>
                  <hr class="dropdown-divider">
                </li>


                <li>

                  <button
                    type="button"
                    class="dropdown-item text-danger"
                    data-as-logout
                  >

                    <i
                      class="bi bi-box-arrow-right"
                      aria-hidden="true"
                    ></i>

                    <span>
                      Sign out
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
   * Populate user information.
   */

  paintNavbarUser();


  /*
   * Logout handler.
   */

  const logoutButton =
    root.querySelector(
      "[data-as-logout]"
    );


  if (logoutButton) {

    logoutButton.addEventListener(
      "click",
      () => {

        const confirmed =
          window.confirm(
            "Are you sure you want to sign out of AapdaSetu AI?"
          );


        if (!confirmed) {
          return;
        }


        if (
          typeof logout === "function"
        ) {

          logout();

        } else {

          localStorage.removeItem(
            "token"
          );

          localStorage.removeItem(
            "user"
          );

          window.location.href =
            prefix + "login.html";
        }

      }
    );

  }


  /*
   * Close mobile navbar after selecting a link.
   */

  root
    .querySelectorAll(
      ".navbar-nav .nav-link"
    )
    .forEach((link) => {

      link.addEventListener(
        "click",
        () => {

          const collapseElement =
            document.getElementById(
              "asNavCollapse"
            );


          if (
            collapseElement &&
            window.bootstrap
          ) {

            const collapse =
              bootstrap.Collapse.getInstance(
                collapseElement
              );

            if (collapse) {
              collapse.hide();
            }

          }

        }
      );

    });

}


/* ============================================================================
   USER PAINTING
   ============================================================================ */

function paintNavbarUser() {

  const user =
    _asGetUser();


  const authElements =
    document.querySelectorAll(
      "[data-auth-show]"
    );

  const guestElements =
    document.querySelectorAll(
      "[data-guest-show]"
    );


  const isAuthenticated =
    Boolean(
      user &&
      (
        user.user_id ||
        user.name
      )
    );


  /*
   * Toggle guest/auth UI.
   */

  authElements.forEach((element) => {

    element.style.display =
      isAuthenticated
        ? ""
        : "none";

  });


  guestElements.forEach((element) => {

    element.style.display =
      isAuthenticated
        ? "none"
        : "";

  });


  if (!isAuthenticated) {
    return;
  }


  /*
   * Name.
   */

  const displayName =
    user.name ||
    user.user_id ||
    "User";


  document
    .querySelectorAll(
      "[data-user-name]"
    )
    .forEach((element) => {

      element.textContent =
        displayName;

  });


  /*
   * Role.
   */

  const role =
    _asRoleLabel(
      user.role
    );


  document
    .querySelectorAll(
      "[data-user-role]"
    )
    .forEach((element) => {

      element.textContent =
        role;

  });


  /*
   * Initials.
   */

  const initials =
    _asInitials(user);


  document
    .querySelectorAll(
      "[data-user-initials]"
    )
    .forEach((element) => {

      element.textContent =
        initials;

  });


  /*
   * Keep existing auth.js helper in sync.
   */

  if (
    typeof paintUserName === "function"
  ) {

    paintUserName();

  }

}


/* ============================================================================
   FOOTER
   ============================================================================ */

function renderFooter() {

  const root =
    document.getElementById(
      "as-footer-root"
    );

  if (!root) {
    return;
  }


  const prefix =
    _asPrefix();

  const year =
    new Date().getFullYear();


  root.innerHTML = `

    <footer
      class="as-footer"
      aria-label="Footer"
    >

      <div class="container">

        <div class="row gy-4">


          <!-- Brand -->

          <div class="col-md-5">

            <div
              class="as-footer-brand mb-2"
            >

              <i
                class="bi bi-shield-check me-2"
                aria-hidden="true"
              ></i>

              AapdaSetu AI

            </div>

            <p class="small mb-2">

              Learn. Simulate. Prepare. Respond.

            </p>

            <p class="small mb-0">

              An AI-powered educational platform for
              disaster preparedness, training and simulation.

            </p>

          </div>


          <!-- Platform -->

          <div class="col-6 col-md-2">

            <h6 class="text-white">
              Platform
            </h6>

            <ul class="list-unstyled small">

              <li>
                <a href="${prefix}modules.html">
                  Learn
                </a>
              </li>

              <li>
                <a href="${prefix}simulation.html">
                  Simulations
                </a>
              </li>

              <li>
                <a href="${prefix}predictor.html">
                  Risk Predictor
                </a>
              </li>

              <li>
                <a href="${prefix}ai-assistant.html">
                  AI Assistant
                </a>
              </li>

            </ul>

          </div>


          <!-- Account -->

          <div class="col-6 col-md-2">

            <h6 class="text-white">
              Account
            </h6>

            <ul class="list-unstyled small">

              <li>
                <a href="${prefix}dashboard.html">
                  Dashboard
                </a>
              </li>

              <li>
                <a href="${prefix}profile.html">
                  Profile
                </a>
              </li>

              <li>
                <a href="${prefix}login.html">
                  Sign in
                </a>
              </li>

            </ul>

          </div>


          <!-- Safety -->

          <div class="col-md-3">

            <h6 class="text-white">
              Safety notice
            </h6>

            <p class="small mb-0">

              AapdaSetu AI is an educational preparedness
              platform. During a real emergency, always
              follow official local authority guidance.

            </p>

          </div>

        </div>


        <hr
          class="border-secondary my-4"
        >


        <div
          class="d-flex
                 flex-column
                 flex-md-row
                 justify-content-between
                 align-items-center
                 gap-2"
        >

          <p class="small mb-0">

            &copy;
            ${year}
            AapdaSetu AI.

          </p>


          <p class="small mb-0">

            Built for disaster-preparedness education.

          </p>

        </div>

      </div>

    </footer>
  `;
}


/* ============================================================================
   INITIALIZATION
   ============================================================================ */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    renderNavbar();

    renderFooter();

  }
);