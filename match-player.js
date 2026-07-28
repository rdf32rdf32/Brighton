(() => {
  "use strict";
  const C = window.ALBION_CONTENT || {};
  const MATCH = C.nextMatch || {};
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
  const safeStorage = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch {} },
    remove(key) { try { localStorage.removeItem(key); } catch {} },
  };
  const profileList = Array.isArray(C.playerProfiles) ? C.playerProfiles : [];

  function matchCountdown() {
    const target = $("matchCentreCountdown");
    if (!target || !MATCH.dateISO) return;
    const remaining = new Date(MATCH.dateISO).getTime() - Date.now();
    if (remaining <= 0) { target.innerHTML = "<b>Matchday</b><span>Come on Albion</span>"; return; }
    const days = Math.floor(remaining / 86400000);
    const hours = Math.floor((remaining % 86400000) / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    target.innerHTML = `<b>${days}d ${hours}h</b><span>${minutes} minutes to kick-off</span>`;
  }

  function updateMatchDetails() {
    if ($("centreMatchCompetition")) $("centreMatchCompetition").textContent = MATCH.competition || "Premier League";
    if ($("centreMatchBroadcast")) $("centreMatchBroadcast").textContent = MATCH.broadcast || "To be confirmed";
    if ($("centreMatchStatus")) $("centreMatchStatus").textContent = MATCH.status || "Fixture scheduled";
    if ($("centreMatchNote")) $("centreMatchNote").textContent = MATCH.note || "Check official listings before travelling.";
    if ($("opponentBriefingText")) $("opponentBriefingText").textContent = "Albion begin the 2026/27 Premier League season at home. This panel uses confirmed fixture details and avoids unverified team news.";
    if ($("opponentBriefingFacts")) $("opponentBriefingFacts").innerHTML = `<article><span>Round</span><b>Opening weekend</b></article><article><span>Venue</span><b>${esc(MATCH.venue || "Amex Stadium")}</b></article><article><span>Kick-off</span><b>${esc(MATCH.time || "14:00")}</b></article><article><span>Coverage</span><b>${esc(MATCH.broadcast || "To be confirmed")}</b></article>`;
  }

  function updatePersonalMatchPlan() {
    const prediction = safeStorage.get("albionPrediction");
    if ($("matchCentrePrediction")) $("matchCentrePrediction").textContent = prediction || "Not saved yet";
    let starters = 0;
    try {
      const saved = JSON.parse(safeStorage.get("albionXI") || "{}");
      starters = Array.isArray(saved.values) ? saved.values.filter(Boolean).length : 0;
    } catch {}
    if ($("matchCentreXIStatus")) $("matchCentreXIStatus").textContent = starters === 11 ? "Starting XI complete" : starters ? `${starters}/11 selected` : "Not selected yet";
    const predictionCheck = document.querySelector('[data-match-check="prediction"]');
    if (predictionCheck && prediction) predictionCheck.checked = true;
  }

  function matchChecklist() {
    const boxes = [...document.querySelectorAll("[data-match-check]")];
    if (!boxes.length) return;
    let saved = {};
    try { saved = JSON.parse(safeStorage.get("albionMatchChecklist") || "{}"); } catch {}
    boxes.forEach((box) => {
      box.checked = Boolean(saved[box.dataset.matchCheck]) || (box.dataset.matchCheck === "prediction" && Boolean(safeStorage.get("albionPrediction")));
      box.addEventListener("change", () => {
        const current = Object.fromEntries(boxes.map((item) => [item.dataset.matchCheck, item.checked]));
        safeStorage.set("albionMatchChecklist", JSON.stringify(current));
      });
    });
    $("clearMatchChecklist")?.addEventListener("click", () => {
      boxes.forEach((box) => { box.checked = false; });
      safeStorage.remove("albionMatchChecklist");
    });
  }

  function profileMarkup(player) {
    const number = player.number == null ? "TBC" : player.number;
    return `<article class="player-profile-card" data-position="${esc(player.position)}" data-search="${esc(`${player.name} ${player.nationality} ${player.role} ${player.position}`.toLowerCase())}">
      <div class="player-card-top"><span class="player-avatar" aria-hidden="true">${esc(player.initials || player.name.slice(0,2))}</span><span class="player-number">${esc(number)}</span></div>
      <div class="player-card-copy"><p>${esc(player.position)}</p><h3>${esc(player.name)}</h3><span>${esc(player.nationality)}</span><small>${esc(player.role)}</small></div>
      <div class="player-card-actions"><button class="ghost" data-profile-name="${esc(player.name)}" type="button">View profile</button><button data-add-player="${esc(player.name)}" type="button">Add to XI</button></div>
    </article>`;
  }

  function renderProfiles() {
    const grid = $("playerProfileGrid");
    if (!grid) return;
    const query = ($("playerProfileSearch")?.value || "").trim().toLowerCase();
    const position = $("playerPositionFilter")?.value || "all";
    const visible = profileList.filter((player) => {
      const search = `${player.name} ${player.nationality} ${player.role} ${player.position}`.toLowerCase();
      return (!query || search.includes(query)) && (position === "all" || player.position === position);
    });
    grid.innerHTML = visible.map(profileMarkup).join("") || '<p class="empty-profile-state">No players match that search.</p>';
    if ($("playerProfileCount")) $("playerProfileCount").textContent = `${visible.length} player${visible.length === 1 ? "" : "s"}`;
  }

  function showProfile(name) {
    const player = profileList.find((item) => item.name === name);
    const dialog = $("playerProfileDialog");
    const content = $("playerProfileDialogContent");
    if (!player || !dialog || !content) return;
    const number = player.number == null ? "Squad number to be confirmed" : `Squad number ${player.number}`;
    content.innerHTML = `<div class="dialog-player-head"><span class="player-avatar large" aria-hidden="true">${esc(player.initials)}</span><div><p>${esc(player.position)}</p><h2 id="playerDialogTitle">${esc(player.name)}</h2><span>${esc(number)} · ${esc(player.nationality)}</span></div></div><dl><div><dt>Primary role</dt><dd>${esc(player.role)}</dd></div><div><dt>Squad snapshot</dt><dd>${esc(player.summary)}</dd></div></dl><div class="dialog-player-actions"><button data-add-player="${esc(player.name)}" type="button">Add to my XI</button><a class="button-link secondary" href="https://www.brightonandhovealbion.com/first-team-men-squad" rel="noopener" target="_blank">Official squad page</a></div>`;
    if (typeof dialog.showModal === "function") dialog.showModal(); else dialog.setAttribute("open", "");
  }

  function addPlayerToXI(name, sourceButton) {
    const pitchSelects = [...document.querySelectorAll("#pitch select")];
    const benchSelects = [...document.querySelectorAll("#bench select")];
    if ([...pitchSelects, ...benchSelects].some((select) => select.value === name)) {
      if ($("xiMessage")) $("xiMessage").textContent = `${name} is already in your selected squad.`;
      location.hash = "xi";
      return;
    }
    const player = profileList.find((item) => item.name === name);
    const role = (player?.role || "").toLowerCase();
    const preferredRoles = role.includes("goalkeeper") ? ["GK"]
      : role.includes("centre-back") ? ["CB"]
      : role.includes("right-back") ? ["RB", "RWB"]
      : role.includes("left-back") ? ["LB", "LWB"]
      : role.includes("full-back") || role.includes("wing-back") ? ["RB", "LB", "RWB", "LWB"]
      : role.includes("defensive midfielder") ? ["DM", "CM"]
      : role.includes("central midfielder") ? ["CM", "DM", "AM"]
      : role.includes("attacking midfielder") ? ["AM", "CM", "RW", "LW"]
      : role.includes("left winger") ? ["LW", "AM", "RW"]
      : role.includes("right winger") ? ["RW", "AM", "LW"]
      : role.includes("winger") || role.includes("wide") ? ["RW", "LW", "AM"]
      : role.includes("centre-forward") ? ["ST"]
      : role.includes("forward") ? ["ST", "AM", "RW", "LW"]
      : [];
    const roleForSelect = (select) => select.closest("label")?.querySelector("span")?.textContent?.trim() || "";
    let eligible = null;
    for (const preferredRole of preferredRoles) {
      eligible = pitchSelects.find((select) => !select.value && roleForSelect(select) === preferredRole && [...select.options].some((option) => option.value === name));
      if (eligible) break;
    }
    const broadEligible = pitchSelects.find((select) => !select.value && [...select.options].some((option) => option.value === name));
    const target = eligible || broadEligible || benchSelects.find((select) => !select.value && [...select.options].some((option) => option.value === name));
    if (!target) {
      if ($("xiMessage")) $("xiMessage").textContent = `No suitable empty place is available for ${name}. Clear or change a player first.`;
      location.hash = "xi";
      return;
    }
    target.value = name;
    target.dispatchEvent(new Event("change", { bubbles: true }));
    const isStarter = pitchSelects.includes(target);
    if ($("xiMessage")) $("xiMessage").textContent = `${name} added to your ${isStarter ? "starting XI" : "bench"}.`;
    if (sourceButton) { const old = sourceButton.textContent; sourceButton.textContent = "Added"; setTimeout(() => { sourceButton.textContent = old; }, 1200); }
    const dialog = $("playerProfileDialog");
    if (dialog?.open) dialog.close();
    document.querySelector("#xi")?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    setTimeout(updatePersonalMatchPlan, 100);
  }

  function playerProfiles() {
    if (!$("playerProfileGrid")) return;
    renderProfiles();
    $("playerProfileSearch")?.addEventListener("input", renderProfiles);
    $("playerPositionFilter")?.addEventListener("change", renderProfiles);
    $("playerProfileGrid")?.addEventListener("click", (event) => {
      const profileButton = event.target.closest("[data-profile-name]");
      const addButton = event.target.closest("[data-add-player]");
      if (profileButton) showProfile(profileButton.dataset.profileName);
      if (addButton) addPlayerToXI(addButton.dataset.addPlayer, addButton);
    });
    $("playerProfileDialog")?.addEventListener("click", (event) => {
      const addButton = event.target.closest("[data-add-player]");
      if (addButton) addPlayerToXI(addButton.dataset.addPlayer, addButton);
      if (event.target === $("playerProfileDialog")) $("playerProfileDialog").close();
    });
    $("closePlayerProfile")?.addEventListener("click", () => $("playerProfileDialog")?.close());
  }

  updateMatchDetails();
  matchCountdown();
  setInterval(matchCountdown, 60000);
  updatePersonalMatchPlan();
  matchChecklist();
  playerProfiles();
  document.addEventListener("change", (event) => {
    if (event.target.closest?.("#xi") || event.target.closest?.("#predictor")) setTimeout(updatePersonalMatchPlan, 80);
  });
  $("savePrediction")?.addEventListener("click", () => setTimeout(updatePersonalMatchPlan, 80));
})();
