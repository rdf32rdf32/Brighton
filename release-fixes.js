(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);

  function toast(message) {
    const el = $("siteToast");
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
    el.classList.add("show");
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(() => {
      el.classList.remove("show");
      el.hidden = true;
    }, 2400);
  }

  function tour() {
    const coach = $("tourCoach");
    const launch = $("startTour");
    if (!coach || !launch) return;
    const steps = [
      ["fan-dashboard", "Welcome to Albion Fan Hub", "Your quiz record, shoot-out record and saved predictions are collected here."],
      ["quiz", "Test your Albion knowledge", "Play five medium and difficult questions, one at a time."],
      ["shootout", "Seagulls v Eagles", "Aim, press Shoot, then take control of Bart Verbruggen for the Palace kick."],
      ["fixtures", "Follow the season", "Search and filter fixtures by venue and month."],
      ["xi", "Build your Albion XI", "Choose a formation, players and set-piece takers."],
      ["story", "Explore the Albion story", "Browse the club journey, grounds, people, rivalry and memories."],
      ["amex-stands", "Explore the Amex", "Compare the stands and find the area that suits your matchday."],
      ["supporter-settings", "Adjust the site", "Change text size, contrast, animation and saved-data settings."],
    ];
    let index = 0;
    const clear = () => document.querySelectorAll(".tour-highlight").forEach((el) => el.classList.remove("tour-highlight"));
    const close = (completed = false) => {
      coach.hidden = true;
      clear();
      if (completed) localStorage.setItem("albionTourCompleted", "yes");
      launch.focus({ preventScroll: true });
    };
    const render = () => {
      clear();
      const [id, title, text] = steps[index];
      const target = $(id);
      if (target) {
        target.classList.add("tour-highlight");
        target.scrollIntoView({
          behavior: document.body.classList.contains("user-reduce-motion") ? "auto" : "smooth",
          block: "center",
        });
      }
      $("tourTitle").textContent = title;
      $("tourText").textContent = text;
      $("tourPosition").textContent = `${index + 1} of ${steps.length}`;
      $("tourPrevious").disabled = index === 0;
      $("tourNext").textContent = index === steps.length - 1 ? "Finish" : "Next";
    };
    launch.classList.toggle("first-visit", localStorage.getItem("albionTourCompleted") !== "yes");
    launch.addEventListener("click", () => {
      index = 0;
      coach.hidden = false;
      launch.classList.remove("first-visit");
      render();
    });
    $("tourPrevious")?.addEventListener("click", () => {
      index = Math.max(0, index - 1);
      render();
    });
    $("tourNext")?.addEventListener("click", () => {
      if (index === steps.length - 1) close(true);
      else {
        index += 1;
        render();
      }
    });
    $("tourClose")?.addEventListener("click", () => close(false));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !coach.hidden) close(false);
    });
  }

  const settingsMap = {
    largeTextSetting: "user-large-text",
    highContrastSetting: "user-high-contrast",
    reduceMotionSetting: "user-reduce-motion",
    dataSaverSetting: "user-data-saver",
  };

  function applySettings() {
    Object.entries(settingsMap).forEach(([id, className]) => {
      const input = $(id);
      if (!input) return;
      const enabled = localStorage.getItem(`albionSetting:${id}`) === "true";
      input.checked = enabled;
      document.body.classList.toggle(className, enabled);
    });
  }

  function settings() {
    const panel = $("supporter-settings");
    const openButton = $("settingsToggle");
    const closeButton = $("closeSettings");
    if (!panel || !openButton || !closeButton) return;
    document.body.classList.add("settings-enabled");
    const setOpen = (open) => {
      document.body.classList.toggle("settings-open", open);
      openButton.setAttribute("aria-expanded", String(open));
      panel.setAttribute("aria-hidden", String(!open));
      if (open) {
        panel.removeAttribute("inert");
        closeButton.focus({ preventScroll: true });
      } else {
        panel.setAttribute("inert", "");
        openButton.focus({ preventScroll: true });
      }
    };
    openButton.addEventListener("click", () => setOpen(!document.body.classList.contains("settings-open")));
    closeButton.addEventListener("click", () => setOpen(false));
    document.querySelectorAll('a[href="#supporter-settings"]').forEach((link) => link.addEventListener("click", (event) => {
      event.preventDefault();
      setOpen(true);
    }));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && document.body.classList.contains("settings-open")) setOpen(false);
    });
    Object.entries(settingsMap).forEach(([id, className]) => {
      $(id)?.addEventListener("change", (event) => {
        const enabled = event.target.checked;
        localStorage.setItem(`albionSetting:${id}`, String(enabled));
        document.body.classList.toggle(className, enabled);
      });
    });
    panel.setAttribute("aria-hidden", "true");
    panel.setAttribute("inert", "");
    applySettings();
  }

  function dataTools() {
    const status = $("dataTransferStatus");
    $("exportFanData")?.addEventListener("click", () => {
      const data = {};
      Object.keys(localStorage).filter((key) => key.startsWith("albion")).sort().forEach((key) => {
        data[key] = localStorage.getItem(key);
      });
      const payload = JSON.stringify({
        format: "Albion Fan Hub data",
        exportedAt: new Date().toISOString(),
        data,
      }, null, 2);
      const blob = new Blob([payload], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `albion-fan-hub-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      if (status) status.textContent = "Your saved Albion data has been exported.";
    });
    $("importFanData")?.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const parsed = JSON.parse(await file.text());
        const data = parsed?.data;
        if (!data || typeof data !== "object") throw new Error("Invalid data file");
        Object.entries(data).forEach(([key, value]) => {
          if (key.startsWith("albion") && typeof value === "string") localStorage.setItem(key, value);
        });
        if (status) status.textContent = "Data restored. Reloading the site…";
        window.setTimeout(() => window.location.reload(), 500);
      } catch {
        if (status) status.textContent = "That file could not be restored. Please use an Albion Fan Hub export.";
      } finally {
        event.target.value = "";
      }
    });
  }

  function diagnostics() {
    const run = () => {
      let storage = true;
      try {
        localStorage.setItem("__albion_check", "1");
        localStorage.removeItem("__albion_check");
      } catch {
        storage = false;
      }
      const checks = [
        ["Main page controls", Boolean($("startTour") && $("settingsToggle"))],
        ["Quiz bank", Array.isArray(window.ALBION_QUIZ) && window.ALBION_QUIZ.length >= 5],
        ["Penalty game", Boolean($("shootButton") && $("penaltyTaker") && $("keeper"))],
        ["Fixtures", Boolean($("fixtureList") && $("monthFilter"))],
        ["Local storage", storage],
        ["Audio controls", Boolean($("soundToggle"))],
      ];
      const failed = checks.filter(([, pass]) => !pass);
      const status = $("diagnosticStatus");
      if (status) {
        status.innerHTML = `${failed.length ? "Some checks need attention." : "All essential site checks passed."}<span class="diagnostic-results">${checks.map(([name, pass]) => `<i class="${pass ? "pass" : "fail"}">${pass ? "✓" : "✕"} ${name}</i>`).join("")}</span>`;
      }
      const connection = $("connectionStatus");
      if (connection) connection.textContent = navigator.onLine ? "Connection: online" : "Connection: offline. Saved features still remain on this device.";
    };
    $("runDiagnostics")?.addEventListener("click", run);
    window.addEventListener("online", run);
    window.addEventListener("offline", run);
    run();
  }

  function resetGroups() {
    const patterns = {
      quiz: /quiz/i,
      penalties: /shootout|penalt/i,
      predictions: /predict/i,
      team: /xi|team|formation|captain|tactic/i,
      display: /setting|theme|sound|volume|dataSaver|contrast|motion|large/i,
    };
    document.querySelectorAll("[data-reset-group]").forEach((button) => button.addEventListener("click", () => {
      const group = button.dataset.resetGroup;
      const pattern = patterns[group];
      if (!pattern) return;
      Object.keys(localStorage).filter((key) => key.startsWith("albion") && pattern.test(key)).forEach((key) => localStorage.removeItem(key));
      applySettings();
      const status = $("resetStatus");
      if (status) status.textContent = `${button.textContent.trim()} choices reset.`;
    }));
  }

  function xiLink() {
    const button = $("copyXILink");
    if (!button) return;
    const restore = () => {
      const encoded = new URLSearchParams(window.location.search).get("xi");
      if (!encoded) return;
      try {
        const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
        const state = JSON.parse(decodeURIComponent(escape(atob(padded))));
        if (state.formation && $("formation")) {
          $("formation").value = state.formation;
          $("formation").dispatchEvent(new Event("change", { bubbles: true }));
        }
        window.setTimeout(() => {
          const selects = [...document.querySelectorAll("#pitch select")];
          (state.players || []).forEach((value, index) => {
            if (selects[index] && [...selects[index].options].some((option) => option.value === value)) {
              selects[index].value = value;
              selects[index].dispatchEvent(new Event("change", { bubbles: true }));
            }
          });
        }, 80);
      } catch {
        // Ignore malformed shared links.
      }
    };
    button.addEventListener("click", async () => {
      const state = {
        formation: $("formation")?.value || "",
        players: [...document.querySelectorAll("#pitch select")].map((select) => select.value),
      };
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(state)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      const url = new URL(window.location.href);
      url.searchParams.set("xi", encoded);
      url.hash = "xi";
      try {
        await navigator.clipboard.writeText(url.toString());
        toast("Recreatable XI link copied");
      } catch {
        window.prompt("Copy this XI link:", url.toString());
      }
    });
    restore();
  }

  function updateControl() {
    $("reloadUpdate")?.addEventListener("click", () => window.location.reload());
  }

  tour();
  settings();
  dataTools();
  diagnostics();
  resetGroups();
  xiLink();
  updateControl();
})();
