async function loadProfile() {
  try {
    const [me, dashboard, sims] = await Promise.all([
      apiFetch("/api/auth/me"),
      apiFetch("/api/dashboard"),
      apiFetch("/api/simulations"),
    ]);

    document.getElementById("profileName").textContent = me.name;
    document.getElementById("profileUserId").textContent = `@${me.user_id}`;
    document.getElementById("profileRole").textContent = me.role;
    document.getElementById("profileEmail").textContent = me.email || "Not provided";
    document.getElementById("profileAge").textContent = me.age ?? "Not provided";
    document.getElementById("profileCreated").textContent = new Date(me.created_at).toLocaleDateString();

    document.getElementById("editName").value = me.name || "";
    document.getElementById("editAge").value = me.age ?? "";

    const completedCourses = dashboard.course_progress.filter((c) => c.completed).length;
    document.getElementById("statCourses").textContent = completedCourses;
    document.getElementById("statReadiness").textContent = `${dashboard.readiness.overall}%`;

    const attemptedSims = sims.filter((s) => s.best_score !== null && s.best_score !== undefined);
    document.getElementById("statSims").textContent = attemptedSims.length;
    const avg = attemptedSims.length
      ? Math.round(attemptedSims.reduce((sum, s) => sum + s.best_score, 0) / attemptedSims.length)
      : 0;
    document.getElementById("statAvgSim").textContent = `${avg}%`;
  } catch (err) {
    if (typeof showToast === "function") showToast(`Couldn't load profile: ${err.message}`, "error");
  }
}

document.getElementById("profileForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const payload = {
      name: document.getElementById("editName").value.trim() || undefined,
      age: document.getElementById("editAge").value ? parseInt(document.getElementById("editAge").value, 10) : undefined,
    };
    const updated = await apiFetch("/api/auth/me", { method: "PUT", body: payload });
    localStorage.setItem("user", JSON.stringify(updated));
    showToast("Profile updated", "success");
    loadProfile();
    if (typeof paintUserName === "function") paintUserName();
  } catch (err) {
    showToast(`Update failed: ${err.message}`, "error");
  }
});

document.addEventListener("DOMContentLoaded", loadProfile);
