(() => {
  "use strict";

  const byId = (id) => document.getElementById(id);
  const safeStorage = {
    get(key) {
      try { return window.localStorage.getItem(key); } catch { return null; }
    },
    set(key, value) {
      try { window.localStorage.setItem(key, value); return true; } catch { return false; }
    },
  };

  function initMenu() {
    const button = byId("menuToggle");
    const nav = byId("navLinks");
    if (!button || !nav || button.dataset.controlsBound === "true") return;
    button.dataset.controlsBound = "true";

    const setOpen = (open) => {
      nav.classList.toggle("open", Boolean(open));
      button.setAttribute("aria-expanded", String(Boolean(open)));
      document.body.classList.toggle("mobile-menu-open", Boolean(open));
    };

    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setOpen(!nav.classList.contains("open"));
    });
    nav.querySelectorAll("a, button").forEach((control) => {
      control.addEventListener("click", () => setOpen(false));
    });
    byId("mobileTourAction")?.addEventListener("click", () => {
      setOpen(false);
      window.setTimeout(() => byId("startTour")?.click(), 0);
    });
    byId("mobileSettingsAction")?.addEventListener("click", () => {
      setOpen(false);
      window.setTimeout(() => byId("settingsToggle")?.click(), 0);
    });
    document.addEventListener("pointerdown", (event) => {
      if (!nav.classList.contains("open")) return;
      if (nav.contains(event.target) || button.contains(event.target)) return;
      setOpen(false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setOpen(false);
    });
    window.addEventListener("resize", () => {
      if (window.innerWidth > 800) setOpen(false);
    }, { passive: true });
  }

  const settingsMap = {
    largeTextSetting: "user-large-text",
    highContrastSetting: "user-high-contrast",
    reduceMotionSetting: "user-reduce-motion",
    dataSaverSetting: "user-data-saver",
  };

  function initSettings() {
    const panel = byId("supporter-settings");
    const openButton = byId("settingsToggle");
    const closeButton = byId("closeSettings");
    if (!panel || !openButton || !closeButton || openButton.dataset.controlsBound === "true") return;
    openButton.dataset.controlsBound = "true";
    document.body.classList.add("settings-enabled");

    let open = false;
    const setOpen = (nextOpen, returnFocus = true) => {
      open = Boolean(nextOpen);
      document.body.classList.toggle("settings-open", open);
      openButton.setAttribute("aria-expanded", String(open));
      panel.setAttribute("aria-hidden", String(!open));
      panel.dataset.open = String(open);
      panel.removeAttribute("inert");
      if (open) {
        requestAnimationFrame(() => closeButton.focus({ preventScroll: true }));
      } else if (returnFocus) {
        openButton.focus({ preventScroll: true });
      }
    };

    openButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setOpen(!open);
    });
    closeButton.addEventListener("click", (event) => {
      event.preventDefault();
      setOpen(false);
    });
    document.querySelectorAll('a[href="#supporter-settings"]').forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        setOpen(true, false);
      });
    });
    document.addEventListener("pointerdown", (event) => {
      if (!open || panel.contains(event.target) || openButton.contains(event.target)) return;
      setOpen(false, false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && open) setOpen(false);
    });

    Object.entries(settingsMap).forEach(([id, className]) => {
      const input = byId(id);
      if (!input) return;
      const enabled = safeStorage.get(`albionSetting:${id}`) === "true";
      input.checked = enabled;
      document.body.classList.toggle(className, enabled);
      input.setAttribute("aria-checked", String(enabled));
      input.addEventListener("change", () => {
        const next = Boolean(input.checked);
        document.body.classList.toggle(className, next);
        input.setAttribute("aria-checked", String(next));
        safeStorage.set(`albionSetting:${id}`, String(next));
      });
    });

    setOpen(false, false);
  }

  function initTour() {
    const coach = byId("tourCoach");
    const launch = byId("startTour");
    const previous = byId("tourPrevious");
    const next = byId("tourNext");
    const closeButton = byId("tourClose");
    if (!coach || !launch || !previous || !next || !closeButton || launch.dataset.controlsBound === "true") return;
    launch.dataset.controlsBound = "true";

    const steps = [
      ["fan-dashboard", "Welcome to Albion Fan Hub", "See your quiz record, shoot-out record and saved predictions."],
      ["quiz", "Test your Albion knowledge", "Play five medium and difficult questions, one at a time."],
      ["shootout", "Seagulls v Eagles", "Take Brighton penalties, then swipe to save Palace kicks as Verbruggen."],
      ["fixtures", "Follow the season", "Search and filter fixtures by venue and month."],
      ["xi", "Build your Albion XI", "Choose a formation, players and set-piece takers."],
      ["story", "Explore the Albion story", "Browse the club journey, grounds, people, rivalry and memories."],
      ["amex-stands", "Explore the Amex", "Compare the stands and find the area that suits your matchday."],
      ["supporter-settings", "Adjust the site", "Change text size, contrast, animation and saved-data settings."],
    ];
    let index = 0;
    const clearHighlights = () => document.querySelectorAll(".tour-highlight").forEach((el) => el.classList.remove("tour-highlight"));
    const close = (completed = false) => {
      coach.hidden = true;
      coach.setAttribute("aria-hidden", "true");
      clearHighlights();
      if (completed) safeStorage.set("albionTourCompleted", "yes");
      launch.focus({ preventScroll: true });
    };
    const render = () => {
      clearHighlights();
      const [id, title, text] = steps[index];
      const target = byId(id);
      if (target) {
        target.classList.add("tour-highlight");
        target.scrollIntoView({
          behavior: document.body.classList.contains("user-reduce-motion") ? "auto" : "smooth",
          block: "center",
        });
      }
      byId("tourTitle").textContent = title;
      byId("tourText").textContent = text;
      byId("tourPosition").textContent = `${index + 1} of ${steps.length}`;
      previous.disabled = index === 0;
      next.textContent = index === steps.length - 1 ? "Finish" : "Next";
    };

    launch.classList.toggle("first-visit", safeStorage.get("albionTourCompleted") !== "yes");
    launch.addEventListener("click", (event) => {
      event.preventDefault();
      index = 0;
      coach.hidden = false;
      coach.setAttribute("aria-hidden", "false");
      launch.classList.remove("first-visit");
      render();
    });
    previous.addEventListener("click", () => {
      index = Math.max(0, index - 1);
      render();
    });
    next.addEventListener("click", () => {
      if (index === steps.length - 1) close(true);
      else { index += 1; render(); }
    });
    closeButton.addEventListener("click", () => close(false));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !coach.hidden) close(false);
    });
    coach.setAttribute("aria-hidden", String(coach.hidden));
  }

  function init() {
    initMenu();
    initSettings();
    initTour();
  }

  // Scripts load at the end of the document, so bind immediately before app.js
  // can attach legacy duplicate handlers. Re-run once at DOMContentLoaded only as a fallback.
  init();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
})();
