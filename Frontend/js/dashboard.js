/*
 * =========================================================================
 * AapdaSetu AI — Production Dashboard
 * =========================================================================
 *
 * Responsibilities:
 * - Load dashboard data from /api/dashboard
 * - Render KPI cards
 * - Render readiness score
 * - Render capability breakdown
 * - Render performance trend
 * - Render simulation radar
 * - Render capability bar chart
 * - Render course progress
 * - Render recommended next action
 * - Render achievements
 * - Render 28-day activity heatmap
 * - Render recent activity
 *
 * =========================================================================
 */

"use strict";


/* =========================================================================
   Global State
   ========================================================================= */

let dashboardData = null;

let performanceChart = null;
let simulationRadarChart = null;
let capabilityChart = null;


/* =========================================================================
   DOM Helpers
   ========================================================================= */

function $(id) {
  return document.getElementById(id);
}


function setText(id, value) {
  const element = $(id);

  if (element) {
    element.textContent = value;
  }
}


function escapeHtml(value) {

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


function show(element) {

  if (!element) return;

  element.classList.remove("d-none");
}


function hide(element) {

  if (!element) return;

  element.classList.add("d-none");
}


/* =========================================================================
   Number Helpers
   ========================================================================= */

function toNumber(value, fallback = 0) {

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}


function clamp(value, min = 0, max = 100) {

  return Math.min(
    max,
    Math.max(min, toNumber(value))
  );
}


function roundNumber(value) {

  return Math.round(
    toNumber(value)
  );
}


/* =========================================================================
   Date Helpers
   ========================================================================= */

function parseDate(value) {

  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}


function formatDate(value) {

  const date = parseDate(value);

  if (!date) {
    return "Unknown date";
  }

  return date.toLocaleDateString(
    undefined,
    {
      day: "numeric",
      month: "short",
      year: "numeric"
    }
  );
}


function formatShortDate(value) {

  const date = parseDate(value);

  if (!date) {
    return "";
  }

  return date.toLocaleDateString(
    undefined,
    {
      day: "numeric",
      month: "short"
    }
  );
}


function timeAgo(value) {

  const date = parseDate(value);

  if (!date) {
    return "";
  }

  const now = new Date();

  const diff = now.getTime() - date.getTime();

  const seconds = Math.floor(diff / 1000);

  if (seconds < 45) {
    return "Just now";
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  return formatDate(value);
}


/* =========================================================================
   User
   ========================================================================= */

function getCurrentUser() {

  try {

    const rawUser = localStorage.getItem("user");

    if (!rawUser) {
      return null;
    }

    return JSON.parse(rawUser);

  } catch (error) {

    console.error(
      "Unable to read current user:",
      error
    );

    return null;
  }
}


function getUserName() {

  const user = getCurrentUser();

  if (!user) {
    return "there";
  }

  return (
    user.name ||
    user.full_name ||
    user.username ||
    user.user_id ||
    "there"
  );
}


function renderUserName() {

  document
    .querySelectorAll("[data-user-name]")
    .forEach(element => {

      element.textContent = getUserName();

    });

}


/* =========================================================================
   Dashboard API
   ========================================================================= */

async function loadDashboard() {

  try {

    /*
     * The project already provides api.js.
     * Prefer its authenticated request helper when available.
     */

    let response;


    if (typeof apiFetch === "function") {

      response = await apiFetch(
        "/api/dashboard"
      );

    } else if (typeof apiRequest === "function") {

      response = await apiRequest(
        "/api/dashboard"
      );

    } else {

      /*
       * Fallback for installations where api.js exposes
       * only the API_BASE_URL/configuration.
       */

      const config =
        window.APP_CONFIG ||
        window.API_CONFIG ||
        {};

      const baseUrl =
        config.API_BASE_URL ||
        config.API_URL ||
        window.API_BASE_URL ||
        "";

      const token =
        localStorage.getItem("token");

      response = await fetch(
        `${baseUrl}/api/dashboard`,
        {
          method: "GET",
          headers: {
            "Accept": "application/json",
            ...(token
              ? {
                  "Authorization":
                    `Bearer ${token}`
                }
              : {})
          }
        }
      );

    }


    if (!response) {

      throw new Error(
        "No response received from dashboard API."
      );

    }


    /*
     * Support both:
     *
     * fetch Response
     *
     * and
     *
     * already-parsed JSON
     */

    if (
      typeof response.json === "function"
    ) {

      if (!response.ok) {

        throw new Error(
          `Dashboard request failed (${response.status}).`
        );

      }

      return await response.json();

    }


    return response;

  } catch (error) {

    console.error(
      "Dashboard loading error:",
      error
    );

    throw error;
  }
}


/* =========================================================================
   Normalize Dashboard Data
   ========================================================================= */

function normalizeDashboardData(data) {

  if (!data || typeof data !== "object") {
    return {};
  }


  /*
   * Some API implementations return:
   *
   * {
   *   data: {...}
   * }
   *
   * while others return the object directly.
   */

  if (
    data.data &&
    typeof data.data === "object"
  ) {

    return data.data;

  }


  return data;
}


/* =========================================================================
   Readiness Helpers
   ========================================================================= */

function getReadinessStatus(score) {

  score = clamp(score);


  if (score >= 90) {

    return {
      label: "Excellent readiness",
      shortLabel: "Excellent",
      message:
        "You are demonstrating strong disaster-preparedness skills across the platform.",
      className: "excellent"
    };

  }


  if (score >= 75) {

    return {
      label: "Strong readiness",
      shortLabel: "Strong",
      message:
        "Your preparedness is strong. Keep practicing to maintain your response confidence.",
      className: "strong"
    };

  }


  if (score >= 60) {

    return {
      label: "Good readiness",
      shortLabel: "Good",
      message:
        "You are building a solid preparedness foundation. Focus on your weaker areas next.",
      className: "good"
    };

  }


  if (score >= 40) {

    return {
      label: "Developing readiness",
      shortLabel: "Developing",
      message:
        "Your preparedness is developing. Complete more training and simulations to improve.",
      className: "developing"
    };

  }


  return {
    label: "Needs attention",
    shortLabel: "Needs attention",
    message:
      "Start with the recommended training activities to build your disaster-readiness foundation.",
    className: "attention"
  };

}


/* =========================================================================
   KPI Rendering
   ========================================================================= */

function renderKpis(data) {

  const readiness =
    clamp(
      data.readiness_score ??
      data.readiness ??
      data.overall_readiness
    );


  const quizAverage =
    clamp(
      data.quiz_average ??
      data.quiz_avg ??
      data.average_quiz_score
    );


  const simulationCount =
    toNumber(
      data.simulation_count ??
      data.simulations_completed ??
      data.total_simulations
    );


  const simulationAverage =
    clamp(
      data.simulation_average ??
      data.simulation_avg ??
      data.average_simulation_score
    );


  const completedCourses =
    toNumber(
      data.completed_courses ??
      data.courses_completed
    );


  const totalCourses =
    toNumber(
      data.total_courses ??
      data.course_count
    );


  const activeDays =
    toNumber(
      data.active_days ??
      data.activity_days
    );


  setText(
    "statReadiness",
    `${roundNumber(readiness)}%`
  );


  setText(
    "statQuiz",
    `${roundNumber(quizAverage)}%`
  );


  setText(
    "statSimulations",
    simulationCount
  );


  if (simulationCount > 0) {

    setText(
      "statSimulationAvg",
      `${roundNumber(simulationAverage)}% average score`
    );

  } else {

    setText(
      "statSimulationAvg",
      "No attempts yet"
    );

  }


  setText(
    "statCourses",
    `${completedCourses} / ${totalCourses}`
  );


  if (activeDays > 0) {

    setText(
      "statActivityDays",
      `${activeDays} active day${activeDays === 1 ? "" : "s"}`
    );

  } else {

    setText(
      "statActivityDays",
      "No activity recorded yet"
    );

  }


  const status =
    getReadinessStatus(readiness);


  setText(
    "readinessStatus",
    status.shortLabel
  );


  setText(
    "readinessStatusLarge",
    status.label
  );


  setText(
    "readinessMessage",
    status.message
  );


  setText(
    "readinessOverall",
    `${roundNumber(readiness)}%`
  );


  setText(
    "readinessBadge",
    `${roundNumber(readiness)}%`
  );


  const ring =
    $("readinessRing");


  if (ring) {

    ring.style.setProperty(
      "--pct",
      readiness
    );

    ring.dataset.status =
      status.className;

  }

}


/* =========================================================================
   Capability Data
   ========================================================================= */

function getCapabilityData(data) {

  const source =
    data.capabilities ||
    data.readiness_breakdown ||
    data.breakdown ||
    {};


  return {

    knowledge: clamp(
      source.knowledge ??
      data.knowledge_score ??
      data.knowledge
    ),

    decision: clamp(
      source.decision ??
      source.decision_making ??
      data.decision_score ??
      data.decision_accuracy
    ),

    response: clamp(
      source.response ??
      source.emergency_response ??
      data.response_score ??
      data.response_time_score
    ),

    awareness: clamp(
      source.awareness ??
      source.disaster_awareness ??
      data.awareness_score ??
      data.safety_awareness
    )

  };

}


/* =========================================================================
   Capability Breakdown
   ========================================================================= */

function renderCapabilityBreakdown(data) {

  const container =
    $("readinessBreakdown");

  if (!container) return;


  const capability =
    getCapabilityData(data);


  const items = [

    {
      key: "knowledge",
      label: "Knowledge",
      description: "Understanding of disaster preparedness",
      icon: "bi-book"
    },

    {
      key: "decision",
      label: "Decision making",
      description: "Quality of choices during scenarios",
      icon: "bi-signpost-split"
    },

    {
      key: "response",
      label: "Emergency response",
      description: "Speed and effectiveness of response",
      icon: "bi-lightning-charge"
    },

    {
      key: "awareness",
      label: "Disaster awareness",
      description: "Safety awareness and risk recognition",
      icon: "bi-eye"
    }

  ];


  container.innerHTML =
    items
      .map(item => {

        const value =
          roundNumber(
            capability[item.key]
          );


        return `

          <div class="as-capability-row">

            <div class="as-capability-icon">

              <i class="bi ${item.icon}"></i>

            </div>


            <div class="as-capability-content">

              <div class="as-capability-heading">

                <div>

                  <strong>
                    ${escapeHtml(item.label)}
                  </strong>

                  <small>
                    ${escapeHtml(item.description)}
                  </small>

                </div>


                <span>
                  ${value}%
                </span>

              </div>


              <div class="as-capability-track">

                <span
                  style="width:${value}%"
                ></span>

              </div>

            </div>

          </div>

        `;

      })
      .join("");

}


/* =========================================================================
   Chart Defaults
   ========================================================================= */

function setupChartDefaults() {

  if (
    typeof Chart === "undefined"
  ) {

    console.warn(
      "Chart.js is not loaded."
    );

    return;

  }


  Chart.defaults.font.family =
    '"Inter", "Segoe UI", system-ui, sans-serif';

  Chart.defaults.color =
    "#5b6b83";

  Chart.defaults.animation.duration =
    700;

}


/* =========================================================================
   Chart Utilities
   ========================================================================= */

function destroyChart(chart) {

  if (chart) {

    try {
      chart.destroy();
    } catch (error) {
      console.warn(
        "Unable to destroy chart:",
        error
      );
    }

  }

}


/* =========================================================================
   Performance Trend Data
   ========================================================================= */

function getPerformanceTrend(data) {

  const source =
    data.performance_trend ||
    data.performance_history ||
    data.trend ||
    [];


  if (!Array.isArray(source)) {
    return [];
  }


  return source
    .map(item => {

      const score =
        clamp(
          item.score ??
          item.value ??
          item.percentage
        );


      const date =
        item.date ??
        item.completed_at ??
        item.created_at ??
        item.timestamp;


      return {

        date,

        score,

        type:
          item.type ||
          item.activity_type ||
          "activity"

      };

    })
    .filter(item => item.date)
    .sort(
      (a, b) =>
        new Date(a.date) -
        new Date(b.date)
    )
    .slice(-30);

}


/* =========================================================================
   Performance Trend Chart
   ========================================================================= */

function renderPerformanceChart(data) {

  const canvas =
    $("performanceChart");

  const empty =
    $("performanceEmpty");


  if (!canvas) return;


  const trend =
    getPerformanceTrend(data);


  destroyChart(
    performanceChart
  );


  if (
    typeof Chart === "undefined"
  ) {

    hide(canvas);
    show(empty);

    return;
  }


  if (trend.length === 0) {

    hide(canvas);
    show(empty);

    return;

  }


  show(canvas);
  hide(empty);


  const labels =
    trend.map(item =>
      formatShortDate(item.date)
    );


  const scores =
    trend.map(item =>
      roundNumber(item.score)
    );


  performanceChart =
    new Chart(
      canvas.getContext("2d"),
      {

        type: "line",

        data: {

          labels,

          datasets: [

            {

              label: "Performance",

              data: scores,

              borderColor: "#2f6fed",

              backgroundColor:
                "rgba(47, 111, 237, 0.10)",

              borderWidth: 3,

              pointRadius: 4,

              pointHoverRadius: 6,

              pointBackgroundColor:
                "#ffffff",

              pointBorderColor:
                "#2f6fed",

              pointBorderWidth: 2,

              fill: true,

              tension: 0.38

            }

          ]

        },


        options: {

          responsive: true,

          maintainAspectRatio: false,

          interaction: {

            intersect: false,

            mode: "index"

          },


          plugins: {

            legend: {

              display: false

            },


            tooltip: {

              backgroundColor:
                "#0b1a30",

              titleColor:
                "#ffffff",

              bodyColor:
                "#dce7f5",

              padding: 12,

              displayColors: false,

              callbacks: {

                label(context) {

                  return `Score: ${context.parsed.y}%`;

                }

              }

            }

          },


          scales: {

            x: {

              grid: {

                display: false

              },

              ticks: {

                maxTicksLimit: 8,

                color: "#7a8ba5"

              }

            },


            y: {

              min: 0,

              max: 100,

              ticks: {

                stepSize: 20,

                callback(value) {

                  return `${value}%`;

                },

                color: "#7a8ba5"

              },

              grid: {

                color:
                  "rgba(11, 26, 48, 0.07)"

              }

            }

          }

        }

      }
    );

}


/* =========================================================================
   Simulation Data
   ========================================================================= */

function getSimulationCapabilities(data) {

  const source =
    data.simulation_capabilities ||
    data.simulation_profile ||
    data.simulation_skills ||
    {};


  return {

    decision: clamp(
      source.decision_accuracy ??
      source.decision ??
      data.decision_accuracy
    ),

    response: clamp(
      source.response_time_score ??
      source.response ??
      data.response_time_score
    ),

    safety: clamp(
      source.safety_awareness ??
      source.safety ??
      data.safety_awareness
    ),

    resources: clamp(
      source.resource_management ??
      source.resources ??
      data.resource_management
    )

  };

}


/* =========================================================================
   Simulation Radar
   ========================================================================= */

function renderSimulationRadar(data) {

  const canvas =
    $("simulationRadar");

  const empty =
    $("simulationEmpty");


  if (!canvas) return;


  const simulationCount =
    toNumber(
      data.simulation_count ??
      data.simulations_completed
    );


  const values =
    getSimulationCapabilities(data);


  const hasData =
    simulationCount > 0 ||
    Object.values(values)
      .some(value => value > 0);


  destroyChart(
    simulationRadarChart
  );


  if (
    typeof Chart === "undefined" ||
    !hasData
  ) {

    hide(canvas);
    show(empty);

    return;

  }


  show(canvas);
  hide(empty);


  simulationRadarChart =
    new Chart(
      canvas.getContext("2d"),
      {

        type: "radar",

        data: {

          labels: [

            "Decision",
            "Response",
            "Safety",
            "Resources"

          ],


          datasets: [

            {

              label: "Current profile",

              data: [

                values.decision,
                values.response,
                values.safety,
                values.resources

              ],

              borderColor:
                "#2f6fed",

              backgroundColor:
                "rgba(47, 111, 237, 0.15)",

              pointBackgroundColor:
                "#22d3ee",

              pointBorderColor:
                "#ffffff",

              pointBorderWidth: 2,

              borderWidth: 2,

              pointRadius: 4

            }

          ]

        },


        options: {

          responsive: true,

          maintainAspectRatio: false,


          plugins: {

            legend: {

              display: false

            },


            tooltip: {

              callbacks: {

                label(context) {

                  return `${context.label}: ${Math.round(context.raw)}%`;

                }

              }

            }

          },


          scales: {

            r: {

              min: 0,

              max: 100,

              ticks: {

                stepSize: 20,

                backdropColor:
                  "transparent",

                color:
                  "#7a8ba5",

                callback(value) {

                  return `${value}%`;

                }

              },

              grid: {

                color:
                  "rgba(11, 26, 48, 0.10)"

              },

              angleLines: {

                color:
                  "rgba(11, 26, 48, 0.08)"

              },

              pointLabels: {

                color:
                  "#33445c",

                font: {

                  size: 12,

                  weight: "600"

                }

              }

            }

          }

        }

      }
    );

}


/* =========================================================================
   Capability Bar Chart
   ========================================================================= */

function renderCapabilityChart(data) {

  const canvas =
    $("capabilityChart");


  if (!canvas) return;


  const capability =
    getCapabilityData(data);


  destroyChart(
    capabilityChart
  );


  if (
    typeof Chart === "undefined"
  ) {

    return;

  }


  capabilityChart =
    new Chart(
      canvas.getContext("2d"),
      {

        type: "bar",

        data: {

          labels: [

            "Knowledge",
            "Decision",
            "Response",
            "Awareness"

          ],


          datasets: [

            {

              label: "Score",

              data: [

                capability.knowledge,
                capability.decision,
                capability.response,
                capability.awareness

              ],

              backgroundColor: [

                "rgba(47, 111, 237, 0.85)",
                "rgba(34, 211, 238, 0.85)",
                "rgba(34, 197, 94, 0.80)",
                "rgba(245, 158, 11, 0.82)"

              ],

              borderRadius: 7,

              borderSkipped: false

            }

          ]

        },


        options: {

          indexAxis: "y",

          responsive: true,

          maintainAspectRatio: false,


          plugins: {

            legend: {

              display: false

            },


            tooltip: {

              callbacks: {

                label(context) {

                  return `Score: ${Math.round(context.raw)}%`;

                }

              }

            }

          },


          scales: {

            x: {

              min: 0,

              max: 100,

              ticks: {

                stepSize: 20,

                callback(value) {

                  return `${value}%`;

                }

              },

              grid: {

                color:
                  "rgba(11, 26, 48, 0.07)"

              }

            },


            y: {

              grid: {

                display: false

              }

            }

          }

        }

      }
    );

}


/* =========================================================================
   Course Progress
   ========================================================================= */

function getCourses(data) {

  const courses =
    data.courses ||
    data.course_progress ||
    data.courses_progress ||
    [];


  if (!Array.isArray(courses)) {

    return [];

  }


  return courses.map(course => {

    return {

      id:
        course.id ??
        course.course_id,

      title:
        course.title ??
        course.name ??
        "Training module",

      progress:
        clamp(
          course.progress ??
          course.progress_percentage ??
          course.completion
        ),

      completed:
        Boolean(
          course.completed ??
          course.is_completed ??
          Number(course.progress) >= 100
        ),

      icon:
        course.icon ||
        "bi-book",

      href:
        course.href ||
        course.url ||
        "modules.html"

    };

  });

}


/* =========================================================================
   Course Progress Renderer
   ========================================================================= */

function renderCourseProgress(data) {

  const container =
    $("courseProgressList");

  if (!container) return;


  const courses =
    getCourses(data);


  if (courses.length === 0) {

    container.innerHTML = `

      <div class="as-empty-inline">

        <i class="bi bi-journal"></i>

        <div>

          <strong>
            No course progress yet
          </strong>

          <span>
            Start a learning module to track your progress here.
          </span>

        </div>

      </div>

    `;

    return;

  }


  container.innerHTML =
    courses
      .slice(0, 6)
      .map(course => {

        const progress =
          roundNumber(course.progress);


        return `

          <div class="as-course-item">

            <div class="as-course-icon">

              <i class="bi ${escapeHtml(course.icon)}"></i>

            </div>


            <div class="as-course-content">

              <div class="as-course-heading">

                <strong>
                  ${escapeHtml(course.title)}
                </strong>

                <span>
                  ${progress}%
                </span>

              </div>


              <div class="as-course-track">

                <span
                  style="width:${progress}%"
                ></span>

              </div>


              <div class="as-course-meta">

                <span>

                  ${
                    course.completed
                      ? '<i class="bi bi-check-circle-fill"></i> Completed'
                      : `${progress}% complete`
                  }

                </span>

                ${
                  course.completed
                    ? ""
                    : `<a href="${escapeHtml(course.href)}">
                         Continue
                         <i class="bi bi-arrow-right"></i>
                       </a>`
                }

              </div>

            </div>

          </div>

        `;

      })
      .join("");

}


/* =========================================================================
   Recommended Action
   ========================================================================= */

function renderNextAction(data) {

  const title =
    data.recommended_training ||
    data.recommendation_title ||
    data.next_action ||
    "Keep building readiness";


  const description =
    data.recommendation_reason ||
    data.recommendation_description ||
    "Complete a training activity to keep improving your disaster-readiness skills.";


  const href =
    data.recommendation_url ||
    data.next_action_url ||
    "simulation.html";


  const type =
    String(
      data.recommendation_type ||
      data.next_action_type ||
      "training"
    ).toLowerCase();


  setText(
    "nextActionTitle",
    title
  );


  setText(
    "nextActionDescription",
    description
  );


  const button =
    $("nextActionButton");


  if (button) {

    button.href = href;


    if (
      type.includes("course") ||
      type.includes("module")
    ) {

      button.innerHTML =
        'Continue training <i class="bi bi-arrow-right ms-1"></i>';

    } else if (
      type.includes("quiz")
    ) {

      button.innerHTML =
        'Take quiz <i class="bi bi-arrow-right ms-1"></i>';

    } else {

      button.innerHTML =
        'Explore simulations <i class="bi bi-arrow-right ms-1"></i>';

    }

  }


  const icon =
    $("nextActionIcon");


  if (icon) {

    let iconClass =
      "bi-lightbulb";


    if (
      type.includes("simulation")
    ) {

      iconClass =
        "bi-controller";

    } else if (
      type.includes("quiz")
    ) {

      iconClass =
        "bi-patch-question";

    } else if (
      type.includes("course") ||
      type.includes("module")
    ) {

      iconClass =
        "bi-journal-check";

    }


    icon.innerHTML =
      `<i class="bi ${iconClass}"></i>`;

  }

}


/* =========================================================================
   Achievements
   ========================================================================= */

function getAchievements(data) {

  const achievements =
    data.achievements ||
    data.unlocked_achievements ||
    [];


  if (!Array.isArray(achievements)) {

    return [];

  }


  return achievements;

}


/* =========================================================================
   Achievement Renderer
   ========================================================================= */

function renderAchievements(data) {

  const container =
    $("achievementList");

  if (!container) return;


  const achievements =
    getAchievements(data);


  const unlocked =
    toNumber(
      data.achievements_unlocked ??
      data.unlocked_count ??
      achievements.length
    );


  const total =
    toNumber(
      data.achievements_total ??
      data.total_achievements
    );


  setText(
    "achievementCount",
    total > 0
      ? `${unlocked} / ${total}`
      : `${unlocked}`
  );


  if (achievements.length === 0) {

    container.innerHTML = `

      <div class="as-empty-inline">

        <i class="bi bi-trophy"></i>

        <div>

          <strong>
            Your achievements will appear here
          </strong>

          <span>
            Complete training and simulations to unlock badges.
          </span>

        </div>

      </div>

    `;

    return;

  }


  container.innerHTML =
    achievements
      .slice(0, 4)
      .map(achievement => {

        const title =
          achievement.title ||
          achievement.name ||
          "Achievement";


        const description =
          achievement.description ||
          "Achievement unlocked";


        const icon =
          achievement.icon ||
          "bi-trophy";


        return `

          <div class="as-achievement-item">

            <div class="as-achievement-icon">

              <i class="bi ${escapeHtml(icon)}"></i>

            </div>


            <div>

              <strong>
                ${escapeHtml(title)}
              </strong>

              <span>
                ${escapeHtml(description)}
              </span>

            </div>

          </div>

        `;

      })
      .join("");

}


/* =========================================================================
   Streak
   ========================================================================= */

function renderStreak(data) {

  const streak =
    toNumber(
      data.streak ??
      data.active_streak ??
      data.streak_days
    );


  setText(
    "streakText",
    `${streak} active day${streak === 1 ? "" : "s"}`
  );

}


/* =========================================================================
   Activity Data
   ========================================================================= */

function getActivityHistory(data) {

  const source =
    data.activity_history ||
    data.activity ||
    data.activity_heatmap ||
    [];


  if (!Array.isArray(source)) {

    return [];

  }


  return source
    .map(item => {

      return {

        date:
          item.date ??
          item.activity_date,

        count:
          toNumber(
            item.count ??
            item.activities ??
            item.value
          )

      };

    })
    .filter(item => item.date);

}


/* =========================================================================
   Date Key
   ========================================================================= */

function dateKey(date) {

  const year =
    date.getFullYear();


  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");


  const day =
    String(
      date.getDate()
    ).padStart(2, "0");


  return `${year}-${month}-${day}`;

}


/* =========================================================================
   Activity Heatmap
   ========================================================================= */

function renderActivityHeatmap(data) {

  const container =
    $("activityHeatmap");

  if (!container) return;


  const activity =
    getActivityHistory(data);


  const activityMap =
    new Map();


  activity.forEach(item => {

    const date =
      parseDate(item.date);


    if (!date) return;


    activityMap.set(
      dateKey(date),
      item.count
    );

  });


  const today =
    new Date();


  today.setHours(
    0,
    0,
    0,
    0
  );


  const start =
    new Date(today);


  start.setDate(
    start.getDate() - 27
  );


  const cells = [];


  for (
    let i = 0;
    i < 28;
    i++
  ) {

    const current =
      new Date(start);


    current.setDate(
      start.getDate() + i
    );


    const key =
      dateKey(current);


    const count =
      activityMap.get(key) || 0;


    let level = 0;


    if (count >= 4) {

      level = 3;

    } else if (count >= 2) {

      level = 2;

    } else if (count >= 1) {

      level = 1;

    }


    cells.push({

      date: current,

      count,

      level

    });

  }


  container.innerHTML = `

    <div class="as-heatmap-grid">

      ${cells
        .map(cell => {

          return `

            <div
              class="as-heatmap-cell level-${cell.level}"
              title="${formatDate(cell.date)} · ${cell.count} activit${cell.count === 1 ? "y" : "ies"}"
              aria-label="${formatDate(cell.date)} · ${cell.count} activit${cell.count === 1 ? "y" : "ies"}"
            ></div>

          `;

        })
        .join("")}

    </div>

  `;

}


/* =========================================================================
   Recent Activity
   ========================================================================= */

function getRecentActivity(data) {

  const source =
    data.recent_activity ||
    data.activities ||
    [];


  if (Array.isArray(source)) {

    return source
      .map(item => {

        return {

          title:
            item.title ||
            item.name ||
            "Activity",

          type:
            item.type ||
            item.activity_type ||
            "activity",

          score:
            item.score ??
            item.percentage,

          completedAt:
            item.completed_at ||
            item.created_at ||
            item.timestamp,

          icon:
            item.icon ||
            null

        };

      })
      .filter(item => item.completedAt);

  }


  /*
   * Fallback:
   * build recent activity from quizzes and simulations
   * if the backend has not yet provided combined activity.
   */

  const activities = [];


  const quizzes =
    Array.isArray(data.recent_quizzes)
      ? data.recent_quizzes
      : [];


  const simulations =
    Array.isArray(data.recent_simulations)
      ? data.recent_simulations
      : [];


  quizzes.forEach(item => {

    activities.push({

      title:
        item.title ||
        item.quiz_name ||
        "Safety quiz",

      type: "quiz",

      score:
        item.score ??
        item.percentage,

      completedAt:
        item.completed_at ||
        item.created_at,

      icon: "bi-patch-question"

    });

  });


  simulations.forEach(item => {

    activities.push({

      title:
        item.title ||
        item.scenario ||
        item.disaster_type ||
        "Disaster simulation",

      type: "simulation",

      score:
        item.score,

      completedAt:
        item.completed_at ||
        item.created_at,

      icon: "bi-controller"

    });

  });


  return activities
    .filter(item => item.completedAt)
    .sort(
      (a, b) =>
        new Date(b.completedAt) -
        new Date(a.completedAt)
    )
    .slice(0, 10);

}


/* =========================================================================
   Recent Activity Renderer
   ========================================================================= */

function renderRecentActivity(data) {

  const container =
    $("recentActivityList");

  if (!container) return;


  const activities =
    getRecentActivity(data);


  if (activities.length === 0) {

    container.innerHTML = `

      <div class="as-empty-inline">

        <i class="bi bi-clock-history"></i>

        <div>

          <strong>
            No recent activity
          </strong>

          <span>
            Your completed quizzes and simulations
            will appear here.
          </span>

        </div>

      </div>

    `;

    return;

  }


  container.innerHTML =
    activities
      .slice(0, 8)
      .map(item => {

        const type =
          String(
            item.type || "activity"
          ).toLowerCase();


        let icon =
          item.icon;


        if (!icon) {

          icon =
            type.includes("simulation")
              ? "bi-controller"
              : type.includes("quiz")
                ? "bi-patch-question"
                : "bi-activity";

        }


        const score =
          item.score !== undefined &&
          item.score !== null
            ? `${roundNumber(item.score)}%`
            : "";


        const label =
          type.includes("simulation")
            ? "Simulation"
            : type.includes("quiz")
              ? "Quiz"
              : "Activity";


        return `

          <div class="as-activity-item">

            <div class="as-activity-icon">

              <i class="bi ${escapeHtml(icon)}"></i>

            </div>


            <div class="as-activity-content">

              <strong>
                ${escapeHtml(item.title)}
              </strong>

              <span>
                ${escapeHtml(label)}
                · ${escapeHtml(timeAgo(item.completedAt))}
              </span>

            </div>


            ${
              score
                ? `
                  <div class="as-activity-score">
                    ${score}
                  </div>
                `
                : ""
            }

          </div>

        `;

      })
      .join("");

}


/* =========================================================================
   Error State
   ========================================================================= */

function renderDashboardError(error) {

  const element =
    $("dashboardError");


  if (!element) return;


  element.innerHTML = `

    <div class="as-error-icon">

      <i class="bi bi-exclamation-triangle"></i>

    </div>


    <div>

      <strong>
        We couldn't load your dashboard
      </strong>

      <span>
        Please refresh the page and try again.
      </span>

    </div>


    <button
      type="button"
      class="btn btn-as-outline btn-sm"
      onclick="window.location.reload()"
    >
      Retry
    </button>

  `;


  show(element);


  console.error(
    "Dashboard error:",
    error
  );

}


/* =========================================================================
   Dashboard Initialization
   ========================================================================= */

async function initializeDashboard() {

  renderUserName();

  setupChartDefaults();


  try {

    const rawData =
      await loadDashboard();


    dashboardData =
      normalizeDashboardData(
        rawData
      );


    console.log(
      "AapdaSetu dashboard data:",
      dashboardData
    );


    /* ---------------------------------------------------------------
       Render all dashboard sections
    ---------------------------------------------------------------- */

    renderKpis(
      dashboardData
    );


    renderCapabilityBreakdown(
      dashboardData
    );


    renderPerformanceChart(
      dashboardData
    );


    renderSimulationRadar(
      dashboardData
    );


    renderCapabilityChart(
      dashboardData
    );


    renderCourseProgress(
      dashboardData
    );


    renderNextAction(
      dashboardData
    );


    renderAchievements(
      dashboardData
    );


    renderStreak(
      dashboardData
    );


    renderActivityHeatmap(
      dashboardData
    );


    renderRecentActivity(
      dashboardData
    );


    /* ---------------------------------------------------------------
       Show dashboard
    ---------------------------------------------------------------- */

    hide(
      $("dashboardSkeleton")
    );


    show(
      $("dashboardContent")
    );


  } catch (error) {

    hide(
      $("dashboardSkeleton")
    );


    renderDashboardError(
      error
    );

  }

}


/* =========================================================================
   Window Resize
   ========================================================================= */

window.addEventListener(
  "resize",
  () => {

    /*
     * Chart.js handles responsive resizing itself.
     * This handler exists mainly to avoid unnecessary
     * manual redraws.
     */

  }
);


/* =========================================================================
   Start
   ========================================================================= */

document.addEventListener(
  "DOMContentLoaded",
  initializeDashboard
);