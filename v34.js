(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const qa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const safeStorage = () => {
    try { localStorage.setItem("albionDiagnosticProbe", "1"); localStorage.removeItem("albionDiagnosticProbe"); return true; }
    catch { return false; }
  };
  const addDiagnosticPanel = () => {
    if ($("diagnosticReport")) return;
    const status = $("diagnosticStatus");
    const report = document.createElement("div");
    report.id = "diagnosticReport";
    report.className = "diagnostic-report";
    report.hidden = true;
    report.setAttribute("aria-live", "polite");
    status?.insertAdjacentElement("afterend", report);
  };
  const testButton = (id, label) => ({ label, pass: !!$(id), detail: $(id) ? "available" : "missing" });
  const runFullDiagnostics = () => {
    addDiagnosticPanel();
    const button = $("runDiagnostics");
    const status = $("diagnosticStatus");
    const report = $("diagnosticReport");
    if (button) { button.disabled = true; button.textContent = "Running checks…"; }
    if (status) status.textContent = "Running navigation, storage, quiz, penalty and accessibility checks…";
    requestAnimationFrame(() => {
      const ids = qa("[id]").map(el => el.id);
      const duplicateIds = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
      const tests = [
        { label: "Unique page controls", pass: duplicateIds.length === 0, detail: duplicateIds.length ? duplicateIds.join(", ") : "no duplicate IDs" },
        testButton("quizContainer", "Quiz panel"), testButton("goal", "Penalty goal"),
        testButton("fixtureList", "Fixtures"), testButton("pitch", "Team selector"),
        testButton("guessPlayerGame", "Guess the player"), testButton("tourCoach", "Site tour"),
        { label: "Quiz data", pass: Array.isArray(window.ALBION_QUIZ) && window.ALBION_QUIZ.length >= 500, detail: Array.isArray(window.ALBION_QUIZ) ? `${window.ALBION_QUIZ.length} internal questions loaded` : "quiz data unavailable" },
        { label: "Browser storage", pass: safeStorage(), detail: safeStorage() ? "local saving available" : "local saving blocked" },
        { label: "Online/offline status", pass: typeof navigator.onLine === "boolean", detail: navigator.onLine ? "online" : "offline mode" },
        { label: "Keyboard focus", pass: qa("button,a,input,select").every(el => !el.hasAttribute("tabindex") || Number(el.getAttribute("tabindex")) >= 0), detail: "interactive controls remain reachable" },
        { label: "Images", pass: qa("img").every(img => img.complete && img.naturalWidth > 0), detail: qa("img").filter(img => !(img.complete && img.naturalWidth > 0)).length ? "one or more images are still loading" : "all current images loaded" },
        { label: "Service worker", pass: "serviceWorker" in navigator, detail: "serviceWorker" in navigator ? "offline support available" : "not supported by this browser" }
      ];
      const passed = tests.filter(t => t.pass).length;
      report.innerHTML = `<div class="diagnostic-summary"><strong>${passed}/${tests.length} checks passed</strong><span>${passed === tests.length ? "Site systems look healthy." : "Review the highlighted checks below."}</span></div><ul>${tests.map(t => `<li class="${t.pass ? "pass" : "fail"}"><b>${t.pass ? "✓" : "!"} ${t.label}</b><span>${t.detail}</span></li>`).join("")}</ul>`;
      report.hidden = false;
      if (status) status.textContent = `Diagnostics complete: ${passed} of ${tests.length} checks passed.`;
      if (button) { button.disabled = false; button.textContent = "Run site checks again"; }
      report.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
    });
  };
  const improveSilhouetteReward = () => {
    const result = $("guessPlayerResult") || qa("[id*='guess'][aria-live]")[0];
    if (!result) return;
    const observer = new MutationObserver(() => {
      const text = result.textContent || "";
      document.body.classList.toggle("guess-correct-celebration", /correct|well done|you got/i.test(text));
      if (/correct|well done|you got/i.test(text)) {
        window.setTimeout(() => document.body.classList.remove("guess-correct-celebration"), 1800);
      }
    });
    observer.observe(result, { childList: true, subtree: true, characterData: true });
  };
  const enhanceAccessibility = () => {
    qa("section[id]").forEach(section => { if (!section.hasAttribute("tabindex")) section.setAttribute("tabindex", "-1"); });
    qa('a[target="_blank"]').forEach(link => { if (!link.getAttribute("aria-label")?.includes("new tab")) link.setAttribute("aria-label", `${link.textContent.trim()} (opens in a new tab)`); });
    document.documentElement.dataset.release = "34";
  };
  const init = () => {
    addDiagnosticPanel();
    const old = $("runDiagnostics");
    if (old) {
      const fresh = old.cloneNode(true);
      old.replaceWith(fresh);
      fresh.addEventListener("click", runFullDiagnostics);
    }
    improveSilhouetteReward();
    enhanceAccessibility();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true }); else init();
})();
