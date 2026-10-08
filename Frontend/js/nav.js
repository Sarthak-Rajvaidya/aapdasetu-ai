/**
 * ============================================================
 * AapdaSetu AI
 * Production Navbar + Footer
 * ============================================================
 *
 * Features:
 * - Responsive Bootstrap navbar
 * - Clean desktop navigation
 * - Logged-in user profile on far right
 * - Profile avatar + name + role
 * - Production-style profile dropdown
 * - Profile / Dashboard / Account Settings / Sign Out
 * - Guest Login / Register buttons
 * - Automatic active navigation item
 * - Works with pages inside disaster subfolders
 * - Preserves existing authentication logic
 * ============================================================
 */


/* ============================================================
   PATH HELPER
   ============================================================ */

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


/* ============================================================
   HTML ESCAPE HELPER
   Prevents user profile data from being injected directly
   into generated HTML.
   ============================================================ */

function _asEscapeHtml(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* ============================================================
   NAVIGATION LINK
   ============================================================ */

function _asNavLink(href, icon, label) {

    const current = window.location.pathname
        .split("/")
        .pop();

    const cleanHref = href
        .replace("../", "")
        .split("?")[0]
        .split("#")[0];

    const isActive = current === cleanHref;

    return `
        <li class="nav-item">

            <a
                class="nav-link${isActive ? " active" : ""}"
                href="${href}"
                ${isActive ? 'aria-current="page"' : ""}
            >

                <i class="bi ${icon}" aria-hidden="true"></i>

                <span>${label}</span>

            </a>

        </li>
    `;
}


/* ============================================================
   GET CURRENT USER
   ============================================================ */

function _asGetUser() {

    try {

        const user = localStorage.getItem("user");

        return user ? JSON.parse(user) : null;

    } catch (error) {

        console.error(
            "Unable to read user information:",
            error
        );

        return null;
    }
}


/* ============================================================
   GET USER INITIALS
   ============================================================ */

function _asGetInitials(user) {

    if (!user) {
        return "U";
    }

    const name =
        user.name ||
        user.user_id ||
        "User";

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

    return name
        .substring(0, 2)
        .toUpperCase();
}


/* ============================================================
   FORMAT USER ROLE
   ============================================================ */

function _asFormatRole(role) {

    if (!role) {
        return "Student";
    }

    const normalized = String(role)
        .trim()
        .toLowerCase();

    const roleMap = {
        student: "Student",
        elderly: "Elderly",
        admin: "Administrator",
        administrator: "Administrator"
    };

    return roleMap[normalized] ||
        normalized.charAt(0).toUpperCase() +
        normalized.slice(1);
}


/* ============================================================
   RENDER NAVBAR
   ============================================================ */

function renderNavbar() {

    const root =
        document.getElementById("as-navbar-root");

    if (!root) {
        return;
    }

    const p = _asPrefix();

    const user = _asGetUser();

    const isLoggedIn = Boolean(user);


    /* ---------------------------------------------------------
       User information
       --------------------------------------------------------- */

    const userName = user
        ? (
            user.name ||
            user.user_id ||
            "User"
        )
        : "User";


    const userEmail = user
        ? (
            user.email ||
            user.user_id ||
            ""
        )
        : "";


    const userRole = _asFormatRole(
        user?.role
    );


    const initials =
        _asGetInitials(user);


    /* ---------------------------------------------------------
       Escape user-controlled values
       --------------------------------------------------------- */

    const safeUserName =
        _asEscapeHtml(userName);

    const safeUserEmail =
        _asEscapeHtml(userEmail);

    const safeUserRole =
        _asEscapeHtml(userRole);

    const safeInitials =
        _asEscapeHtml(initials);


    /* =========================================================
       NAVBAR HTML
       ========================================================= */

    root.innerHTML = `

        <nav
            class="navbar navbar-expand-lg as-navbar sticky-top"
            aria-label="Main navigation"
        >

            <div class="container-fluid as-navbar-container">


                <!-- =================================================
                     BRAND
                     ================================================= -->

                <a
                    class="navbar-brand as-brand"
                    href="${p}index.html"
                    aria-label="AapdaSetu AI Home"
                >

                    <span class="as-logo-badge">

                        <i
                            class="bi bi-shield-check"
                            aria-hidden="true"
                        ></i>

                    </span>


                    <span class="as-brand-text">

                        AapdaSetu
                        <span class="as-brand-ai">
                            AI
                        </span>

                    </span>

                </a>


                <!-- =================================================
                     MOBILE TOGGLE
                     ================================================= -->

                <button
                    class="navbar-toggler"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#asNavCollapse"
                    aria-controls="asNavCollapse"
                    aria-expanded="false"
                    aria-label="Toggle navigation"
                >

                    <i
                        class="bi bi-list"
                        aria-hidden="true"
                    ></i>

                </button>


                <!-- =================================================
                     NAVBAR CONTENT
                     ================================================= -->

                <div
                    class="collapse navbar-collapse"
                    id="asNavCollapse"
                >


                    <!-- =================================================
                         MAIN NAVIGATION

                         me-auto pushes the profile section to the
                         far right on desktop.
                         ================================================= -->

                    <ul
                        class="navbar-nav as-main-nav me-auto"
                    >

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


                    <!-- =================================================
                         RIGHT SIDE
                         ================================================= -->

                    <div class="as-navbar-right">


                        <!-- =================================================
                             GUEST ACTIONS
                             ================================================= -->

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


                        <!-- =================================================
                             LOGGED-IN USER
                             ================================================= -->

                        <div
                            class="dropdown as-profile-wrapper as-nav-actions"
                            data-auth-show
                            style="display: none;"
                        >

                            <!-- =================================================
                                 PROFILE BUTTON
                                 ================================================= -->

                            <button
                                class="btn as-user-chip"
                                type="button"
                                id="asProfileDropdown"
                                data-bs-toggle="dropdown"
                                data-bs-auto-close="outside"
                                aria-expanded="false"
                                aria-label="Open account menu"
                            >

                                <!-- Avatar -->

                                <span
                                    class="as-avatar"
                                    aria-hidden="true"
                                >
                                    ${safeInitials}
                                </span>


                                <!-- User information -->

                                <span class="as-user-meta">

                                    <span class="as-user-name">
                                        ${safeUserName}
                                    </span>

                                    <span class="as-user-role">
                                        ${safeUserRole}
                                    </span>

                                </span>


                                <!-- Chevron -->

                                <i
                                    class="bi bi-chevron-down as-chevron"
                                    aria-hidden="true"
                                ></i>

                            </button>


                            <!-- =================================================
                                 PROFILE DROPDOWN
                                 ================================================= -->

                            <ul
                                class="dropdown-menu dropdown-menu-end as-user-menu"
                                aria-labelledby="asProfileDropdown"
                            >


                                <!-- Dropdown header -->

                                <li class="as-user-menu-header">

                                    <div class="d-flex align-items-center gap-3">

                                        <span
                                            class="as-avatar"
                                            aria-hidden="true"
                                        >
                                            ${safeInitials}
                                        </span>


                                        <div>

                                            <div class="as-user-name">
                                                ${safeUserName}
                                            </div>

                                            <div class="as-user-role">
                                                ${safeUserEmail || safeUserRole}
                                            </div>

                                        </div>

                                    </div>

                                </li>


                                <li>
                                    <hr class="dropdown-divider">
                                </li>


                                <!-- Profile -->

                                <li>

                                    <a
                                        class="dropdown-item"
                                        href="${p}profile.html"
                                    >

                                        <i
                                            class="bi bi-person"
                                            aria-hidden="true"
                                        ></i>

                                        <span>
                                            Profile
                                        </span>

                                    </a>

                                </li>


                                <!-- Dashboard -->

                                <li>

                                    <a
                                        class="dropdown-item"
                                        href="${p}dashboard.html"
                                    >

                                        <i
                                            class="bi bi-grid-1x2"
                                            aria-hidden="true"
                                        ></i>

                                        <span>
                                            Dashboard
                                        </span>

                                    </a>

                                </li>


                                <!-- Account Settings -->

                                <li>

                                    <a
                                        class="dropdown-item"
                                        href="${p}profile.html"
                                    >

                                        <i
                                            class="bi bi-gear"
                                            aria-hidden="true"
                                        ></i>

                                        <span>
                                            Account Settings
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
                                        class="dropdown-item as-signout-item"
                                        onclick="_asHandleLogout()"
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


    /* =========================================================
       Existing authentication username system

       Keep this because your project may use paintUserName()
       on dashboard and other pages.
       ========================================================= */

    if (typeof paintUserName === "function") {
        paintUserName();
    }
}


/* ============================================================
   LOGOUT HANDLER
   ============================================================ */

function _asHandleLogout() {

    const confirmed = window.confirm(
        "Are you sure you want to sign out of AapdaSetu AI?"
    );

    if (!confirmed) {
        return;
    }


    /* ---------------------------------------------------------
       Use existing auth.js logout function whenever available.
       --------------------------------------------------------- */

    if (typeof logout === "function") {

        logout();

        return;
    }


    /* ---------------------------------------------------------
       Fallback if auth.js is unavailable.
       --------------------------------------------------------- */

    localStorage.removeItem("user");
    localStorage.removeItem("token");

    window.location.href =
        `${_asPrefix()}login.html`;
}


/* ============================================================
   FOOTER
   ============================================================ */

function renderFooter() {

    const root =
        document.getElementById("as-footer-root");

    if (!root) {
        return;
    }

    const p = _asPrefix();

    const year =
        new Date().getFullYear();


    root.innerHTML = `

        <footer class="as-footer">

            <div class="container">

                <div class="row gy-4">


                    <!-- =================================================
                         BRAND
                         ================================================= -->

                    <div class="col-md-4">

                        <div class="as-footer-brand mb-2">

                            <i
                                class="bi bi-shield-check me-2"
                                aria-hidden="true"
                            ></i>

                            AapdaSetu AI

                        </div>


                        <p class="small mb-0">

                            Learn. Simulate. Prepare. Respond.

                            <br>

                            An AI-powered disaster preparedness,
                            training and simulation platform.

                        </p>

                    </div>


                    <!-- =================================================
                         PLATFORM
                         ================================================= -->

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


                    <!-- =================================================
                         ACCOUNT
                         ================================================= -->

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


                    <!-- =================================================
                         IMPORTANT
                         ================================================= -->

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


/* ============================================================
   INITIALIZE
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        renderNavbar();

        renderFooter();

    }
);