let _chatSessionId = null;

function _escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function appendMessage(role, content, sources = [], provider = null) {
  const container = document.getElementById("chatMessages");
  const wrapper = document.createElement("div");
  wrapper.className = `as-msg ${role} as-fade-in`;

  const sourcesHtml =
    sources && sources.length
      ? `<div class="mt-2 pt-2 border-top small opacity-75">
          <i class="bi bi-journal-text me-1"></i>Sources: ${sources
            .map((s) => `${_escapeHtml(s.title)} (${_escapeHtml(s.disaster_type)})`)
            .join(", ")}
        </div>`
      : "";

  const providerBadge =
    provider === "extractive-fallback"
      ? `<div class="small opacity-75 mb-1"><i class="bi bi-info-circle me-1"></i>Offline retrieval mode (no LLM key configured)</div>`
      : "";

  wrapper.innerHTML = `${providerBadge}<div style="white-space:pre-wrap;">${_escapeHtml(content)}</div>${sourcesHtml}`;
  container.appendChild(wrapper);
  container.scrollTop = container.scrollHeight;
}

async function loadSuggestedPrompts() {
  try {
    const data = await apiFetch("/api/ai/suggested-prompts");
    const box = document.getElementById("suggestedPrompts");
    box.innerHTML = data.prompts
      .map((p) => `<button type="button" class="btn btn-sm btn-as-dark-outline as-suggested-prompt">${_escapeHtml(p)}</button>`)
      .join("");
    box.querySelectorAll(".as-suggested-prompt").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.getElementById("chatInput").value = btn.textContent;
        document.getElementById("chatForm").dispatchEvent(new Event("submit"));
      });
    });
  } catch {
    /* non-fatal: suggested prompts are a convenience, not required */
  }
}

async function sendChatMessage(message) {
  appendMessage("user", message);
  document.getElementById("typingIndicator").classList.remove("d-none");

  try {
    const data = await apiFetch("/api/ai/chat", {
      method: "POST",
      body: { message, session_id: _chatSessionId },
    });
    _chatSessionId = data.session_id;
    appendMessage("assistant", data.reply, data.sources, data.provider);
  } catch (err) {
    appendMessage("assistant", `Sorry, something went wrong: ${err.message}. Please try again.`);
  } finally {
    document.getElementById("typingIndicator").classList.add("d-none");
  }
}

document.getElementById("chatForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("chatInput");
  const message = input.value.trim();
  if (!message) return;
  input.value = "";
  sendChatMessage(message);
});

document.getElementById("newConvoBtn").addEventListener("click", () => {
  _chatSessionId = null;
  document.getElementById("chatMessages").innerHTML =
    '<div class="text-center as-muted small mb-2">New conversation started.</div>';
  loadSuggestedPrompts();
});

document.addEventListener("DOMContentLoaded", () => {
  loadSuggestedPrompts();

  // Supports deep-linking from the Risk Predictor: ai-assistant.html?ask=How should I prepare?
  const params = new URLSearchParams(window.location.search);
  const prefilled = params.get("ask");
  if (prefilled) {
    document.getElementById("chatInput").value = prefilled;
    sendChatMessage(prefilled);
  }
});
