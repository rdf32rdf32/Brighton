(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);

  function completeControlSemantics() {
    document.querySelectorAll("button:not([type])").forEach((button) => button.type = "button");
    document.querySelectorAll("input, select, textarea").forEach((control) => {
      if (control.type === "hidden" || control.hasAttribute("aria-label") || control.hasAttribute("aria-labelledby")) return;
      const labelled = control.id && document.querySelector(`label[for="${CSS.escape(control.id)}"]`);
      if (labelled || control.closest("label")) return;
      const words = (control.id || control.name || "Site control")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/[-_]+/g, " ")
        .trim();
      control.setAttribute("aria-label", words.charAt(0).toUpperCase() + words.slice(1));
    });
    document.querySelectorAll('a[target="_blank"]').forEach((link) => {
      const rel = new Set((link.getAttribute("rel") || "").split(/\s+/).filter(Boolean));
      rel.add("noopener");
      rel.add("noreferrer");
      link.setAttribute("rel", [...rel].join(" "));
    });
  }

  function activeNavigation() {
    const links = [...document.querySelectorAll('.nav-links a[href^="#"], .mobile-jump-nav a[href^="#"]')];
    const grouped = new Map();
    links.forEach((link) => {
      const id = link.getAttribute("href").slice(1);
      if (!grouped.has(id)) grouped.set(id, []);
      grouped.get(id).push(link);
    });
    const sections = [...grouped.keys()].map((id) => $(id)).filter(Boolean);
    if (!("IntersectionObserver" in window) || !sections.length) return;
    const visible = new Map();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => visible.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0));
      const active = [...visible.entries()].sort((a, b) => b[1] - a[1])[0];
      if (!active || active[1] <= 0) return;
      links.forEach((link) => link.classList.remove("active"));
      (grouped.get(active[0]) || []).forEach((link) => link.classList.add("active"));
    }, { rootMargin: "-18% 0px -62% 0px", threshold: [0.01, 0.2, 0.5] });
    sections.forEach((section) => observer.observe(section));
  }

  function progressiveReveal() {
    if (!("IntersectionObserver" in window) || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const cards = [...document.querySelectorAll("main > .card")].filter((card, index) => index > 1 && !card.classList.contains("shootout-v10"));
    cards.forEach((card) => card.classList.add("reveal-ready"));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in-view");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8%", threshold: 0.05 });
    cards.forEach((card) => observer.observe(card));
  }

  function polishQuizStates() {
    const container = $("quizContainer");
    const replay = $("newQuiz");
    const card = $("quiz");
    if (!container || !replay || !card) return;
    const update = () => {
      const complete = Boolean(container.querySelector(".quiz-finish"));
      replay.hidden = !complete;
      replay.textContent = complete ? "Play a fresh five" : "Restart quiz";
      card.classList.toggle("quiz-complete", complete);
      const firstRadio = container.querySelector('input[type="radio"]:not(:disabled)');
      if (firstRadio && document.activeElement === document.body && location.hash === "#quiz") firstRadio.focus({ preventScroll: true });
    };
    new MutationObserver(update).observe(container, { childList: true, subtree: true });
    update();
  }

  function lazyMedia() {
    document.querySelectorAll("audio").forEach((audio) => {
      if (!audio.hasAttribute("preload") || audio.preload === "auto") audio.preload = "none";
    });
    document.querySelectorAll("img:not([loading])").forEach((image) => {
      if (!image.closest(".hero")) image.loading = "lazy";
      image.decoding = "async";
    });
  }

  function anchorFocus() {
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener("click", () => {
        const id = link.getAttribute("href").slice(1);
        const target = $(id);
        if (!target) return;
        window.setTimeout(() => {
          if (id === "shootout") $("penaltyStage")?.focus({ preventScroll: true });
        }, document.body.classList.contains("user-reduce-motion") ? 0 : 500);
      });
    });
  }

  function shootoutViewportMode() {
    const section = $("shootout");
    if (!section || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
      document.body.classList.toggle("shootout-in-view", entry.isIntersecting && entry.intersectionRatio > 0.28);
    }, { threshold: [0, 0.28, 0.55] });
    observer.observe(section);
  }

  function addReleaseStatus() {
    const footer = document.querySelector(".footer-copy");
    if (!footer || footer.querySelector(".site-smooth-status")) return;
    footer.insertAdjacentHTML("beforeend", ' · <span class="site-smooth-status">Release 10</span>');
  }

  completeControlSemantics();
  activeNavigation();
  progressiveReveal();
  polishQuizStates();
  lazyMedia();
  anchorFocus();
  shootoutViewportMode();
  addReleaseStatus();
})();
