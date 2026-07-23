(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const C = window.ALBION_CONTENT || {};
  const MATCH = C.nextMatch || {};
  const esc = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char],
    );
  const storageKeys = () =>
    Object.keys(localStorage).filter((key) => key.startsWith("albion"));
  const showMessage = (element, message) => {
    if (element) element.textContent = message;
  };

  let recoveryMessages = [];
  function recoverStoredData() {
    const structured = {
      albionXI: "object",
      albionShootoutRecord: "object",
      albionQuizProgress: "object",
      albionPredictionHistory: "array",
      albionXITactics: "object",
      albionAccessibility: "object",
    };
    Object.entries(structured).forEach(([key, type]) => {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      try {
        const value = JSON.parse(raw);
        const valid =
          type === "array"
            ? Array.isArray(value)
            : value && typeof value === "object" && !Array.isArray(value);
        if (!valid) throw new Error("Unexpected data type");
      } catch {
        recoveryMessages.push(`${key.replace(/^albion/, "")} was safely reset`);
        localStorage.removeItem(key);
      }
    });
  }

  function currentSeasonData() {
    const selected = $("seasonSelector")?.value || C.currentSeason || "2026/27";
    return (
      C.seasonDatabase?.[selected] || {
        label: selected,
        status: "Awaiting season information",
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
        position: null,
        results: [],
      }
    );
  }

  function renderSeasonCentre() {
    const database = C.seasonDatabase || {};
    const selector = $("seasonSelector");
    if (selector) {
      const seasons = Object.keys(database);
      selector.innerHTML = seasons.length
        ? seasons
            .map(
              (season) =>
                `<option value="${esc(season)}">${esc(database[season].label || season)}</option>`,
            )
            .join("")
        : '<option value="2026/27">2026/27</option>';
      selector.value = C.currentSeason || seasons[0] || "2026/27";
    }
    const render = () => {
      const season = currentSeasonData();
      showMessage($("seasonPlayed"), season.played || 0);
      showMessage($("seasonPoints"), season.points || 0);
      showMessage(
        $("seasonRecord"),
        `${season.won || 0}-${season.drawn || 0}-${season.lost || 0}`,
      );
      showMessage(
        $("seasonGoals"),
        `${season.goalsFor || 0}-${season.goalsAgainst || 0}`,
      );
      showMessage(
        $("seasonPosition"),
        season.position
          ? `${season.position}${ordinalSuffix(season.position)} place`
          : season.status,
      );
      showMessage(
        $("seasonSummary"),
        `${season.played || 0} played · ${season.points || 0} points · ${season.goalsFor || 0}-${season.goalsAgainst || 0} goals`,
      );
      renderPredictionHistory();
    };
    selector?.addEventListener("change", render);
    render();
  }

  function ordinalSuffix(number) {
    const value = Number(number);
    if (value % 100 >= 11 && value % 100 <= 13) return "th";
    return value % 10 === 1
      ? "st"
      : value % 10 === 2
        ? "nd"
        : value % 10 === 3
          ? "rd"
          : "th";
  }

  function renderMatchdayMode() {
    const kickOff = new Date(MATCH.dateISO);
    const difference = kickOff - new Date();
    const hours = difference / 36e5;
    const title = `Albion v ${MATCH.opponent || "next opponent"}`;
    let phase = "Planning";
    let headline = `Planning for ${title}`;
    let guidance =
      "Save your prediction, choose your XI and review the confirmed match details.";
    if (hours <= 24 && hours > 3) {
      phase = "Matchday";
      headline = `${title} is today`;
      guidance =
        "Check travel, weather, ticket entrance and the latest official information.";
    } else if (hours <= 3 && hours >= -3) {
      phase = "Around kick-off";
      headline = `${title} · ${MATCH.time || ""}`;
      guidance =
        "The fan hub does not guess live events. Use the official match page for confirmed updates.";
    } else if (hours < -3) {
      phase = "After the match";
      headline = "Result awaiting a verified update";
      guidance =
        "Once the central data file is updated, the fixture moves into the season archive.";
    }
    showMessage($("matchdayPhase"), phase);
    showMessage($("matchdayHeadline"), headline);
    showMessage($("matchdayGuidance"), guidance);
  }

  function renderOpponentBriefing() {
    showMessage(
      $("opponentBriefingTitle"),
      MATCH.opponent || "To be confirmed",
    );
    showMessage(
      $("opponentBriefingText"),
      `Albion’s next listed fixture is against ${MATCH.opponent || "an opponent to be confirmed"}. This briefing uses confirmed schedule information and deliberately leaves unconfirmed team news blank.`,
    );
    if ($("opponentBriefingFacts")) {
      $("opponentBriefingFacts").innerHTML = [
        ["Competition", "Premier League"],
        ["Venue", MATCH.venue || "To be confirmed"],
        ["Kick-off", `${MATCH.dateLong || ""} · ${MATCH.time || ""}`],
        ["Status", "Subject to official confirmation"],
      ]
        .map(
          ([label, value]) =>
            `<article><span>${esc(label)}</span><b>${esc(value)}</b></article>`,
        )
        .join("");
    }
  }

  function renderReturningVisit() {
    const actions = [];
    if (localStorage.getItem("albionQuizProgress"))
      actions.push(["Continue quiz", "#quiz"]);
    if (localStorage.getItem("albionShootoutRecord"))
      actions.push(["Play another shoot-out", "#shootout"]);
    if (localStorage.getItem("albionXI")) actions.push(["Edit your XI", "#xi"]);
    if (localStorage.getItem("albionPrediction"))
      actions.push(["Review match prediction", "#predictor"]);
    showMessage(
      $("returningHeadline"),
      actions.length ? "Welcome back" : "Start exploring",
    );
    $("returningActions").innerHTML = actions.length
      ? actions
          .slice(0, 4)
          .map(([label, href]) => `<a href="${href}">${esc(label)}</a>`)
          .join("")
      : '<a href="#quiz">Begin with the quiz</a><a href="#match-centre">Plan matchday</a>';
  }

  function initialiseTour() {
    const steps = [
      [
        "fan-control-centre",
        "Your fan dashboard",
        "This brings together the next match, season progress and your saved activity.",
      ],
      [
        "quiz",
        "Instant-answer quiz",
        "Choose once. The answer locks, the explanation stays visible, then the next question appears automatically.",
      ],
      [
        "shootout",
        "Brighton v Palace",
        "Take Albion’s kicks and control Verbruggen for Palace penalties.",
      ],
      [
        "fixtures",
        "Season centre",
        "Filter the schedule and review your prediction record.",
      ],
      [
        "xi",
        "Build your XI",
        "Choose the team, captain, set-piece takers and tactical approach.",
      ],
      [
        "amex-stands",
        "Explore the Amex",
        "Compare stand positions, capacities, atmosphere and accessibility information.",
      ],
      [
        "supporter-settings",
        "Your settings",
        "Adjust accessibility and move your locally saved choices between devices.",
      ],
    ];
    let index = 0;
    const coach = $("tourCoach");
    const clearHighlight = () =>
      document
        .querySelectorAll(".tour-highlight")
        .forEach((element) => element.classList.remove("tour-highlight"));
    const render = () => {
      clearHighlight();
      const [id, title, text] = steps[index];
      const target = $(id);
      target?.classList.add("tour-highlight");
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      showMessage($("tourTitle"), title);
      showMessage($("tourText"), text);
      showMessage($("tourPosition"), `${index + 1} of ${steps.length}`);
      $("tourPrevious").disabled = index === 0;
      $("tourNext").textContent =
        index === steps.length - 1 ? "Finish" : "Next";
    };
    $("startTour")?.addEventListener("click", () => {
      index = 0;
      coach.hidden = false;
      render();
    });
    $("tourPrevious")?.addEventListener("click", () => {
      index = Math.max(0, index - 1);
      render();
    });
    $("tourNext")?.addEventListener("click", () => {
      if (index === steps.length - 1) {
        coach.hidden = true;
        clearHighlight();
        localStorage.setItem("albionTourCompleted", "yes");
      } else {
        index += 1;
        render();
      }
    });
    $("tourClose")?.addEventListener("click", () => {
      coach.hidden = true;
      clearHighlight();
    });
  }

  function readPredictions() {
    try {
      const value = JSON.parse(localStorage.getItem("albionPredictionHistory"));
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function trackPredictions() {
    $("savePrediction")?.addEventListener("click", () => {
      const prediction = {
        match: MATCH.dateISO,
        date: MATCH.dateLong,
        opponent: MATCH.opponent,
        home: Number($("homeScore").value),
        away: Number($("awayScore").value),
        scorer: $("firstScorer").value,
        player: $("motm").value,
        savedAt: new Date().toISOString(),
      };
      const history = readPredictions().filter(
        (item) => item.match !== prediction.match,
      );
      history.unshift(prediction);
      localStorage.setItem(
        "albionPredictionHistory",
        JSON.stringify(history.slice(0, 60)),
      );
      renderPredictionHistory();
      renderReturningVisit();
    });
  }

  function renderPredictionHistory() {
    const target = $("predictionHistory");
    if (!target) return;
    const predictions = readPredictions();
    const results = Object.values(C.seasonDatabase || {}).flatMap(
      (season) => season.results || [],
    );
    if (!predictions.length) {
      target.textContent = "Save a match prediction to begin your record.";
      return;
    }
    let exact = 0;
    const rows = predictions.map((prediction) => {
      const result = results.find(
        (item) =>
          item.dateISO === prediction.match ||
          (item.date === prediction.date &&
            item.opponent === prediction.opponent),
      );
      const correct =
        result &&
        Number(result.albionGoals) === prediction.home &&
        Number(result.opponentGoals) === prediction.away;
      if (correct) exact += 1;
      return `<tr><td>${esc(prediction.date || "")}</td><td>${esc(prediction.opponent || "")}</td><td>${prediction.home}-${prediction.away}</td><td>${result ? `${result.albionGoals}-${result.opponentGoals}${correct ? " · exact" : ""}` : "Awaiting result"}</td></tr>`;
    });
    target.innerHTML = `<p><b>${predictions.length}</b> saved prediction${predictions.length === 1 ? "" : "s"} · <b>${exact}</b> exact score${exact === 1 ? "" : "s"}</p><div class="table-scroll"><table><thead><tr><th>Date</th><th>Opponent</th><th>Your prediction</th><th>Result</th></tr></thead><tbody>${rows.join("")}</tbody></table></div>`;
  }

  function selectedXIPlayers() {
    return [...document.querySelectorAll("#pitch select")]
      .map((select) => select.value)
      .filter(Boolean);
  }

  function initialiseXITools() {
    const controls = [
      $("xiCaptain"),
      $("xiPenaltyTaker"),
      $("xiFreeKickTaker"),
    ];
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem("albionXITactics")) || {};
    } catch {}
    const refreshOptions = () => {
      const players = selectedXIPlayers();
      controls.forEach((select) => {
        if (!select) return;
        const current =
          select.id === "xiCaptain"
            ? saved.captain
            : select.id === "xiPenaltyTaker"
              ? saved.penalty
              : saved.freeKick;
        const selected = select.value || current || "";
        select.innerHTML =
          '<option value="">Choose from your XI</option>' +
          players.map((player) => `<option>${esc(player)}</option>`).join("");
        if (players.includes(selected)) select.value = selected;
      });
    };
    const save = () => {
      saved = {
        captain: $("xiCaptain").value,
        penalty: $("xiPenaltyTaker").value,
        freeKick: $("xiFreeKickTaker").value,
        approach: $("xiApproach").value,
      };
      localStorage.setItem("albionXITactics", JSON.stringify(saved));
    };
    if (saved.approach) $("xiApproach").value = saved.approach;
    controls.forEach((select) => select?.addEventListener("change", save));
    $("xiApproach")?.addEventListener("change", save);
    $("pitch")?.addEventListener("change", () => {
      refreshOptions();
      save();
    });
    ["loadPredicted", "completeXI", "clearXI"].forEach((id) =>
      $(id)?.addEventListener("click", () => {
        refreshOptions();
        save();
      }),
    );
    $("formation")?.addEventListener("change", refreshOptions);

    const encoded = new URLSearchParams(location.hash.replace(/^#/, "")).get(
      "xi",
    );
    if (encoded) {
      try {
        const shared = JSON.parse(decodeURIComponent(escape(atob(encoded))));
        if (shared.formation) $("formation").value = shared.formation;
        const selects = [...document.querySelectorAll("#pitch select")];
        (shared.values || []).forEach((value, index) => {
          if (
            selects[index] &&
            [...selects[index].options].some((option) => option.value === value)
          )
            selects[index].value = value;
        });
        selects.forEach((select) =>
          select.dispatchEvent(new Event("change", { bubbles: true })),
        );
        saved = shared.tactics || saved;
        if (saved.approach) $("xiApproach").value = saved.approach;
      } catch {}
    }
    refreshOptions();
    controls.forEach((select) => {
      const key =
        select.id === "xiCaptain"
          ? "captain"
          : select.id === "xiPenaltyTaker"
            ? "penalty"
            : "freeKick";
      if (selectedXIPlayers().includes(saved[key])) select.value = saved[key];
    });
    $("copyXILink")?.addEventListener("click", async () => {
      const payload = {
        formation: $("formation").value,
        values: [...document.querySelectorAll("#pitch select")].map(
          (select) => select.value,
        ),
        tactics: {
          captain: $("xiCaptain").value,
          penalty: $("xiPenaltyTaker").value,
          freeKick: $("xiFreeKickTaker").value,
          approach: $("xiApproach").value,
        },
      };
      const encodedPayload = btoa(
        unescape(encodeURIComponent(JSON.stringify(payload))),
      );
      const url = `${location.href.split("#")[0]}#xi=${encodeURIComponent(encodedPayload)}`;
      try {
        await navigator.clipboard.writeText(url);
        showMessage($("xiMessage"), "Recreatable XI link copied.");
      } catch {
        window.prompt("Copy this XI link:", url);
      }
    });

    let draggedIndex = null;
    const decorateSlots = () => {
      [...document.querySelectorAll("#pitch .player-slot")].forEach(
        (slot, index) => {
          if (slot.querySelector(".drag-handle")) return;
          const handle = document.createElement("button");
          handle.type = "button";
          handle.className = "drag-handle";
          handle.draggable = true;
          handle.setAttribute("aria-label", `Move player slot ${index + 1}`);
          handle.textContent = "↕";
          handle.addEventListener("dragstart", (event) => {
            draggedIndex = index;
            event.dataTransfer.effectAllowed = "move";
          });
          slot.appendChild(handle);
          slot.addEventListener("dragover", (event) => event.preventDefault());
          slot.addEventListener("drop", (event) => {
            event.preventDefault();
            if (draggedIndex === null || draggedIndex === index) return;
            const selects = [...document.querySelectorAll("#pitch select")];
            [selects[draggedIndex].value, selects[index].value] = [
              selects[index].value,
              selects[draggedIndex].value,
            ];
            selects[index].dispatchEvent(
              new Event("change", { bubbles: true }),
            );
            draggedIndex = null;
          });
        },
      );
    };
    decorateSlots();
    new MutationObserver(decorateSlots).observe($("pitch"), {
      childList: true,
      subtree: true,
    });
  }

  function initialiseAccessibility() {
    const controls = {
      largeTextSetting: "largeText",
      highContrastSetting: "highContrast",
      reduceMotionSetting: "reduceMotion",
      dataSaverSetting: "dataSaver",
    };
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem("albionAccessibility")) || {};
    } catch {}
    const apply = () => {
      document.body.classList.toggle(
        "user-large-text",
        Boolean(saved.largeText),
      );
      document.body.classList.toggle(
        "user-high-contrast",
        Boolean(saved.highContrast),
      );
      document.body.classList.toggle(
        "user-reduce-motion",
        Boolean(saved.reduceMotion),
      );
      document.body.classList.toggle(
        "user-data-saver",
        Boolean(saved.dataSaver),
      );
    };
    Object.entries(controls).forEach(([id, key]) => {
      const input = $(id);
      input.checked = Boolean(saved[key]);
      input.addEventListener("change", () => {
        saved[key] = input.checked;
        localStorage.setItem("albionAccessibility", JSON.stringify(saved));
        apply();
      });
    });
    apply();
  }

  function initialiseDataTransfer() {
    $("exportFanData")?.addEventListener("click", () => {
      const data = Object.fromEntries(
        storageKeys().map((key) => [key, localStorage.getItem(key)]),
      );
      const blob = new Blob(
        [
          JSON.stringify(
            {
              format: "albion-fan-data-v1",
              exportedAt: new Date().toISOString(),
              data,
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "albion-fan-data.json";
      link.click();
      URL.revokeObjectURL(url);
      showMessage($("dataTransferStatus"), "Your local fan data was exported.");
    });
    $("importFanData")?.addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const payload = JSON.parse(await file.text());
        if (payload.format !== "albion-fan-data-v1" || !payload.data)
          throw new Error("Wrong file format");
        Object.entries(payload.data).forEach(([key, value]) => {
          if (key.startsWith("albion") && typeof value === "string")
            localStorage.setItem(key, value);
        });
        showMessage(
          $("dataTransferStatus"),
          "Data restored. Reloading the fan hub…",
        );
        window.setTimeout(() => location.reload(), 700);
      } catch {
        showMessage(
          $("dataTransferStatus"),
          "That file is not a valid Albion Fan Hub backup.",
        );
      }
    });
  }

  function runDiagnostics() {
    const ids = [...document.querySelectorAll("[id]")].map(
      (element) => element.id,
    );
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    const required = [
      "quizContainer",
      "goal",
      "fixtureList",
      "pitch",
      "standInfo",
      "supporter-settings",
    ];
    const missing = required.filter((id) => !$(id));
    const issues = [];
    if (duplicateIds.length) issues.push("duplicate page controls");
    if (missing.length) issues.push("missing feature panels");
    if (recoveryMessages.length) issues.push(...recoveryMessages);
    showMessage(
      $("diagnosticStatus"),
      issues.length
        ? `Recovered or detected: ${issues.join("; ")}.`
        : "All core panels and locally saved data passed the checks.",
    );
  }

  function initialiseConnectionStatus() {
    const update = () =>
      showMessage(
        $("connectionStatus"),
        navigator.onLine
          ? "Online. Current web information can be requested."
          : "Offline. Cached quiz, penalty and saved supporter features remain available.",
      );
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    update();
  }

  function enhanceSearch() {
    const search = $("siteSearch");
    const results = $("siteSearchResults");
    if (!search || !results) return;
    const sectionEntries = [
      ["quiz", "Sections", "Quiz"],
      ["shootout", "Sections", "Penalty shoot-out"],
      ["match-centre", "Sections", "Matchday centre"],
      ["fixtures", "Sections", "Fixtures and season"],
      ["xi", "Sections", "Pick your XI"],
      ["story", "Sections", "Albion Story"],
      ["amex-stands", "Sections", "Amex stands"],
      ["travel", "Sections", "Travel"],
      ["supporter-settings", "Sections", "Accessibility and data"],
    ];
    const playerEntries = (C.squad || []).map((player) => [
      "xi",
      "Players",
      player.name,
    ]);
    const fixtureEntries = (C.fixtures || []).map((fixture) => [
      "fixtures",
      "Fixtures",
      `${fixture.opponent} · ${fixture.date} · ${fixture.venue === "H" ? "Home" : "Away"}`,
    ]);
    const historyEntries = [...document.querySelectorAll("#story article")].map(
      (article) => ["story", "History", article.textContent.trim()],
    );
    const entries = [
      ...sectionEntries,
      ...playerEntries,
      ...fixtureEntries,
      ...historyEntries,
    ];
    search.addEventListener("input", () => {
      const query = search.value.trim().toLowerCase();
      if (query.length < 2) return;
      const matches = entries
        .filter((entry) => entry[2].toLowerCase().includes(query))
        .slice(0, 12);
      const groups = [...new Set(matches.map((entry) => entry[1]))];
      results.innerHTML = matches.length
        ? groups
            .map(
              (group) =>
                `<section><b>${esc(group)}</b>${matches
                  .filter((entry) => entry[1] === group)
                  .map(
                    ([id, , label]) =>
                      `<a href="#${id}">${esc(label.slice(0, 90))}</a>`,
                  )
                  .join("")}</section>`,
            )
            .join("")
        : "<span>No matching player, fixture, history item or section.</span>";
    });
  }

  function initialiseHistoryExplorer() {
    const input = $("historySearch");
    const output = $("historySearchResults");
    const entries = [...document.querySelectorAll("#story article")];
    input?.addEventListener("input", () => {
      const query = input.value.trim().toLowerCase();
      if (query.length < 2) {
        output.innerHTML = "";
        return;
      }
      const matches = entries
        .filter((article) => article.textContent.toLowerCase().includes(query))
        .slice(0, 8);
      output.innerHTML = matches.length
        ? matches
            .map((article, index) => {
              const panel = article.closest(".story-panel")?.id || "journey";
              return `<button type="button" data-history-panel="${panel}" data-history-index="${entries.indexOf(article)}">${esc(article.textContent.trim().replace(/\s+/g, " ").slice(0, 120))}</button>`;
            })
            .join("")
        : "<span>No matching archive item.</span>";
    });
    output?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-history-panel]");
      if (!button) return;
      document
        .querySelector(
          `.story-tab[data-story="${button.dataset.historyPanel}"]`,
        )
        ?.click();
      entries[Number(button.dataset.historyIndex)]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }

  function initialiseGamepad() {
    let connected = false;
    let previous = [];
    const targets = [...document.querySelectorAll(".target")];
    const mapping = {
      4: 0,
      14: 1,
      6: 2,
      0: 3,
      5: 4,
      15: 5,
      7: 6,
    };
    const poll = () => {
      if (!connected) return;
      const pad = navigator.getGamepads?.()[0];
      if (pad) {
        pad.buttons.forEach((button, index) => {
          const justPressed = button.pressed && !previous[index];
          if (justPressed && mapping[index] !== undefined) {
            const target = targets[mapping[index]];
            if (target && !target.disabled) target.click();
          }
          if (justPressed && index === 3 && !$("panenkaButton").disabled)
            $("panenkaButton").click();
        });
        previous = pad.buttons.map((button) => button.pressed);
      }
      requestAnimationFrame(poll);
    };
    window.addEventListener("gamepadconnected", (event) => {
      connected = true;
      showMessage(
        $("gamepadStatus"),
        `${event.gamepad.id || "Controller"} connected. Bumpers, triggers and D-pad choose side targets; A chooses centre; Y tries a Panenka.`,
      );
      requestAnimationFrame(poll);
    });
    window.addEventListener("gamepaddisconnected", () => {
      connected = false;
      showMessage(
        $("gamepadStatus"),
        "Controller disconnected. Keyboard controls remain available.",
      );
    });
  }

  recoverStoredData();
  renderMatchdayMode();
  renderSeasonCentre();
  renderOpponentBriefing();
  renderReturningVisit();
  initialiseTour();
  trackPredictions();
  initialiseXITools();
  initialiseAccessibility();
  initialiseDataTransfer();
  runDiagnostics();
  $("runDiagnostics")?.addEventListener("click", runDiagnostics);
  initialiseConnectionStatus();
  enhanceSearch();
  initialiseHistoryExplorer();
  initialiseGamepad();
})();
