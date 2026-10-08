/**
 * Minimal, dependency-free toast notifications so we stop relying on
 * browser alert() for primary feedback. Injects its own container/styles
 * on first use.
 */
function ensureToastContainer() {
  let container = document.getElementById("asToastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "asToastContainer";
    container.style.cssText =
      "position:fixed;top:1rem;right:1rem;z-index:2000;display:flex;flex-direction:column;gap:0.5rem;max-width:320px;";
    document.body.appendChild(container);
  }
  return container;
}

function showToast(message, type = "info", timeoutMs = 4000) {
  const colors = {
    success: "#16a34a",
    error: "#dc2626",
    info: "#2563eb",
    warning: "#d97706",
  };
  const container = ensureToastContainer();
  const toast = document.createElement("div");
  toast.setAttribute("role", "status");
  toast.style.cssText = `
    background:${colors[type] || colors.info};
    color:#fff;
    padding:0.75rem 1rem;
    border-radius:0.6rem;
    box-shadow:0 8px 24px rgba(0,0,0,0.25);
    font-size:0.9rem;
    opacity:0;
    transform:translateY(-8px);
    transition:opacity .25s ease, transform .25s ease;
  `;
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  });
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-8px)";
    setTimeout(() => toast.remove(), 250);
  }, timeoutMs);
}
