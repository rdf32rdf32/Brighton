(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const toast = (message) => {
    const element = $("siteToast");
    if (!element) return;
    element.textContent = message;
    element.hidden = false;
    element.classList.add("show");
    window.setTimeout(() => {
      element.classList.remove("show");
      element.hidden = true;
    }, 2200);
  };

  function activeNavigation() {
    const links = [
      ...document.querySelectorAll(
        '.nav-links a[href^="#"], .mobile-jump-nav a[href^="#"]',
      ),
    ];
    const sections = [
      ...new Set(
        links
          .map((link) => document.querySelector(link.getAttribute("href")))
          .filter(Boolean),
      ),
    ];
    if (!("IntersectionObserver" in window) || !sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const current = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!current) return;
        links.forEach((link) => {
          const active =
            link.getAttribute("href") === `#${current.target.id}`;
          link.classList.toggle("active-section", active);
          if (active) link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        });
      },
      { rootMargin: "-20% 0px -62% 0px", threshold: [0, 0.25, 0.6] },
    );
    sections.forEach((section) => observer.observe(section));
  }

  function settingsDrawer() {
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
    openButton.addEventListener("click", () => setOpen(true));
    closeButton.addEventListener("click", () => setOpen(false));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && document.body.classList.contains("settings-open"))
        setOpen(false);
    });
    document.querySelectorAll('a[href="#supporter-settings"]').forEach((link) =>
      link.addEventListener("click", (event) => {
        event.preventDefault();
        setOpen(true);
      }),
    );
    panel.setAttribute("aria-hidden", "true");
    panel.setAttribute("inert", "");
  }

  function automaticPerformanceMode() {
    const reducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const limitedMemory =
      Number(navigator.deviceMemory) > 0 &&
      Number(navigator.deviceMemory) <= 2;
    const limitedCpu =
      Number(navigator.hardwareConcurrency) > 0 &&
      Number(navigator.hardwareConcurrency) <= 2;
    const lighter = reducedMotion || limitedMemory || limitedCpu;
    document.body.classList.toggle("automatic-performance", lighter);
    document.body.dataset.performanceMode = lighter ? "light" : "full";
  }

  function savedConfirmations() {
    const labels = {
      savePrediction: "Match prediction saved on this device",
      saveLeaguePrediction: "League forecast saved on this device",
      completeXI: "XI completed and saved on this device",
      saveTactics: "Tactical plan saved on this device",
    };
    Object.entries(labels).forEach(([id, message]) => {
      $(id)?.addEventListener("click", () => toast(message));
    });
  }

  function releaseMarker() {
    document.documentElement.dataset.release = "18";
    const diagnostics = $("diagnosticStatus");
    if (diagnostics)
      diagnostics.dataset.release = "Albion Fan Hub release 18";
  }

  activeNavigation();
  settingsDrawer();
  automaticPerformanceMode();
  savedConfirmations();
  releaseMarker();
})();
