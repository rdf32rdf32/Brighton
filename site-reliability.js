// r91. Fixtures and squad have separate verification dates, not a live feed.
(() => {
  "use strict";
  const data = window.ALBION_DATA_R66 || {};
  const fixturesDate = data.fixtureCheckedISO || data.checkedISO;
  const squadDate = data.squadCheckedISO || fixturesDate;
  const daysOld = iso => {
    const checked = Date.parse(String(iso || "") + "T12:00:00Z");
    return Number.isFinite(checked) ? Math.max(0, Math.floor((Date.now()-checked)/86400000)) : null;
  };
  document.querySelectorAll("[data-freshness]").forEach(node => {
    const category = node.dataset.freshness;
    const squad = category === "squad";
    const reviewed = squad ? squadDate : fixturesDate;
    const age = daysOld(reviewed);
    if (age == null || age < 7 || node.querySelector(".data-age-note")) return;
    node.classList.add("is-stale");
    const info = document.createElement("span");
    info.className = "data-age-note";
    info.append(document.createTextNode(
      " · " + (squad ? "Squad" : "Fixture/results") + " data last reviewed " + age + " days ago. "
    ));
    const link=document.createElement("a");
    link.href=squad ? "https://www.brightonandhovealbion.com/teams/mens-team" : "https://www.brightonandhovealbion.com/fixtures-first-team-men";
    link.target="_blank"; link.rel="noopener noreferrer"; link.textContent="Verify with Albion ↗";
    info.append(link);node.append(info);
  });
})();
