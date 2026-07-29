(() => {
  "use strict";
  const mobile = matchMedia("(max-width: 760px)");
  const collapsibleIds = ["fixtures", "xi", "story", "amex-stands", "travel"];

  function sectionTitle(section) {
    return section.querySelector("h2,h3")?.textContent?.trim() || "section";
  }

  function addMobileCollapse(section) {
    if (!section || section.dataset.r56CollapseReady) return;
    const head = section.querySelector(":scope > .section-head");
    if (!head) return;
    section.dataset.r56CollapseReady = "true";
    section.classList.add("mobile-collapsible");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mobile-section-toggle";
    button.setAttribute("aria-expanded", "false");
    button.innerHTML = `<span>Show ${sectionTitle(section)}</span>`;
    head.insertAdjacentElement("afterend", button);
    const setOpen = (open) => {
      section.classList.toggle("mobile-collapsed", !open);
      button.setAttribute("aria-expanded", String(open));
      button.querySelector("span").textContent = `${open ? "Hide" : "Show"} ${sectionTitle(section)}`;
    };
    button.addEventListener("click", () => setOpen(section.classList.contains("mobile-collapsed")));
    section._setMobileOpen = setOpen;
  }

  function syncMobileSections() {
    collapsibleIds.forEach((id) => {
      const section = document.getElementById(id);
      addMobileCollapse(section);
      if (!section?._setMobileOpen) return;
      if (!mobile.matches) section._setMobileOpen(true);
      else {
        const targeted = location.hash === `#${id}` || Boolean(location.hash && section.querySelector(location.hash));
        section._setMobileOpen(targeted);
      }
    });
  }

  function openTargetSection(target) {
    const section = target?.closest?.(".mobile-collapsible");
    if (mobile.matches && section?._setMobileOpen) section._setMobileOpen(true);
  }

  function addSaveGuide() {
    const stage = document.getElementById("penaltyStage");
    if (!stage || stage.querySelector(".save-zone-guide")) return;
    const guide = document.createElement("div");
    guide.className = "save-zone-guide";
    guide.setAttribute("aria-hidden", "true");
    guide.innerHTML = "<span>Tap left</span><span>Stay centre</span><span>Tap right</span>";
    stage.appendChild(guide);
  }

  document.addEventListener("DOMContentLoaded", () => {
    addSaveGuide();
    syncMobileSections();
    mobile.addEventListener?.("change", syncMobileSections);
    document.addEventListener("click", (event) => {
      const link = event.target.closest?.('a[href^="#"]');
      if (!link) return;
      const id = decodeURIComponent(link.getAttribute("href").slice(1));
      if (!id) return;
      openTargetSection(document.getElementById(id));
    });
    addEventListener("hashchange", () => openTargetSection(document.querySelector(location.hash)));
  });
})();
