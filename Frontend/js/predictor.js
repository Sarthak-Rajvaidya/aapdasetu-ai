let _lastDisasterType = null;

document.getElementById("predictForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("predictBtn");
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Running...';

  const payload = {
    rainfall: parseFloat(document.getElementById("rainfall").value),
    temperature: parseFloat(document.getElementById("temperature").value),
    humidity: parseFloat(document.getElementById("humidity").value),
  };

  try {
    const result = await apiFetch("/api/predict", { method: "POST", body: payload });
    _lastDisasterType = result.disaster_type;

    document.getElementById("predictPlaceholder").classList.add("d-none");
    const panel = document.getElementById("predictResult");
    panel.classList.remove("d-none");
    panel.classList.add("as-fade-in");

    document.getElementById("resDisasterType").textContent = result.disaster_type;
    document.getElementById("resInterpretation").textContent = result.risk_interpretation;

    const confBlock = document.getElementById("confidenceBlock");
    if (result.model_confidence !== null && result.model_confidence !== undefined) {
      confBlock.style.display = "";
      document.getElementById("resConfidence").textContent = `${Math.round(result.model_confidence * 100)}%`;
    } else {
      confBlock.style.display = "none";
    }

    document.getElementById("resSteps").innerHTML = result.recommended_steps.map((s) => `<li>${s}</li>`).join("");

    if (typeof showToast === "function") showToast("Prediction complete", "success");
  } catch (err) {
    if (typeof showToast === "function") showToast(`Prediction failed: ${err.message}`, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Run Prediction";
  }
});

document.getElementById("askAiBtn").addEventListener("click", () => {
  const question = _lastDisasterType
    ? `My risk predictor flagged ${_lastDisasterType} risk. How should I prepare?`
    : "How should I prepare for elevated disaster risk?";
  window.location.href = `ai-assistant.html?ask=${encodeURIComponent(question)}`;
});
