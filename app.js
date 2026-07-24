(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const C = window.ALBION_CONTENT || {};
  const Q = window.ALBION_QUIZ || [];
  const squad = C.squad || [];
  const MATCH = C.nextMatch || {
    opponent: "Aston Villa",
    dateLong: "Sunday 23 August 2026",
    dateShort: "23 Aug",
    time: "14:00",
    venue: "Amex Stadium",
    dateISO: "2026-08-23T14:00:00+01:00",
  };
  let playSfx = () => {};
  let playChant = () => {};
  let toastTimer = 0;
  function showToast(message) {
    const toast = $("siteToast");
    if (!toast) return;
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toast.classList.add("show");
    toastTimer = window.setTimeout(() => {
      toast.classList.remove("show");
      toast.hidden = true;
    }, 2200);
  }
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
  const shuffle = (array) => {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  async function shareText(title, text, button) {
    try {
      if (navigator.share) {
        await navigator.share({ title, text });
        showToast("Shared successfully");
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        button.textContent = "Copied";
        showToast("Copied to your clipboard");
      } else {
        window.prompt("Copy this result:", text);
      }
    } catch {}
    if (button)
      window.setTimeout(() => {
        button.textContent = button.dataset.defaultLabel || "Share result";
      }, 1400);
  }
  const vibrate = (pattern) => {
    try {
      if (navigator.vibrate) navigator.vibrate(pattern);
    } catch {}
  };

  function countdown() {
    const el = $("countdown");
    if (!el) return;
    const remaining = new Date(MATCH.dateISO) - new Date();
    if (remaining <= 0) {
      el.textContent = "Matchday";
      if ($("quickCountdown")) $("quickCountdown").textContent = "Matchday";
      return;
    }
    const days = Math.floor(remaining / 864e5);
    const hours = Math.floor((remaining % 864e5) / 36e5);
    const minutes = Math.floor((remaining % 36e5) / 6e4);
    el.innerHTML = `<b>${days}</b> days <b>${hours}</b> hrs <b>${minutes}</b> mins`;
    if ($("quickCountdown"))
      $("quickCountdown").textContent =
        `${days}d ${hours}h ${minutes}m to kick-off`;
  }

  function matchConfiguration() {
    const title = `Albion v ${MATCH.opponent}`;
    const shortOpponent = MATCH.opponent.replace(/^Aston /, "");
    $("heroMatchTitle").textContent = title;
    $("heroMatchDate").textContent = MATCH.dateLong;
    $("heroMatchTime").textContent = MATCH.time;
    $("heroMatchVenue").textContent = MATCH.venue;
    $("stickyMatchTitle").textContent = `Next: ${title}`;
    $("stickyMatchDetail").textContent =
      `${MATCH.dateShort} · ${MATCH.time} · ${MATCH.venue.replace(" Stadium", "")}`;
    $("dashboardOpponent").textContent = MATCH.opponent;
    $("centreMatchTitle").textContent = title;
    $("centreMatchDate").textContent = MATCH.dateLong.replace(
      /^[A-Za-z]+ /,
      "",
    );
    $("centreMatchTime").textContent = MATCH.time;
    $("centreMatchVenue").textContent = MATCH.venue;
    $("predictorMatchTitle").textContent = title;
    if ($("quickNextFixture")) $("quickNextFixture").textContent = title;
    $("awayScoreLabel").textContent = `${shortOpponent} goals`;
    try {
      const local = new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      }).format(new Date(MATCH.dateISO));
      $("localKickoff").textContent = `Your local kick-off: ${local}`;
    } catch {
      $("localKickoff").textContent = "";
    }
    const matchGap = new Date(MATCH.dateISO) - new Date();
    document.body.classList.toggle(
      "matchday-mode",
      matchGap <= 864e5 && matchGap >= -216e5,
    );
  }

  const groupOrder = ["Goalkeeper", "Defender", "Midfielder", "Forward"];
  function renderSquad() {
    const labels = {
      Goalkeeper: "Goalkeepers",
      Defender: "Defenders",
      Midfielder: "Midfielders",
      Forward: "Forwards",
    };
    $("squadBrowser").innerHTML = groupOrder
      .map(
        (group) => `
      <section class="position-group">
        <h3>${labels[group]}</h3>
        <ul>${squad
          .filter((player) => player.position === group)
          .map((player) => `<li>${esc(player.name)}</li>`)
          .join("")}</ul>
      </section>`,
      )
      .join("");
  }

  const formations = {
    "4-2-3-1": [
      "GK",
      "RB",
      "CB",
      "CB",
      "LB",
      "DM",
      "DM",
      "RW",
      "AM",
      "LW",
      "ST",
    ],
    "4-3-3": ["GK", "RB", "CB", "CB", "LB", "CM", "CM", "CM", "RW", "ST", "LW"],
    "4-4-2": ["GK", "RB", "CB", "CB", "LB", "RW", "CM", "CM", "LW", "ST", "ST"],
    "3-4-2-1": [
      "GK",
      "CB",
      "CB",
      "CB",
      "RWB",
      "CM",
      "CM",
      "LWB",
      "AM",
      "AM",
      "ST",
    ],
  };
  const preferred = {
    GK: "Bart Verbruggen",
    RB: "Jack Hinshelwood",
    CB: "Lewis Dunk",
    LB: "Maxim De Cuyper",
    DM: "Carlos Baleba",
    CM: "Mats Wieffer",
    RWB: "Ferdi Kadioglu",
    LWB: "Kaoru Mitoma",
    RW: "Yankuba Minteh",
    AM: "Georginio Rutter",
    LW: "Kaoru Mitoma",
    ST: "Danny Welbeck",
  };
  function optionsForRole(role) {
    const eligible = {
      GK: ["Goalkeeper"],
      RB: ["Defender", "Midfielder"],
      LB: ["Defender", "Midfielder"],
      CB: ["Defender"],
      DM: ["Midfielder"],
      CM: ["Midfielder"],
      RWB: ["Defender", "Midfielder"],
      LWB: ["Defender", "Midfielder"],
      RW: ["Midfielder", "Forward"],
      LW: ["Midfielder", "Forward"],
      AM: ["Midfielder", "Forward"],
      ST: ["Forward"],
    };
    return squad.filter((player) => eligible[role].includes(player.position));
  }
  function renderPitch(values = []) {
    const pitch = $("pitch");
    pitch.innerHTML = "";
    formations[$("formation").value].forEach((role, index) => {
      const cell = document.createElement("label");
      cell.className = "player-slot";
      cell.innerHTML = `<span>${role}</span><select aria-label="${role} position"><option value="">Select player</option>${optionsForRole(
        role,
      )
        .map((player) => `<option>${esc(player.name)}</option>`)
        .join("")}</select>`;
      pitch.appendChild(cell);
      cell.querySelector("select").value = values[index] || "";
    });
    pitch
      .querySelectorAll("select")
      .forEach((select) => select.addEventListener("change", saveXI));
  }
  function renderBench(values = []) {
    const bench = $("bench");
    bench.innerHTML = Array.from(
      { length: 7 },
      (_, index) =>
        `<label><span>Sub ${index + 1}</span><select aria-label="Substitute ${index + 1}"><option value="">Select player</option>${squad.map((player) => `<option>${esc(player.name)}</option>`).join("")}</select></label>`,
    ).join("");
    bench.querySelectorAll("select").forEach((select, index) => {
      select.value = values[index] || "";
      select.addEventListener("change", saveXI);
    });
  }
  function saveXI() {
    const values = [...document.querySelectorAll("#pitch select")].map(
      (select) => select.value,
    );
    const bench = [...document.querySelectorAll("#bench select")].map(
      (select) => select.value,
    );
    const chosen = [...values, ...bench].filter(Boolean);
    const unique = new Set(chosen);
    localStorage.setItem(
      "albionXI",
      JSON.stringify({ formation: $("formation").value, values, bench }),
    );
    localStorage.setItem("albionXISavedAt", new Date().toISOString());
    const startingComplete = values.filter(Boolean).length === 11;
    const benchComplete = bench.filter(Boolean).length === 7;
    if ($("quickXIStatus"))
      $("quickXIStatus").textContent = startingComplete
        ? `${$("formation").value} selected`
        : `${values.filter(Boolean).length}/11 selected`;
    $("xiMessage").textContent =
      unique.size !== chosen.length
        ? "Choose a different player for every starting and substitute place."
        : startingComplete && benchComplete
          ? "Your complete matchday squad is saved on this device."
          : `${values.filter(Boolean).length}/11 starters · ${bench.filter(Boolean).length}/7 substitutes selected.`;
    showToast("Your XI has been saved");
  }
  function loadPredictedXI() {
    const used = new Set();
    const values = formations[$("formation").value].map((role) => {
      let name = preferred[role];
      if (
        used.has(name) ||
        !optionsForRole(role).some((player) => player.name === name)
      ) {
        name =
          optionsForRole(role).find((player) => !used.has(player.name))?.name ||
          "";
      }
      if (name) used.add(name);
      return name;
    });
    renderPitch(values);
    renderBench(
      squad
        .map((player) => player.name)
        .filter((name) => !used.has(name))
        .slice(0, 7),
    );
    saveXI();
  }
  function completeXI() {
    const pitchSelects = [...document.querySelectorAll("#pitch select")];
    const benchSelects = [...document.querySelectorAll("#bench select")];
    const used = new Set(
      [...pitchSelects, ...benchSelects]
        .map((select) => select.value)
        .filter(Boolean),
    );
    formations[$("formation").value].forEach((role, index) => {
      if (pitchSelects[index].value) return;
      const candidates = optionsForRole(role);
      const preferredName = preferred[role];
      const choice =
        candidates.find(
          (player) => player.name === preferredName && !used.has(player.name),
        ) || candidates.find((player) => !used.has(player.name));
      if (choice) {
        pitchSelects[index].value = choice.name;
        used.add(choice.name);
      }
    });
    benchSelects.forEach((select) => {
      if (select.value) return;
      const choice = squad.find((player) => !used.has(player.name));
      if (choice) {
        select.value = choice.name;
        used.add(choice.name);
      }
    });
    saveXI();
  }
  function initXI() {
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem("albionXI")) || {};
    } catch {}
    if (saved.formation) $("formation").value = saved.formation;
    renderPitch(saved.values);
    renderBench(saved.bench);
    const savedStarterCount = Array.isArray(saved.values)
      ? saved.values.filter(Boolean).length
      : 0;
    if ($("quickXIStatus"))
      $("quickXIStatus").textContent =
        savedStarterCount === 11
          ? `${$("formation").value} selected`
          : savedStarterCount
            ? `${savedStarterCount}/11 selected`
            : "Not selected yet";
    $("formation").addEventListener("change", () => {
      const bench = [...document.querySelectorAll("#bench select")].map(
        (select) => select.value,
      );
      renderPitch();
      renderBench(bench);
      saveXI();
    });
    $("loadPredicted").addEventListener("click", loadPredictedXI);
    $("completeXI").addEventListener("click", completeXI);
    $("clearXI").addEventListener("click", () => {
      localStorage.removeItem("albionXI");
      renderPitch();
      renderBench();
      $("xiMessage").textContent = "Line-up cleared.";
      if ($("quickXIStatus"))
        $("quickXIStatus").textContent = "Not selected yet";
      showToast("Your XI has been cleared");
    });
  }

  function renderFixtures() {
    const query = $("fixtureSearch").value.toLowerCase().trim();
    const venue = $("venueFilter").value;
    const month = $("monthFilter").value;
    const fixtureMonths = {
      Jan: 0,
      Feb: 1,
      Mar: 2,
      Apr: 3,
      May: 4,
      Jun: 5,
      Jul: 6,
      Aug: 7,
      Sep: 8,
      Oct: 9,
      Nov: 10,
      Dec: 11,
    };
    const datedFixtures = (C.fixtures || []).map((fixture) => {
      const [day, month, year] = fixture.date.split(" ");
      return {
        fixture,
        date: new Date(Number(year), fixtureMonths[month], Number(day), 12),
      };
    });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextFixture =
      datedFixtures.find(
        (item) => !Number.isNaN(item.date.valueOf()) && item.date >= today,
      )?.fixture || C.fixtures?.[0];
    const fixtures = (C.fixtures || []).filter(
      (fixture) =>
        (venue === "all" || fixture.venue === venue) &&
        (month === "all" ||
          fixture.date.slice(fixture.date.indexOf(" ") + 1) === month) &&
        fixture.opponent.toLowerCase().includes(query),
    );
    $("fixtureList").innerHTML = fixtures.length
      ? fixtures
          .map(
            (fixture) => `
      <article class="fixture-item ${fixture.venue === "H" ? "fixture-home" : "fixture-away"} ${fixture === nextFixture ? "fixture-next" : ""}"><div>${fixture === nextFixture ? '<span class="next-fixture-label">NEXT FIXTURE</span>' : ""}<b>${esc(fixture.date)}</b><span class="fixture-badge ${fixture.venue === "H" ? "home-badge" : "away-badge"}">${fixture.venue === "H" ? "HOME" : "AWAY"}</span><small>Premier League</small></div>
      <div><strong>${fixture.venue === "H" ? `Albion v ${esc(fixture.opponent)}` : `${esc(fixture.opponent)} v Albion`}</strong><small>${fixture.venue === "H" ? "Amex Stadium" : "Away"} · Date provisional until confirmed by the club</small><div class="fixture-extra" id="fixture-extra-${C.fixtures.indexOf(fixture)}" hidden><span><b>Competition</b>Premier League</span><span><b>Venue</b>${fixture.venue === "H" ? "American Express Stadium" : `${esc(fixture.opponent)} away`}</span><span><b>Status</b>Check official listings before travelling</span></div></div><div class="fixture-actions"><button class="fixture-more ghost" type="button" data-fixture-expand="${C.fixtures.indexOf(fixture)}" aria-expanded="false" aria-controls="fixture-extra-${C.fixtures.indexOf(fixture)}">Details</button><button class="fixture-calendar ghost" type="button" data-calendar-index="${C.fixtures.indexOf(fixture)}" aria-label="Add ${esc(fixture.opponent)} fixture to calendar">+ Calendar</button></div></article>`,
          )
          .join("")
      : "<p>No fixtures match that search.</p>";
  }

  function renderFixtureHighlights() {
    const home = (C.fixtures || []).find((fixture) => fixture.venue === "H");
    const away = (C.fixtures || []).find((fixture) => fixture.venue === "A");
    if (home) {
      $("nextHomeFixture").textContent = `Albion v ${home.opponent}`;
      $("nextHomeDate").textContent = `${home.date} · Amex Stadium`;
    }
    if (away) {
      $("nextAwayFixture").textContent = `${away.opponent} v Albion`;
      $("nextAwayDate").textContent = `${away.date} · Away`;
    }
  }

  function initFixtureMonths() {
    const months = [];
    (C.fixtures || []).forEach((fixture) => {
      const key = fixture.date.slice(fixture.date.indexOf(" ") + 1);
      if (!months.includes(key)) months.push(key);
    });
    $("monthFilter").innerHTML =
      '<option value="all">All months</option>' +
      months
        .map((month) => `<option value="${esc(month)}">${esc(month)}</option>`)
        .join("");
    const savedMonth = localStorage.getItem("albionFixtureMonth");
    const initialMonth =
      months.includes(savedMonth) || savedMonth === "all"
        ? savedMonth
        : months[0] || "all";
    $("monthFilter").value = initialMonth;
    $("monthButtons").innerHTML =
      `<button type="button" data-month="all">All</button>` +
      months
        .map(
          (month) =>
            `<button type="button" data-month="${esc(month)}">${esc(month.split(" ")[0])}</button>`,
        )
        .join("");
    $("monthButtons")
      .querySelectorAll("button")
      .forEach((button) =>
        button.addEventListener("click", () => {
          $("monthFilter").value = button.dataset.month;
          $("monthButtons")
            .querySelectorAll("button")
            .forEach((item) =>
              item.classList.toggle("active", item === button),
            );
          localStorage.setItem("albionFixtureMonth", button.dataset.month);
          renderFixtures();
        }),
      );
    $("monthButtons")
      .querySelectorAll("button")
      .forEach((button) =>
        button.classList.toggle(
          "active",
          button.dataset.month === initialMonth,
        ),
      );
  }

  let currentQuiz = [];
  let quizPage = 0;
  let quizScore = 0;
  let quizChecked = false;
  let quizAdvanceTimer = 0;
  let quizGroups = [[0], [1], [2], [3], [4]];
  const quizProgressKey = "albionQuizProgress";
  const quizCategoryStatsKey = "albionQuizCategoryStats";
  const resetQuizGroups = () => {
    quizGroups = currentQuiz.map((_, index) => [index]);
  };
  function selectedQuizCategory() {
    return $("quizCategory")?.value || "mixed";
  }
  function poolKey() {
    return `albionQuizSeen:medium-hard:${selectedQuizCategory()}`;
  }
  function questionCategory(question) {
    const text = question.question.toLowerCase();
    if (
      /amex|goldstone|withdean|priestfield|ground|stadium|falmer|home venue/.test(
        text,
      )
    )
      return "grounds";
    if (
      /\bwho\b|which player|which goalkeeper|which forward|which midfielder|which defender|captain|goalscorer/.test(
        text,
      )
    )
      return "people";
    if (
      /record|most |how many|appearance|highest|lowest|largest|biggest|fewest|total/.test(
        text,
      )
    )
      return "records";
    if (
      /manager|managed|season|promotion|relegation|founded|league|fa cup|charity shield|europe|year|when|division|round|final/.test(
        text,
      )
    )
      return "history";
    return "modern";
  }
  function selectFreshQuestions(count = 5) {
    const basePool = Q.filter(
      (question) =>
        question.difficulty === "Medium" || question.difficulty === "Hard",
    );
    const category = selectedQuizCategory();
    const categoryPool =
      category === "mixed"
        ? basePool
        : basePool.filter(
            (question) => questionCategory(question) === category,
          );
    const pool = categoryPool.length >= count ? categoryPool : basePool;
    let seen = [];
    try {
      seen = JSON.parse(localStorage.getItem(poolKey())) || [];
    } catch {}
    let available = pool.filter(
      (question) => !seen.includes(question.question),
    );
    if (available.length < count) {
      seen = [];
      available = [...pool];
    }
    const mixed = shuffle(available);
    const chosen = [];
    ["history", "people", "grounds", "records", "modern"].forEach(
      (category) => {
        const match = mixed.find(
          (question) =>
            questionCategory(question) === category &&
            !chosen.includes(question),
        );
        if (match) chosen.push(match);
      },
    );
    mixed.forEach((question) => {
      if (chosen.length < count && !chosen.includes(question))
        chosen.push(question);
    });
    localStorage.setItem(
      poolKey(),
      JSON.stringify([...seen, ...chosen.map((question) => question.question)]),
    );
    return chosen;
  }
  function prepareQuestion(question) {
    const choices = question.options.map((text, originalIndex) => ({
      text,
      correct: originalIndex === question.answer,
    }));
    const shuffled = shuffle(choices);
    return {
      ...question,
      choices: shuffled,
      answer: shuffled.findIndex((choice) => choice.correct),
    };
  }
  function renderQuizPage() {
    const group = quizGroups[quizPage];
    const first = group[0] + 1;
    const last = group[group.length - 1] + 1;
    const total = currentQuiz.length;
    const progress = Math.round((last / total) * 100);
    $("quizContainer").innerHTML =
      `<div class="quiz-step"><div class="quiz-step-label"><b>Question ${first} of ${total}</b><span>${progress}% complete</span></div><div class="quiz-progress-track"><i style="width:${progress}%"></i></div></div>
      <div class="quiz-pair">${group
        .map((index) => {
          const question = currentQuiz[index];
          return `<fieldset class="quiz-question" data-question="${index}"><legend><span>${index + 1}</span>${esc(question.question)}</legend>${question.choices.map((choice, choiceIndex) => `<label><input type="radio" name="quizQuestion${index}" value="${choiceIndex}"><span>${esc(choice.text)}</span></label>`).join("")}<div class="quiz-feedback"></div></fieldset>`;
        })
        .join("")}</div>`;
    $("quizContainer")
      .querySelectorAll('input[type="radio"]')
      .forEach((input) => input.addEventListener("change", checkQuiz));
    const completed = quizGroups.slice(0, quizPage).flat().length;
    $("quizResult").textContent = `Score: ${quizScore}/${completed}`;
    $("checkQuiz").textContent = "Check answer";
    $("checkQuiz").disabled = false;
    quizChecked = false;
    $("quizAdvanceCountdown").hidden = true;
    $("quizAdvanceCountdown").classList.remove("running");
    localStorage.setItem(
      quizProgressKey,
      JSON.stringify({
        category: selectedQuizCategory(),
        currentQuiz,
        quizPage,
        quizScore,
      }),
    );
  }
  function newQuiz() {
    window.clearTimeout(quizAdvanceTimer);
    currentQuiz = selectFreshQuestions().map(prepareQuestion);
    resetQuizGroups();
    quizPage = 0;
    quizScore = 0;
    $("shareQuiz").hidden = true;
    $("replayMistakes").hidden = true;
    if ($("replayWeakCategory")) $("replayWeakCategory").hidden = true;
    renderQuizPage();
  }
  function initialiseQuiz() {
    const savedCategory = localStorage.getItem("albionQuizCategory") || "mixed";
    if (
      [...$("quizCategory").options].some(
        (option) => option.value === savedCategory,
      )
    )
      $("quizCategory").value = savedCategory;
    try {
      const saved = JSON.parse(localStorage.getItem(quizProgressKey));
      if (
        saved?.category === selectedQuizCategory() &&
        saved?.currentQuiz?.length === 5 &&
        Number.isInteger(saved.quizPage) &&
        saved.quizPage >= 0 &&
        saved.quizPage < 5
      ) {
        currentQuiz = saved.currentQuiz;
        resetQuizGroups();
        quizPage = saved.quizPage;
        quizScore = Number(saved.quizScore) || 0;
        renderQuizPage();
        return;
      }
    } catch {}
    newQuiz();
  }
  function showQuizResult() {
    const previousBest = Number(localStorage.getItem("albionQuizBest") || 0);
    const best =
      currentQuiz.length === 5
        ? Math.max(previousBest, quizScore)
        : previousBest;
    localStorage.setItem("albionQuizBest", String(best));
    $("bestScore").textContent = `Best: ${best}/5`;
    const ratings = [
      "Time for an Albion Refresher",
      "Are You a Secret Palace Fan?",
      "Still Learning the Albion Story",
      "Solid Albion Knowledge",
      "Amex Regular",
      "Seagulls Expert",
    ];
    const ratingScore = Math.round(
      (quizScore / Math.max(1, currentQuiz.length)) * 5,
    );
    const verdict = ratings[ratingScore] || ratings[0];
    const review = currentQuiz
      .map((question, index) => ({ question, index }))
      .sort(
        (a, b) =>
          Number(a.question.userCorrect) - Number(b.question.userCorrect),
      );
    $("quizContainer").innerHTML =
      `<div class="quiz-finish"><img src="albion-safe-graphic.svg" alt=""><b>${quizScore}/${currentQuiz.length}</b><p>${esc(verdict)}</p></div><details class="quiz-review"><summary>Review answers · mistakes shown first</summary>${review.map(({ question, index }) => `<article class="${question.userCorrect ? "review-correct" : "review-mistake"}"><b>${index + 1}. ${esc(question.question)}</b><p>${esc(question.choices[question.answer].text)} — ${esc(question.explanation)}</p></article>`).join("")}</details>`;
    $("quizResult").textContent = `${verdict} · round complete.`;
    $("checkQuiz").disabled = true;
    $("checkQuiz").textContent = "Round complete";
    $("quizAdvanceCountdown").hidden = true;
    $("quizAdvanceCountdown").classList.remove("running");
    $("shareQuiz").hidden = false;
    const mistakes = currentQuiz.filter((question) => !question.userCorrect);
    $("replayMistakes").hidden = mistakes.length === 0;
    if ($("replayWeakCategory")) {
      const weak = weakestQuizCategory();
      $("replayWeakCategory").hidden = !weak;
      $("replayWeakCategory").textContent = weak
        ? `Practise weakest area: ${weak.label}`
        : "Practise weakest area";
      $("replayWeakCategory").dataset.category = weak?.key || "";
    }
    $("shareQuiz").dataset.shareText =
      `I scored ${quizScore}/${currentQuiz.length} and earned “${verdict}” in the Albion Fan Hub quiz.`;
    localStorage.setItem(
      "albionQuizLatest",
      JSON.stringify({
        score: quizScore,
        total: currentQuiz.length,
        rating: verdict,
        completedAt: new Date().toISOString(),
      }),
    );
    localStorage.removeItem(quizProgressKey);
    window.dispatchEvent(new Event("albion:progress"));
  }
  function replayQuizMistakes() {
    const mistakes = currentQuiz
      .filter((question) => !question.userCorrect)
      .map((question) => ({ ...question, userCorrect: undefined }));
    if (!mistakes.length) return;
    window.clearTimeout(quizAdvanceTimer);
    currentQuiz = mistakes;
    resetQuizGroups();
    quizPage = 0;
    quizScore = 0;
    $("shareQuiz").hidden = true;
    $("replayMistakes").hidden = true;
    renderQuizPage();
    $("quizResult").textContent = "Mistakes round: your first choice is final.";
  }
  function readQuizCategoryStats() {
    try {
      return JSON.parse(localStorage.getItem(quizCategoryStatsKey)) || {};
    } catch {
      return {};
    }
  }
  function weakestQuizCategory() {
    const labels = {
      history: "History",
      people: "Players",
      grounds: "Amex & grounds",
      records: "Records",
      modern: "Modern Albion",
    };
    const entries = Object.entries(readQuizCategoryStats())
      .filter(([, value]) => Number(value?.answered) >= 2)
      .map(([key, value]) => ({
        key,
        label: labels[key] || key,
        rate: Number(value.correct) / Math.max(1, Number(value.answered)),
        answered: Number(value.answered),
      }))
      .sort((a, b) => a.rate - b.rate || b.answered - a.answered);
    return entries[0] || null;
  }
  function replayWeakQuizCategory() {
    const category = $("replayWeakCategory")?.dataset.category;
    if (!category) return;
    $("quizCategory").value = category;
    localStorage.setItem("albionQuizCategory", category);
    localStorage.removeItem(quizProgressKey);
    newQuiz();
    $("quizResult").textContent =
      "Focused round: your weakest Albion category.";
  }
  function checkQuiz() {
    if (quizChecked) return;
    const group = quizGroups[quizPage];
    const answers = group.map((index) =>
      document.querySelector(`input[name="quizQuestion${index}"]:checked`),
    );
    if (answers.some((answer) => !answer)) {
      $("quizResult").textContent =
        group.length === 1
          ? "Choose an answer first."
          : "Answer both questions first.";
      return;
    }
    group.forEach((index, groupIndex) => {
      const question = currentQuiz[index];
      const selected = Number(answers[groupIndex].value);
      const correct = selected === question.answer;
      question.userCorrect = correct;
      if (correct) quizScore += 1;
      const category = questionCategory(question);
      const categoryStats = readQuizCategoryStats();
      const categoryRecord = categoryStats[category] || {
        answered: 0,
        correct: 0,
      };
      categoryRecord.answered += 1;
      if (correct) categoryRecord.correct += 1;
      categoryStats[category] = categoryRecord;
      localStorage.setItem(
        quizCategoryStatsKey,
        JSON.stringify(categoryStats),
      );
      const fieldset = document.querySelector(
        `.quiz-question[data-question="${index}"]`,
      );
      const labels = [...fieldset.querySelectorAll("label")];
      fieldset.classList.add(correct ? "correct" : "incorrect");
      labels[question.answer].classList.add("answer-correct");
      if (!correct) labels[selected].classList.add("answer-wrong");
      fieldset.querySelectorAll("input").forEach((input) => {
        input.disabled = true;
      });
      fieldset.querySelector(".quiz-feedback").innerHTML =
        `<b>${correct ? "Correct!" : `Correct answer: ${esc(question.choices[question.answer].text)}.`}</b><br>${esc(question.explanation)}`;
    });
    const completed = quizGroups.slice(0, quizPage + 1).flat().length;
    $("quizResult").textContent = `Score: ${quizScore}/${completed}`;
    quizChecked = true;
    $("checkQuiz").disabled = true;
    const finalQuestion = quizPage === quizGroups.length - 1;
    $("checkQuiz").textContent = finalQuestion
      ? "Results loading…"
      : "Next question loading…";
    const autoNext = $("quizAdvanceCountdown");
    autoNext.querySelector("span").textContent = finalQuestion
      ? "Your result will appear in a moment…"
      : "Next question in a moment…";
    autoNext.hidden = false;
    autoNext.classList.remove("running");
    void autoNext.offsetWidth;
    autoNext.classList.add("running");
    quizAdvanceTimer = window.setTimeout(() => {
      if (finalQuestion) showQuizResult();
      else {
        quizPage += 1;
        renderQuizPage();
      }
    }, 3700);
  }

  function predictor() {
    const scorers = squad
      .filter((player) => player.position !== "Goalkeeper")
      .map((player) => player.name);
    $("firstScorer").innerHTML =
      "<option>No scorer</option>" +
      scorers.map((name) => `<option>${esc(name)}</option>`).join("");
    $("motm").innerHTML = squad
      .map((player) => `<option>${esc(player.name)}</option>`)
      .join("");
    $("savePrediction").addEventListener("click", () => {
      const text = `Albion ${$("homeScore").value}-${$("awayScore").value} ${MATCH.opponent} · First scorer: ${$("firstScorer").value} · Player of the match: ${$("motm").value}`;
      localStorage.setItem("albionPrediction", text);
      localStorage.setItem(
        "albionPredictionSavedAt",
        new Date().toISOString(),
      );
      $("predictionSummary").textContent = text;
      showToast("Match prediction saved");
      window.dispatchEvent(new Event("albion:progress"));
    });
    $("predictionSummary").textContent =
      localStorage.getItem("albionPrediction") ||
      "Make and save your prediction.";
  }

  function leaguePredictor() {
    const slider = $("leaguePosition");
    const output = $("leaguePositionOutput");
    const band = $("leagueBand");
    const summary = $("leaguePredictionSummary");
    const ordinal = (value) => {
      const number = Number(value);
      const mod100 = number % 100;
      if (mod100 >= 11 && mod100 <= 13) return `${number}th`;
      return `${number}${number % 10 === 1 ? "st" : number % 10 === 2 ? "nd" : number % 10 === 3 ? "rd" : "th"}`;
    };
    const bandFor = (position) =>
      position <= 4
        ? "Champions League places"
        : position <= 7
          ? "European places"
          : position <= 10
            ? "Top half"
            : position <= 16
              ? "Mid-table"
              : position <= 17
                ? "Lower table"
                : "Relegation places";
    const update = () => {
      const label = ordinal(slider.value);
      output.value = label;
      output.textContent = label;
      band.textContent = bandFor(Number(slider.value));
      if ($("quickLeaguePosition"))
        $("quickLeaguePosition").textContent = `${label} · ${band.textContent}`;
    };
    const saved = Number(localStorage.getItem("albionLeaguePosition"));
    if (saved >= 1 && saved <= 20) slider.value = String(saved);
    update();
    if (!(saved >= 1 && saved <= 20) && $("quickLeaguePosition"))
      $("quickLeaguePosition").textContent = "Not predicted yet";
    if (saved >= 1 && saved <= 20)
      summary.textContent = `Your prediction: Albion to finish ${ordinal(saved)} (${bandFor(saved)}).`;
    slider.addEventListener("input", update);
    $("saveLeaguePrediction").addEventListener("click", () => {
      localStorage.setItem("albionLeaguePosition", slider.value);
      localStorage.setItem(
        "albionLeaguePredictionSavedAt",
        new Date().toISOString(),
      );
      update();
      summary.textContent = `Saved: Albion to finish ${ordinal(slider.value)} (${band.textContent}).`;
      showToast("League prediction saved");
      window.dispatchEvent(new Event("albion:progress"));
    });
    $("shareLeaguePrediction").dataset.defaultLabel = "Share prediction";
    $("shareLeaguePrediction").addEventListener("click", () =>
      shareText(
        "My Albion league prediction",
        `I predict Brighton & Hove Albion will finish ${ordinal(slider.value)} in the 2026/27 Premier League.`,
        $("shareLeaguePrediction"),
      ),
    );
  }

  function randomContent() {
    const showFact = () => {
      $("momentType").textContent = "Albion fact";
      $("momentText").textContent =
        C.facts[Math.floor(Math.random() * C.facts.length)];
    };
    const showMemory = () => {
      $("momentType").textContent = "Albion memory";
      $("momentText").textContent =
        C.memories[Math.floor(Math.random() * C.memories.length)];
    };
    showFact();
    showMemory();
    $("newFact").addEventListener("click", showFact);
    $("newMemory").addEventListener("click", showMemory);
  }

  function weather() {
    const panel = $("weatherPanel");
    const target = MATCH.dateISO.slice(0, 10);
    const days = (new Date(`${target}T12:00:00`) - new Date()) / 864e5;
    if (days > 14) {
      panel.innerHTML =
        "<b>Falmer weather</b><p>Forecasts are not reliable this far ahead. This panel will activate closer to matchday.</p>";
      if ($("quickWeather"))
        $("quickWeather").textContent = "Available nearer kick-off";
      return;
    }
    fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=50.8616&longitude=-0.0837&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Europe%2FLondon",
    )
      .then((response) => response.json())
      .then((data) => {
        const index = data.daily.time.indexOf(target);
        const weatherText =
          index < 0
            ? "Forecast not yet available"
            : `${Math.round(data.daily.temperature_2m_max[index])}°C high · ${Math.round(data.daily.precipitation_probability_max[index])}% rain`;
        panel.innerHTML =
          index < 0
            ? "<b>Falmer weather</b><p>Matchday forecast is not yet available.</p>"
            : `<b>Falmer weather</b><p>${Math.round(data.daily.temperature_2m_max[index])}°C high · ${Math.round(data.daily.temperature_2m_min[index])}°C low · ${Math.round(data.daily.precipitation_probability_max[index])}% rain chance</p>`;
        if ($("quickWeather")) $("quickWeather").textContent = weatherText;
      })
      .catch(() => {
        panel.innerHTML =
          "<b>Falmer weather</b><p>Weather is temporarily unavailable.</p>";
        if ($("quickWeather"))
          $("quickWeather").textContent = "Weather temporarily unavailable";
      });
  }

  function amex() {
    const info = {
      North: {
        title: "North Stand",
        position: "Behind the north goal",
        capacity: "Approximately 2,688",
        feel: "Traditionally one of the livelier home areas",
        best: "Supporters prioritising atmosphere and an end-on view",
        access:
          "Accessible seating and companion arrangements are available through Supporter Services.",
        detail:
          "The lower rows feel close to the action and the stand is a focal point for home support. The ticket office and two-level club megastore are on the North Stand side of the stadium.",
        tip: "Use the numbered entrance printed on your ticket. Opening arrangements can vary by fixture.",
      },
      West: {
        title: "West Stand",
        position: "Along the west touchline",
        capacity: "Published estimates vary: 11,833–13,654",
        feel: "Broad side-on views across three levels",
        best: "A wide tactical view, central seating and hospitality areas",
        access:
          "The west perimeter uses a ramp; upper levels involve additional height and steps.",
        detail:
          "The West is the largest stand. Higher seats provide a particularly broad view of team shape and movement, although upper areas involve more height and additional steps.",
        tip: "The west side of the stadium perimeter is reached by a ramp. Check accessible seating requirements with Supporter Services before booking.",
      },
      East: {
        title: "East Stand",
        position: "Along the east touchline",
        capacity: "Published estimates vary: 11,833–13,654",
        feel: "Clear side-on views and family activity in East Lower",
        best: "Families and supporters who enjoy watching the whole pitch",
        access:
          "The east perimeter route is largely flat, with accessible seating arranged through the club.",
        detail:
          "Albion promote family-friendly activity in the East Lower concourse, including selected matchday entertainment. The side-on angle makes it easier to follow tactics and movement from end to end.",
        tip: "The east perimeter route is flat tarmac. Activities and opening arrangements may change for individual fixtures.",
      },
      South: {
        title: "South Stand",
        position: "Behind the south goal",
        capacity: "Approximately 2,575",
        feel: "Home sections alongside the visiting-supporter allocation",
        best: "Visiting supporters and an end-on view at the south end",
        access:
          "Use the ticketed entrance because accessible and segregation routes can vary by fixture.",
        detail:
          "The visiting allocation is accessed from the South Stand side. Segregation and stewarding arrangements can vary depending on the fixture and ticket allocation.",
        tip: "Follow the entrance shown on the ticket and the directions of matchday stewards.",
      },
    };
    const buttons = [...document.querySelectorAll("[data-stand]")];
    const render = (stand) => {
      const item = info[stand];
      if (!item) return;
      buttons.forEach((button) => {
        const active = button.dataset.stand === stand;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
      });
      $("standInfo").innerHTML =
        `<p class="eyebrow">Your selected area</p><h3>${item.title}</h3><div class="stand-facts"><article><span>Position</span><b>${item.position}</b></article><article><span>Capacity guide</span><b>${item.capacity}</b></article><article><span>Matchday feel</span><b>${item.feel}</b></article><article><span>Best for</span><b>${item.best}</b></article></div><p>${item.detail}</p><p class="stand-access"><b>Accessibility:</b> ${item.access}</p><p class="stand-tip"><b>First-visit tip:</b> ${item.tip}</p><small>Stand figures are approximate and do not reconcile exactly with the current 31,876 ground capacity because published stand estimates pre-date later seating changes and match-by-match segregation.</small>`;
      localStorage.setItem("albionPreferredStand", stand);
      localStorage.setItem("albionStandSavedAt", new Date().toISOString());
      window.dispatchEvent(new Event("albion:progress"));
    };
    buttons.forEach((button) =>
      button.addEventListener("click", () => render(button.dataset.stand)),
    );
    const preferenceMap = {
      atmosphere: "North",
      family: "East",
      view: "West",
      visitor: "South",
    };
    $("findStand").addEventListener("click", () => {
      const stand = preferenceMap[$("standPreference").value];
      render(stand);
      $("standSuggestion").textContent =
        `${stand} Stand is the closest match.`;
    });
    const saved = localStorage.getItem("albionPreferredStand");
    if (info[saved]) render(saved);
  }

  function story() {
    const tabs = [...document.querySelectorAll(".story-tab")];
    tabs.forEach((tab) =>
      tab.addEventListener("click", () => {
        tabs.forEach((item) => {
          item.classList.toggle("active", item === tab);
          item.classList.toggle("ghost", item !== tab);
          item.setAttribute("aria-selected", String(item === tab));
        });
        document.querySelectorAll(".story-panel").forEach((panel) => {
          const active = panel.id === tab.dataset.story;
          panel.hidden = !active;
          panel.classList.toggle("active", active);
        });
      }),
    );
  }

  function historyDetails() {
    const details = [
      "The professional club was established in 1901 and entered the Southern League.",
      "As Southern League champions, Albion beat Football League champions Aston Villa 1–0 to claim the Charity Shield.",
      "Albion drew 2–2 with Manchester United at Wembley before the FA Cup final replay.",
      "Robbie Reinelt’s equaliser at Hereford kept Albion in the Football League on goals scored.",
      "The first league match at the Amex ended in a dramatic 2–1 win over Doncaster Rovers.",
      "A 2–1 win over Wigan Athletic confirmed promotion to the Premier League.",
      "A sixth-place Premier League finish secured the club’s first European campaign.",
    ];
    document
      .querySelectorAll("#journey .timeline article")
      .forEach((article, index) => {
        article.insertAdjacentHTML(
          "beforeend",
          `<button class="history-more" type="button" aria-expanded="false">More detail</button><p class="history-extra" hidden>${esc(details[index])}</p>`,
        );
        const button = article.querySelector(".history-more");
        const extra = article.querySelector(".history-extra");
        button.addEventListener("click", () => {
          const open = extra.toggleAttribute("hidden");
          button.setAttribute("aria-expanded", String(!open));
          button.textContent = open ? "More detail" : "Less detail";
        });
      });
  }

  function historyEraFilters() {
    const buttons = [...document.querySelectorAll(".era-filters button")];
    const entries = [
      ...document.querySelectorAll("#journey .timeline article"),
    ];
    buttons.forEach((button) =>
      button.addEventListener("click", () => {
        const era = button.dataset.era;
        buttons.forEach((item) => {
          item.classList.toggle("active", item === button);
          item.classList.toggle("ghost", item !== button);
        });
        entries.forEach((entry) => {
          entry.hidden = era !== "all" && entry.dataset.era !== era;
        });
      }),
    );
  }

  function peopleDetails() {
    const eras = [
      "1970s",
      "2000s",
      "2010s",
      "Modern era",
      "Amex era",
      "Premier League era",
    ];
    const extras = [
      "Ward’s goals helped drive Albion’s rise towards the top flight and made him one of the club’s most celebrated forwards.",
      "Zamora became a defining figure in successive promotions and later returned for another Albion spell.",
      "Murray scored prolifically across two spells and played a major role in promotion to the Premier League.",
      "Dunk progressed through the academy to become a long-serving first-team leader.",
      "Bruno’s leadership and connection with supporters made him an enduring symbol of the Amex years.",
      "Groß combined creativity, intelligence and set-piece quality throughout Albion’s early Premier League seasons.",
    ];
    document
      .querySelectorAll("#people .legend-grid article")
      .forEach((article, index) => {
        article.insertAdjacentHTML(
          "beforeend",
          `<span class="era-tag">${eras[index]}</span><button class="people-more ghost" type="button" aria-expanded="false">More</button><p class="people-extra" hidden>${esc(extras[index])}</p>`,
        );
        const button = article.querySelector(".people-more");
        const extra = article.querySelector(".people-extra");
        button.addEventListener("click", () => {
          const hidden = extra.toggleAttribute("hidden");
          button.textContent = hidden ? "More" : "Less";
          button.setAttribute("aria-expanded", String(!hidden));
        });
      });
  }

  function recordTabs() {
    const tabs = [...document.querySelectorAll(".record-tab")];
    tabs.forEach((tab) =>
      tab.addEventListener("click", () => {
        tabs.forEach((item) => {
          item.classList.toggle("active", item === tab);
          item.classList.toggle("ghost", item !== tab);
          item.setAttribute("aria-selected", String(item === tab));
        });
        document.querySelectorAll(".record-panel").forEach((panel) => {
          panel.hidden = panel.id !== tab.dataset.record;
        });
      }),
    );
  }

  function travelGuide() {
    const tabs = [...document.querySelectorAll(".travel-tab")];
    tabs.forEach((tab) =>
      tab.addEventListener("click", () => {
        tabs.forEach((item) => {
          item.classList.toggle("active", item === tab);
          item.classList.toggle("ghost", item !== tab);
          item.setAttribute("aria-selected", String(item === tab));
        });
        document.querySelectorAll(".travel-panel").forEach((panel) => {
          const active = panel.id === tab.dataset.travel;
          panel.hidden = !active;
          panel.classList.toggle("active", active);
        });
      }),
    );
  }

  function shootout() {
    const positions = [
      "top-left",
      "middle-left",
      "bottom-left",
      "centre",
      "top-right",
      "middle-right",
      "bottom-right",
    ];
    const takers = [
      { name: "Danny Welbeck", number: 18, foot: "right", trait: "composed", skin: "#7b4934", hair: "#211712" },
      {
        name: "Georginio Rutter",
        number: 10,
        foot: "right",
        trait: "disguised",
        skin: "#70402e",
        hair: "#17110e",
      },
      { name: "Yankuba Minteh", number: 11, foot: "left", trait: "powerful", skin: "#5c3427", hair: "#16100d" },
      { name: "Diego Gómez", number: 25, foot: "right", trait: "driven", skin: "#b87855", hair: "#20150f" },
      { name: "Maxim De Cuyper", number: 29, foot: "left", trait: "placed", skin: "#d2a07f", hair: "#a97945" },
    ];
    const palacePreferences = [
      "middle-right",
      "bottom-left",
      "top-right",
      "centre",
      "middle-left",
    ];
    const palaceTakers = [
      { label: "Palace taker 1", style: "quick, straight run-up", foot: "right", paceMs: 920, skin: "#8e583f", hair: "#241712" },
      { label: "Palace taker 2", style: "measured, angled approach", foot: "left", paceMs: 1240, skin: "#c88b69", hair: "#322016" },
      { label: "Palace taker 3", style: "short stutter step", foot: "right", paceMs: 1360, skin: "#754633", hair: "#17110f" },
      { label: "Palace taker 4", style: "long, composed approach", foot: "left", paceMs: 1120, skin: "#a96f52", hair: "#251912" },
      { label: "Palace taker 5", style: "fast final stride", foot: "right", paceMs: 980, skin: "#d09a76", hair: "#2b1c15" },
    ];
    let lineup = [];
    let albionResults = [];
    let palaceResults = [];
    let albionKicks = 0;
    let palaceKicks = 0;
    let albionGoals = 0;
    let palaceGoals = 0;
    let phase = "shoot";
    let locked = false;
    let recentTargets = [];
    let palaceSaves = 0;
    let palaceShotsOnTarget = 0;
    let albionRedMisses = 0;
    let panenkaAttempts = 0;
    let panenkaGoals = 0;
    let bestSave = "No save recorded";
    let palacePlannedTarget = "centre";
    let palaceRunStartedAt = 0;
    let palaceRunTimer = 0;
    let palaceShotTimer = 0;
    let palaceReactionTimer = 0;
    let palaceReactionStartedAt = 0;
    let palaceReactionOpen = false;
    let placementTimer = 0;
    let replayAnimationTimer = 0;
    let replayContinuationTimer = 0;
    let replaySkipContinue = null;
    let turnCountdownTimer = 0;
    let palaceStrikeDelay = 1120;
    let activeFoot = "right";
    let activeTrait = "placed";
    let lastKick = null;
    let keeperStats = {
      dives: 0,
      correctGuesses: 0,
      catches: 0,
      parries: 0,
      fingertips: 0,
      legs: 0,
    };
    const ball = $("ball");
    const shadow = $("ballShadow");
    const keeper = $("keeper");
    const taker = $("penaltyTaker");
    const status = $("shootoutStatus");
    const flash = $("goalFlash");
    const goalFrame = $("goal");
    const stadiumScene = goalFrame.closest(".stadium-scene");
    const targets = [...document.querySelectorAll(".target")];
    const aimPointer = $("aimPointer");
    const aimGuide = $("aimGuide");
    const aimHint = $("aimHint");
    const accuracyMeter = document.querySelector(".accuracy-meter");
    const accuracyMarker = accuracyMeter.querySelector("i");
    const accuracyVerdict = $("accuracyVerdict");
    const turnReadyPanel = $("turnReadyPanel");
    const turnReadyText = $("turnReadyText");
    const continueShootoutButton = $("continueShootout");
    const readyCountdown = $("readyCountdown");
    const firstKickCoach = $("firstKickCoach");
    const reactionCue = $("reactionCue");
    let aimPoint = { x: 50, y: 48 };
    let aimingPointerId = null;
    const clamp = (value, minimum, maximum) =>
      Math.max(minimum, Math.min(maximum, value));
    const zonePoint = {
      "top-left": { x: 16, y: 18 },
      "middle-left": { x: 14, y: 49 },
      "bottom-left": { x: 17, y: 80 },
      centre: { x: 50, y: 51 },
      "top-right": { x: 84, y: 18 },
      "middle-right": { x: 86, y: 49 },
      "bottom-right": { x: 83, y: 80 },
    };
    const goalOpening = {
      left: 16,
      width: 68,
      top: 7,
      height: 35,
      line: 42,
      spot: 75,
    };
    const toStagePoint = (x, y) => ({
      x: goalOpening.left + (clamp(x, 0, 100) / 100) * goalOpening.width,
      y: goalOpening.top + (clamp(y, 0, 100) / 100) * goalOpening.height,
    });
    function clearReplaySkip() {
      window.clearTimeout(replayAnimationTimer);
      window.clearTimeout(replayContinuationTimer);
      replayAnimationTimer = 0;
      replayContinuationTimer = 0;
      replaySkipContinue = null;
      $("skipReplay").hidden = true;
    }
    function offerReplaySkip(continueShootout, delay) {
      let completed = false;
      const finishReplay = () => {
        if (completed) return;
        completed = true;
        clearReplaySkip();
        continueShootout();
      };
      replaySkipContinue = finishReplay;
      $("skipReplay").hidden = false;
      replayContinuationTimer = window.setTimeout(finishReplay, delay);
    }
    function hideTurnReady() {
      window.clearTimeout(turnCountdownTimer);
      turnCountdownTimer = 0;
      turnReadyPanel.hidden = true;
      readyCountdown.hidden = true;
      readyCountdown.textContent = "";
      continueShootoutButton.disabled = false;
      delete continueShootoutButton.dataset.action;
    }
    function showTurnReady(action) {
      window.clearTimeout(turnCountdownTimer);
      turnReadyPanel.hidden = false;
      continueShootoutButton.disabled = false;
      continueShootoutButton.dataset.action = action;
      if (action === "save") {
        turnReadyText.textContent =
          "Palace will not begin their run-up until you are ready.";
        continueShootoutButton.textContent =
          "Ready to save Palace’s penalty";
        announce(
          "Your goal, your moment",
          "Press Ready when you want the Palace run-up to begin.",
        );
      } else {
        turnReadyText.textContent =
          "Your next Albion taker is waiting at the penalty spot.";
        continueShootoutButton.textContent =
          "Take Albion’s next penalty";
        announce(
          "Albion are ready",
          "Continue when you are ready to take the next kick.",
        );
      }
    }
    function targetForPoint(x, y) {
      let position;
      if (x >= 36 && x <= 64) position = "centre";
      else {
        const side = x < 50 ? "left" : "right";
        const height = y < 34 ? "top" : y > 68 ? "bottom" : "middle";
        position = `${height}-${side}`;
      }
      return targets.find((target) => target.dataset.target === position);
    }
    function updateAimPointer(x, y, outside = false) {
      aimPoint = {
        x: clamp(x, -8, 108),
        y: clamp(y, 5, 96),
        outside,
      };
      const stagePoint = toStagePoint(aimPoint.x, aimPoint.y);
      aimPointer.style.left = `${stagePoint.x}%`;
      aimPointer.style.top = `${stagePoint.y}%`;
      aimPointer.classList.toggle("outside-goal", outside);
      const rect = goalFrame.getBoundingClientRect();
      const startX = rect.width * 0.5;
      const startY = rect.height * (goalOpening.spot / 100);
      const endX = (rect.width * stagePoint.x) / 100;
      const endY = (rect.height * stagePoint.y) / 100;
      const deltaX = endX - startX;
      const deltaY = endY - startY;
      aimGuide.style.width = `${Math.hypot(deltaX, deltaY)}px`;
      aimGuide.style.transform = `rotate(${Math.atan2(deltaY, deltaX)}rad)`;
    }
    function aimFromEvent(event) {
      const rect = goalFrame.getBoundingClientRect();
      const stageX = ((event.clientX - rect.left) / rect.width) * 100;
      const stageY = ((event.clientY - rect.top) / rect.height) * 100;
      const x = ((stageX - goalOpening.left) / goalOpening.width) * 100;
      const y = ((stageY - goalOpening.top) / goalOpening.height) * 100;
      const outside =
        stageX < goalOpening.left ||
        stageX > goalOpening.left + goalOpening.width ||
        stageY < goalOpening.top ||
        stageY > goalOpening.top + goalOpening.height;
      updateAimPointer(x, y, outside);
      if (phase === "save" && palaceReactionOpen) {
        const smoothX = clamp((x - 50) / 50, -1, 1);
        const smoothY = clamp((50 - y) / 50, -1, 1);
        keeper.classList.add("keeper-live-track");
        keeper.style.setProperty("--track-x", smoothX.toFixed(3));
        keeper.style.setProperty("--track-y", smoothY.toFixed(3));
      }
    }
    function chooseAimPoint() {
      if (locked) return;
      const button = targetForPoint(
        clamp(aimPoint.x, 4, 96),
        clamp(aimPoint.y, 7, 91),
      );
      if (!button) return;
      button.dataset.aimX = String(aimPoint.x);
      button.dataset.aimY = String(aimPoint.y);
      button.dataset.aimMiss = String(Boolean(aimPoint.outside));
      chooseTarget(button);
    }
    const announce = (title, detail) => {
      status.innerHTML = `<b>${esc(title)}</b><span>${esc(detail)}</span>`;
    };
    const saveTechnique = (target) => {
      if (target.includes("top"))
        return { key: "fingertips", label: "fingertip save" };
      if (target === "centre")
        return { key: "catches", label: "held safely" };
      if (target.includes("bottom"))
        return Math.random() < 0.22
          ? { key: "legs", label: "strong trailing-leg save" }
          : { key: "parries", label: "low two-handed parry" };
      return Math.random() < 0.18
        ? { key: "legs", label: "strong leg save" }
        : { key: "parries", label: "one-handed parry" };
    };
    const adjacentDives = {
      "top-left": ["middle-left"],
      "middle-left": ["top-left", "bottom-left", "centre"],
      "bottom-left": ["middle-left"],
      centre: ["middle-left", "middle-right"],
      "top-right": ["middle-right"],
      "middle-right": ["top-right", "bottom-right", "centre"],
      "bottom-right": ["middle-right"],
    };
    let liveAccuracy = 1;
    let accuracyFrozen = false;
    const accuracyStarted = Date.now();
    window.setInterval(() => {
      if (accuracyFrozen) return;
      const sweepPhase = ((Date.now() - accuracyStarted) % 1800) / 1800;
      const position = sweepPhase < 0.5 ? sweepPhase * 2 : (1 - sweepPhase) * 2;
      accuracyMarker.style.left = `${1 + position * 97}%`;
      liveAccuracy = 1 - Math.abs(position - 0.5) * 2;
    }, 32);
    const timingLabel = (accuracy) =>
      accuracy < 0.56
        ? ["RED: MISS", "red"]
        : accuracy < 0.76
          ? ["RISKY", "risky"]
          : accuracy < 0.92
            ? ["GOOD", "good"]
            : ["PERFECT", "perfect"];
    function freezeAccuracy(button, panenka = false) {
      accuracyFrozen = true;
      accuracyMeter.classList.add("frozen");
      targets.forEach((target) =>
        target.classList.toggle("selected-target", target === button),
      );
      const [label, className] = panenka
        ? ["PANENKA SELECTED", "panenka"]
        : timingLabel(liveAccuracy);
      accuracyVerdict.textContent = label;
      accuracyVerdict.className = `accuracy-verdict ${className}`;
    }
    function readShootoutRecord() {
      try {
        return {
          ...{ played: 0, wins: 0, saves: 0, bestSaveRate: 0 },
          ...JSON.parse(localStorage.getItem("albionShootoutRecord")),
        };
      } catch {
        return { played: 0, wins: 0, saves: 0, bestSaveRate: 0 };
      }
    }
    function renderShootoutRecord() {
      const record = readShootoutRecord();
      $("shootoutRecords").textContent =
        `Your record · ${record.played} played · ${record.wins} won · ${record.saves} Palace penalties saved · best ${record.bestSaveRate}%`;
    }
    function markerHtml(results) {
      const suddenDeath =
        albionKicks >= 5 && palaceKicks >= 5 && albionGoals === palaceGoals;
      const total = Math.max(
        5,
        results.length + (results.length > 5 || suddenDeath ? 1 : 0),
      );
      return Array.from(
        { length: total },
        (_, index) =>
          `<i class="${index < results.length ? (results[index].scored ? "goal-mark" : "save-mark") : ""}"></i>`,
      ).join("");
    }
    function renderScore() {
      $("albionGoalCount").textContent = String(albionGoals);
      $("palaceGoalCount").textContent = String(palaceGoals);
      $("albionPenaltyMarkers").innerHTML = markerHtml(albionResults);
      $("palacePenaltyMarkers").innerHTML = markerHtml(palaceResults);
      const round =
        Math.max(albionKicks, palaceKicks) +
        (phase === "shoot" && albionKicks === palaceKicks ? 1 : 0);
      $("shotCount").textContent =
        round <= 5 ? `${round}/5` : `SD ${round - 5}`;
      const albionRemaining = Math.max(0, 5 - albionKicks);
      const palaceRemaining = Math.max(0, 5 - palaceKicks);
      const suddenDeath = albionKicks >= 5 && palaceKicks >= 5;
      $("shootoutSituation").textContent = suddenDeath
        ? albionKicks === palaceKicks
          ? "Sudden death · next pair decides it"
          : "Sudden death · Palace must respond"
        : `${albionRemaining} Albion ${albionRemaining === 1 ? "kick" : "kicks"} left · ${palaceRemaining} Palace ${palaceRemaining === 1 ? "kick" : "kicks"} left`;
      $("liveKeeperStats").innerHTML =
        `<span>Saves <b>${palaceSaves}</b></span><span>Correct dives <b>${keeperStats.correctGuesses}</b></span><span>Catches <b>${keeperStats.catches}</b></span><span>Fingertips <b>${keeperStats.fingertips}</b></span>`;
      $("liveKeeperStats").classList.toggle("active", phase === "save");
    }
    function shootoutDecision() {
      const albionRemaining = Math.max(0, 5 - albionKicks);
      const palaceRemaining = Math.max(0, 5 - palaceKicks);
      if (albionKicks < 5 || palaceKicks < 5) {
        if (albionGoals > palaceGoals + palaceRemaining)
          return { finished: true, albionWon: true };
        if (palaceGoals > albionGoals + albionRemaining)
          return { finished: true, albionWon: false };
      }
      if (
        albionKicks >= 5 &&
        palaceKicks >= 5 &&
        albionKicks === palaceKicks &&
        albionGoals !== palaceGoals
      )
        return { finished: true, albionWon: albionGoals > palaceGoals };
      return { finished: false, albionWon: false };
    }
    function pressurePrompt(nextPhase = phase) {
      const albionRemaining = Math.max(0, 5 - albionKicks);
      const palaceRemaining = Math.max(0, 5 - palaceKicks);
      if (albionKicks >= 5 && palaceKicks >= 5)
        return nextPhase === "shoot"
          ? "Sudden death: Albion must strike first."
          : "Sudden death: Palace must answer.";
      if (
        nextPhase === "shoot" &&
        palaceGoals > albionGoals + Math.max(0, albionRemaining - 1)
      )
        return "MUST SCORE";
      if (
        nextPhase === "save" &&
        albionGoals > palaceGoals + Math.max(0, palaceRemaining - 1)
      )
        return "SAVE TO WIN";
      return "Best of five";
    }
    function shotStyleFor(accuracy, target, panenka = false) {
      if (panenka) return "panenka";
      if (accuracy < 0.56) return "mishit";
      if (target.includes("top")) return accuracy > 0.88 ? "rising" : "driven";
      if (target.includes("middle")) return accuracy > 0.82 ? "curled" : "driven";
      if (target.includes("bottom")) return accuracy > 0.82 ? "placed" : "driven";
      return accuracy > 0.9 ? "placed" : "driven";
    }
    function showKickDecision(title, detail, className) {
      const decision = $("kickDecision");
      decision.className = `kick-decision ${className}`;
      decision.innerHTML = `<b>${esc(title)}</b><span>${esc(detail)}</span>`;
      decision.hidden = false;
    }
    function renderLineup() {
      $("penaltyLineup").innerHTML = lineup
        .map((player, index) => {
          const result = albionResults[index];
          const current =
            phase === "shoot" && albionKicks % lineup.length === index;
          return `<span class="${current ? "current" : result ? (result.scored ? "converted" : "missed") : ""}"><b>${player.number}</b>${esc(player.name)}</span>`;
        })
        .join("");
    }
    function clearMotion() {
      window.clearTimeout(palaceRunTimer);
      window.clearTimeout(palaceShotTimer);
      window.clearTimeout(palaceReactionTimer);
      window.clearTimeout(placementTimer);
      palaceReactionOpen = false;
      palaceReactionStartedAt = 0;
      reactionCue.hidden = true;
      ball.className = "ball";
      shadow.className = "ball-shadow";
      flash.className = "goal-flash";
      taker.className = "penalty-taker";
      keeper.className = "keeper";
      keeper.style.left = "";
      goalFrame.classList.remove(
        "slow-motion",
        "net-goal",
        "net-top-left",
        "net-middle-left",
        "net-bottom-left",
        "net-centre",
        "net-top-right",
        "net-middle-right",
        "net-bottom-right",
        "woodwork",
        "saving-turn",
        "kick-in-flight",
        "save-impact",
        "goal-checking",
        "placing-ball",
        "boot-contact",
        "reaction-launch",
        "reaction-resolving",
      );
      stadiumScene.classList.remove(
        "camera-shoot",
        "camera-save",
        "palace-run-live",
        "crowd-hush",
        "crowd-goal",
        "crowd-save",
        "crowd-miss",
        "crowd-win",
        "crowd-loss",
        "pointer-shooting",
        "pointer-saving",
        "aim-ready",
        "aim-dragging",
        "reaction-window",
      );
      const decision = $("goalDecision");
      decision.hidden = true;
      decision.textContent = "";
      const kickDecision = $("kickDecision");
      kickDecision.hidden = true;
      kickDecision.textContent = "";
    }
    function readyKeeper() {
      const feint = ["left", "right", "centre"][Math.floor(Math.random() * 3)];
      const mindGame = phase === "save" && Math.random() < 0.28
        ? ` mindgame-point-${Math.random() < 0.5 ? "left" : "right"}`
        : "";
      keeper.className = `keeper ${phase === "save" ? "user-keeper " : ""}feint-${feint}${mindGame}`;
    }
    function startPalaceRun() {
      if (phase !== "save") return;
      locked = true;
      palaceReactionOpen = false;
      targets.forEach((button) => (button.disabled = true));
      stadiumScene.classList.remove("aim-ready", "reaction-window");
      goalFrame.classList.remove("placing-ball");
      taker.classList.remove("place-ball");
      ball.classList.remove("ball-to-spot");
      playSfx("whistle");
      palaceRunStartedAt = performance.now();
      stadiumScene.classList.add("palace-run-live", "crowd-hush");
      taker.classList.add("run-up", "palace-live-run");
      taker.style.setProperty("--runup-duration", `${palaceStrikeDelay}ms`);
      announce(
        "Palace are running up",
        "Watch the taker and wait for the ball to be struck.",
      );
      palaceShotTimer = window.setTimeout(
        openPalaceReactionWindow,
        palaceStrikeDelay,
      );
    }
    function openPalaceReactionWindow() {
      if (phase !== "save" || palaceReactionOpen) return;
      window.clearTimeout(palaceShotTimer);
      palaceReactionOpen = true;
      locked = false;
      palaceReactionStartedAt = performance.now();
      const destination = toStagePoint(
        zonePoint[palacePlannedTarget].x,
        zonePoint[palacePlannedTarget].y,
      );
      const startBottom = 100 - goalOpening.spot;
      const destinationBottom = 100 - destination.y;
      const revealProgress = 0.32;
      const reactionX = 50 + (destination.x - 50) * revealProgress;
      const reactionBottom =
        startBottom + (destinationBottom - startBottom) * revealProgress;
      ball.style.setProperty("--reaction-x", `${reactionX}%`);
      ball.style.setProperty("--reaction-y", `${reactionBottom}%`);
      shadow.style.setProperty("--reaction-x", `${reactionX}%`);
      shadow.style.setProperty(
        "--reaction-y",
        `${100 - goalOpening.line}%`,
      );
      ball.className = "ball";
      shadow.className = "ball-shadow";
      void ball.offsetWidth;
      ball.classList.add("reaction-flight");
      shadow.classList.add("reaction-shadow-flight");
      goalFrame.classList.add("reaction-launch", "boot-contact");
      stadiumScene.classList.add("aim-ready", "reaction-window");
      taker.classList.add("ball-struck");
      targets.forEach((button) => (button.disabled = false));
      reactionCue.hidden = false;
      aimHint.textContent = "Move towards the ball — 1.2 seconds";
      playSfx("kick");
      vibrate(18);
      announce("BALL STRUCK — REACT!", "Move the mouse towards the ball now — you have 1.2 seconds.");
      palaceReactionTimer = window.setTimeout(
        () => {
          const autoButton = targetForPoint(
            clamp(aimPoint.x, 4, 96),
            clamp(aimPoint.y, 7, 91),
          );
          if (autoButton) commitPalaceDive(autoButton);
          else takePalacePenalty(null, true, 1200);
        },
        1200,
      );
    }
    function startAlbionKick() {
      if (phase !== "shoot") return;
      goalFrame.classList.remove("placing-ball");
      taker.classList.remove("place-ball");
      ball.classList.remove("ball-to-spot");
      targets.forEach((button) => (button.disabled = false));
      $("panenkaButton").disabled = false;
      accuracyFrozen = false;
      locked = false;
      stadiumScene.classList.add("aim-ready");
      accuracyVerdict.textContent = "Time your strike";
      playSfx("whistle");
      announce(
        albionKicks >= 5 ? "Sudden death: pick your spot" : "Pick your spot",
        `${pressurePrompt("shoot")} · Green timing gives the best finish.`,
      );
    }
    function startSaveCountdown() {
      hideTurnReady();
      locked = true;
      keeper.classList.add("keeper-bar-check");
      goalFrame.classList.add("crossbar-wobble");
      announce("Verbruggen checks the goal", "He touches the bar, resets on the line and gets ready.");
      window.setTimeout(() => {
        keeper.classList.remove("keeper-bar-check");
        goalFrame.classList.remove("crossbar-wobble");
      }, 980);
      const sequence = ["3", "2", "1", "SAVE!"];
      let index = 0;
      readyCountdown.hidden = false;
      const advance = () => {
        readyCountdown.textContent = sequence[index];
        readyCountdown.classList.toggle(
          "go",
          sequence[index] === "SAVE!",
        );
        if (index < sequence.length - 1) {
          index += 1;
          turnCountdownTimer = window.setTimeout(advance, 750);
        } else {
          turnCountdownTimer = window.setTimeout(() => {
            readyCountdown.hidden = true;
            readyCountdown.classList.remove("go");
            startPalaceRun();
          }, 420);
        }
      };
      advance();
    }
    function setScene(waitForReady = false) {
      hideTurnReady();
      clearMotion();
      palaceRunStartedAt = 0;
      $("shootout").classList.add("game-active");
      const saving = phase === "save";
      const player = lineup[albionKicks % lineup.length];
      firstKickCoach.hidden =
        saving ||
        albionKicks > 0 ||
        localStorage.getItem("albionShootoutGuideSeen") === "yes";
      stadiumScene.classList.add(
        saving ? "pointer-saving" : "pointer-shooting",
      );
      aimHint.textContent = saving
        ? "Wait for the strike"
        : "Aim inside the goal and release";
      updateAimPointer(50, saving ? 52 : 46);
      targets.forEach((target) => {
        target.classList.remove("selected-target");
        delete target.dataset.aimX;
        delete target.dataset.aimY;
        delete target.dataset.aimMiss;
      });
      if (!saving) {
        locked = true;
        accuracyFrozen = true;
        accuracyMeter.className = "accuracy-meter";
        accuracyVerdict.textContent = "Placing the ball…";
        accuracyVerdict.className = "accuracy-verdict";
      }
      $("turnBadge").textContent = saving
        ? "PALACE SHOOTS · YOU CONTROL VERBRUGGEN"
        : "ALBION PENALTY · YOU ARE SHOOTING";
      $("turnBadge").className =
        `turn-badge ${saving ? "palace-turn" : "albion-turn"}`;
      $("shotControls").classList.toggle("controls-disabled", saving);
      $("panenkaButton").disabled = saving;
      goalFrame.classList.toggle("saving-turn", saving);
      stadiumScene.classList.add(saving ? "camera-save" : "camera-shoot");
      taker.classList.toggle("palace-taker", saving);
      keeper.classList.toggle("user-keeper", saving);
      $("keeperNameTag").hidden = !saving;
      stadiumScene.classList.toggle(
        "pressure-high",
        Math.max(albionKicks, palaceKicks) >= 4,
      );
      stadiumScene.classList.toggle(
        "decisive-kick",
        Math.max(albionKicks, palaceKicks) >= 4 &&
          Math.abs(albionGoals - palaceGoals) <= 1,
      );
      if (saving) {
        locked = true;
        const palaceTaker = palaceTakers[palaceKicks % palaceTakers.length];
        activeFoot = palaceTaker.foot;
        activeTrait = palaceTaker.style;
        palaceStrikeDelay = palaceTaker.paceMs;
        const preferred =
          palacePreferences[palaceKicks % palacePreferences.length];
        palacePlannedTarget =
          Math.random() < 0.52
            ? preferred
            : positions[Math.floor(Math.random() * positions.length)];
        const trueSide = palacePlannedTarget.includes("left")
          ? "left"
          : palacePlannedTarget.includes("right")
            ? "right"
            : "centre";
        const cue =
          Math.random() < 0.63
            ? trueSide
            : ["left", "right", "centre"][Math.floor(Math.random() * 3)];
        taker.classList.add(`cue-${cue}`);
        taker.classList.add(`foot-${palaceTaker.foot}`);
        goalFrame.classList.add("placing-ball");
        taker.classList.add("place-ball");
        ball.classList.add("ball-to-spot");
        taker.classList.add(
          ["runup-straight", "runup-angled", "runup-stutter"][
            palaceKicks % 3
          ],
        );
        $("penaltyTakerName").textContent =
          `${palaceTaker.label} · ${palaceTaker.style} · Bart Verbruggen in goal`;
        $("penaltyShirt").textContent = palaceKicks + 1;
        $("penaltyShirt").dataset.player = "PALACE";
        taker.style.setProperty("--player-skin", palaceTaker.skin);
        taker.style.setProperty("--player-hair", palaceTaker.hair);
        announce(
          "Watch the Palace taker",
          `${pressurePrompt("save")} · The run-up speed changes. React only after contact.`,
        );
      } else {
        activeFoot = player.foot;
        activeTrait = player.trait;
        $("penaltyTakerName").textContent =
          `${player.name} · No. ${player.number} · ${player.foot}-footed`;
        $("penaltyShirt").textContent = player.number;
        $("penaltyShirt").dataset.player =
          player.name.split(" ").slice(-1)[0].toUpperCase();
        taker.style.setProperty("--player-skin", player.skin);
        taker.style.setProperty("--player-hair", player.hair);
        taker.classList.add(
          ["runup-angled", "runup-straight", "runup-stutter"][
            albionKicks % 3
          ],
        );
        taker.classList.add(`foot-${player.foot}`);
        goalFrame.classList.add("placing-ball");
        taker.classList.add("place-ball");
        ball.classList.add("ball-to-spot");
        announce(
          `${player.name} places the ball`,
          `${pressurePrompt("shoot")} · The bar starts when the referee is ready.`,
        );
      }
      targets.forEach((button, index) => {
        button.disabled = true;
        button.setAttribute(
          "aria-label",
          saving
            ? `Dive towards target ${index + 1}`
            : `Shoot towards target ${index + 1}`,
        );
      });
      renderLineup();
      renderScore();
      readyKeeper();
      if (saving) {
        if (waitForReady) showTurnReady("save");
        else palaceRunTimer = window.setTimeout(startPalaceRun, 2350);
      } else {
        $("panenkaButton").disabled = true;
        if (waitForReady) showTurnReady("shoot");
        else placementTimer = window.setTimeout(startAlbionKick, 2350);
      }
    }
    function renderSummary() {
      const rows = Array.from(
        { length: Math.max(albionResults.length, palaceResults.length) },
        (_, index) => {
          const albion = albionResults[index];
          const palace = palaceResults[index];
          const player = lineup[index % lineup.length];
          return `<li><span>${esc(player.name)}: <b class="${albion?.scored ? "summary-goal" : "summary-miss"}">${esc(albion?.label || "—")}</b></span><span>Palace: <b class="${palace?.scored ? "summary-goal" : "summary-miss"}">${esc(palace?.label || "—")}</b></span></li>`;
        },
      ).join("");
      const shotMap = (title, results) =>
        `<section class="shot-map-card"><h4>${esc(title)}</h4><div class="shot-map">${positions
          .map((position, index) => {
            const shots = results.filter(
              (result) => result.target === position,
            );
            return `<div class="shot-map-zone ${position}"><b>${index + 1}</b><span>${shots.map((result) => `<i class="${result.scored ? "map-goal" : "map-out"}" title="${esc(result.label)}"></i>`).join("")}</span></div>`;
          })
          .join("")}</div></section>`;
      $("shootoutSummary").innerHTML =
        `<h3>Brighton v Palace shoot-out card</h3><ol>${rows}</ol><div class="shot-map-legend"><span><i class="map-goal"></i> Goal</span><span><i class="map-out"></i> Saved or missed</span></div><div class="shot-maps">${shotMap("Albion shots", albionResults)}${shotMap("Palace shots", palaceResults)}</div>`;
    }
    function reset() {
      clearReplaySkip();
      hideTurnReady();
      albionKicks = 0;
      palaceKicks = 0;
      albionGoals = 0;
      palaceGoals = 0;
      phase = "shoot";
      locked = false;
      palaceSaves = 0;
      palaceShotsOnTarget = 0;
      albionRedMisses = 0;
      panenkaAttempts = 0;
      panenkaGoals = 0;
      bestSave = "No save recorded";
      lastKick = null;
      keeperStats = {
        dives: 0,
        correctGuesses: 0,
        catches: 0,
        parries: 0,
        fingertips: 0,
        legs: 0,
      };
      recentTargets = [];
      albionResults = [];
      palaceResults = [];
      lineup = shuffle(takers);
      $("shootoutSummary").hidden = true;
      $("shootoutSummary").innerHTML = "";
      $("shareShootout").hidden = true;
      $("replayKick").hidden = true;
      $("resetShootout").textContent = "Restart Brighton v Palace";
      status.classList.remove("win-status", "loss-status");
      goalFrame.classList.remove("albion-win", "palace-win");
      renderShootoutRecord();
      setScene();
    }
    function celebrationBurst() {
      for (let index = 0; index < 28; index += 1) {
        const piece = document.createElement("i");
        piece.className = "shootout-confetti";
        piece.style.left = `${5 + Math.random() * 90}%`;
        piece.style.setProperty("--delay", `${Math.random() * 0.35}s`);
        piece.style.setProperty("--drift", `${-70 + Math.random() * 140}px`);
        goalFrame.appendChild(piece);
        window.setTimeout(() => piece.remove(), 2300);
      }
    }
    function finish(albionWon) {
      targets.forEach((button) => (button.disabled = true));
      $("panenkaButton").disabled = true;
      $("shootout").classList.remove("game-active");
      announce(
        albionWon ? "SEAGULLS WIN!" : "Palace win the shoot-out",
        `Brighton ${albionGoals}–${palaceGoals} Palace.`,
      );
      status.classList.add(albionWon ? "win-status" : "loss-status");
      goalFrame.classList.add(albionWon ? "albion-win" : "palace-win");
      stadiumScene.classList.add(albionWon ? "crowd-win" : "crowd-loss");
      showKickDecision(
        albionWon ? "SEAGULLS WIN" : "PALACE WIN",
        `Brighton ${albionGoals}–${palaceGoals} Palace`,
        albionWon ? "decision-goal" : "decision-miss",
      );
      $("resetShootout").textContent = "Play the shoot-out again";
      $("shootoutSummary").hidden = false;
      renderSummary();
      const conversion = albionKicks
        ? Math.round((albionGoals / albionKicks) * 100)
        : 0;
      const saveRate = palaceShotsOnTarget
        ? Math.round((palaceSaves / palaceShotsOnTarget) * 100)
        : 0;
      const record = readShootoutRecord();
      record.played += 1;
      if (albionWon) record.wins += 1;
      record.saves += palaceSaves;
      record.bestSaveRate = Math.max(record.bestSaveRate, saveRate);
      localStorage.setItem("albionShootoutRecord", JSON.stringify(record));
      localStorage.setItem(
        "albionShootoutSavedAt",
        new Date().toISOString(),
      );
      renderShootoutRecord();
      $("shootoutSummary").insertAdjacentHTML(
        "beforeend",
        `<div class="shootout-stats"><article><b>${conversion}%</b><span>Albion conversion</span></article><article><b>${saveRate}%</b><span>Verbruggen save rate</span></article><article><b>${palaceSaves}</b><span>Palace penalties saved</span></article><article><b>${albionRedMisses}</b><span>Red-zone misses</span></article><article><b>${panenkaGoals}/${panenkaAttempts}</b><span>Panenkas scored</span></article><article><b>${palaceKicks > 5 ? palaceKicks - 5 : 0}</b><span>Sudden-death rounds</span></article></div><p class="best-save"><b>Best Verbruggen moment:</b> ${esc(bestSave)}</p>`,
      );
      const guessRate = keeperStats.dives
        ? Math.round((keeperStats.correctGuesses / keeperStats.dives) * 100)
        : 0;
      const verdict =
        saveRate >= 60
          ? "Outstanding reactions and decisive hands."
          : palaceSaves >= 2
            ? "Strong goalkeeping under derby pressure."
            : guessRate >= 60
              ? "Read the Palace takers well, even when they found the corners."
              : "Kept moving and stayed committed throughout the shoot-out.";
      $("shootoutSummary").insertAdjacentHTML(
        "beforeend",
        `<section class="keeper-report"><div><p class="eyebrow">Verbruggen report</p><h3>${verdict}</h3></div><div class="keeper-report-grid"><article><b>${keeperStats.correctGuesses}/${keeperStats.dives}</b><span>Correct dives</span></article><article><b>${keeperStats.catches}</b><span>Catches</span></article><article><b>${keeperStats.parries}</b><span>Parries</span></article><article><b>${keeperStats.fingertips}</b><span>Fingertip saves</span></article><article><b>${keeperStats.legs}</b><span>Leg saves</span></article></div></section>`,
      );
      $("shareShootout").hidden = false;
      $("replayKick").hidden = !lastKick;
      $("shareShootout").dataset.shareText =
        `Seagulls ${albionGoals}–${palaceGoals} Eagles. I saved ${palaceSaves} Palace ${palaceSaves === 1 ? "penalty" : "penalties"} as Bart Verbruggen in the Albion Fan Hub shoot-out.`;
      if (albionWon) {
        flash.className = "goal-flash win";
        celebrationBurst();
        playChant("seagulls", { title: "Seagulls", win: true });
      } else playSfx("miss");
      window.dispatchEvent(new Event("albion:progress"));
    }
    function animateShot(
      {
        target,
        dive,
        missed,
        woodwork,
        saved,
        scored,
        slow,
        panenka = false,
        technique = null,
        shotStyle = "driven",
        foot = activeFoot,
        aimX = null,
        aimY = null,
        kickSoundPlayed = false,
      },
      replay = false,
    ) {
      const resolvedTechnique = technique || (saved ? saveTechnique(target) : null);
      if (!replay)
        lastKick = {
          target,
          dive,
          missed,
          woodwork,
          saved,
          scored,
          slow,
          panenka,
          technique: resolvedTechnique,
          shotStyle,
          foot,
          aimX,
          aimY,
        };
      if (slow) goalFrame.classList.add("slow-motion");
      goalFrame.classList.add("kick-in-flight", "boot-contact");
      window.setTimeout(
        () => goalFrame.classList.remove("boot-contact"),
        slow ? 520 : 310,
      );
      taker.classList.add("run-up");
      taker.classList.add(`foot-${foot}`, `strike-${shotStyle}`);
      const postSide = target.includes("left")
        ? "left"
        : target.includes("right")
          ? "right"
          : Math.random() > 0.5
            ? "left"
            : "right";
      const swerve =
        target.includes("left")
          ? "flight-swerve-left"
          : target.includes("right")
            ? "flight-swerve-right"
            : "flight-straight";
      const destination =
        aimX === null || aimY === null ? zonePoint[target] : { x: aimX, y: aimY };
      const stageDestination = toStagePoint(destination.x, destination.y);
      ball.style.setProperty("--shot-x", `${stageDestination.x}%`);
      ball.style.setProperty(
        "--shot-y",
        `${100 - stageDestination.y}%`,
      );
      shadow.style.setProperty("--shot-x", `${stageDestination.x}%`);
      shadow.style.setProperty(
        "--shot-y",
        `${100 - goalOpening.line}%`,
      );
      const flightClass = panenka
        ? scored
          ? "panenka-goal"
          : "panenka-saved"
        : missed
          ? postSide === "left"
            ? "shoot-wide-left"
            : "shoot-wide-right"
          : woodwork
            ? `hit-post-${postSide}`
            : "shoot-custom";
      ball.className = `ball shot-${shotStyle} ${flightClass} ${swerve}`;
      shadow.className = `ball-shadow shadow-${missed ? "wide" : woodwork ? "post" : "custom"}`;
      keeper.className = `keeper ${phase === "save" ? "user-keeper " : ""}dive-${dive}`;
      const diveLevel = dive.includes("top")
        ? "top"
        : dive.includes("bottom")
          ? "bottom"
          : dive === "centre"
            ? "centre"
            : "middle";
      const diveRelation =
        dive === target
          ? "exact"
          : adjacentDives[target]?.includes(dive)
            ? "adjacent"
            : "wrong";
      keeper.classList.add(
        `dive-level-${diveLevel}`,
        `dive-${diveRelation}`,
      );
      if (!kickSoundPlayed || replay)
        window.setTimeout(
          () => {
            playSfx("kick");
            vibrate(18);
          },
          slow ? 620 : 380,
        );
      window.setTimeout(
        () => {
          flash.className = `goal-flash ${scored ? "scored" : "saved"}`;
          goalFrame.classList.remove("kick-in-flight");
          if (scored) {
            goalFrame.classList.add("net-goal", `net-${target}`);
            taker.classList.add("taker-celebrate");
            stadiumScene.classList.add("crowd-goal");
            showKickDecision(
              "GOAL",
              shotStyle === "panenka"
                ? "Panenka"
                : `${shotStyle[0].toUpperCase()}${shotStyle.slice(1)} finish`,
              "decision-goal",
            );
          }
          if (woodwork) {
            goalFrame.classList.add("woodwork");
            stadiumScene.classList.add("crowd-miss");
            showKickDecision("NO GOAL", "Off the woodwork", "decision-woodwork");
          }
          if (saved) {
            keeper.classList.add(
              `save-${resolvedTechnique.key}`,
              "keeper-celebrate-save",
            );
            taker.classList.add("taker-disappointed");
            goalFrame.classList.add("save-impact");
            keeper.classList.add("ball-contact");
            stadiumScene.classList.add("crowd-save");
            showKickDecision(
              "SAVED",
              phase === "save" ? "Verbruggen keeps it out" : "Palace keeper",
              "decision-save",
            );
            if (phase === "save")
              bestSave =
                resolvedTechnique.label[0].toUpperCase() +
                resolvedTechnique.label.slice(1);
            const deflection =
              target === "centre" || panenka
                ? "held"
                : target.includes("left")
                  ? "left"
                  : target.includes("right")
                    ? "right"
                    : "up";
            ball.classList.add(`deflect-${deflection}`);
            if (
              resolvedTechnique.key === "fingertips" &&
              phase === "save" &&
              !replay &&
              Math.random() < 0.42
            ) {
              const decision = $("goalDecision");
              goalFrame.classList.add("goal-checking");
              decision.hidden = false;
              decision.innerHTML = "<b>GOAL-LINE CHECK</b><span>NO GOAL</span>";
              window.setTimeout(() => {
                decision.hidden = true;
                goalFrame.classList.remove("goal-checking");
              }, 1050);
            }
          }
          if (missed || woodwork) taker.classList.add("taker-disappointed");
          if (missed) {
            stadiumScene.classList.add("crowd-miss");
            showKickDecision("MISSED", "The ball goes wide", "decision-miss");
          }
          playSfx(
            scored ? "goal" : woodwork ? "post" : missed ? "miss" : "save",
          );
          if (scored && phase === "shoot" && !replay) {
            const goalChants = [
              ["albion-albion-albion", "Albion, Albion, Albion"],
              ["come-on-brighton", "Come On Brighton"],
              ["we-are-brighton", "We Are Brighton"],
            ];
            const chant =
              goalChants[Math.floor(Math.random() * goalChants.length)];
            window.setTimeout(
              () =>
                playChant(chant[0], {
                  title: chant[1],
                  clipMs: 5200,
                  game: true,
                }),
              120,
            );
          } else if (saved && phase === "save")
            window.setTimeout(() => playSfx("crowd"), 100);
          vibrate(
            saved ? [35, 30, 55] : woodwork ? [65, 35, 65] : scored ? 35 : 50,
          );
          window.setTimeout(
            () => keeper.classList.add("keeper-landed"),
            slow ? 980 : 720,
          );
        },
        slow ? 1320 : 900,
      );
    }
    function takeAlbionPenalty(button) {
      firstKickCoach.hidden = true;
      localStorage.setItem("albionShootoutGuideSeen", "yes");
      locked = true;
      stadiumScene.classList.remove("aim-ready", "aim-dragging");
      freezeAccuracy(button);
      targets.forEach((targetButton) => {
        targetButton.disabled = true;
      });
      const player = lineup[albionKicks % lineup.length];
      const target = button.dataset.target;
      const aimX = Number(button.dataset.aimX || zonePoint[target].x);
      const aimY = Number(button.dataset.aimY || zonePoint[target].y);
      const pointerMiss = button.dataset.aimMiss === "true";
      const accuracy = liveAccuracy;
      const predictable =
        recentTargets.length >= 2 &&
        recentTargets.slice(-2).every((item) => item === target);
      const readsShot = Math.random() < (predictable ? 0.75 : 0.36);
      const dive = readsShot
        ? target
        : positions[Math.floor(Math.random() * positions.length)];
      const redZone = accuracy < 0.46;
      const greenZone = accuracy >= 0.76;
      const missed = redZone || pointerMiss;
      const greenRoll = greenZone && !missed ? Math.random() : null;
      const woodwork = !missed && !greenZone && accuracy < 0.58 && Math.random() < 0.18;
      const sameSide = dive.split("-").pop() === target.split("-").pop();
      const saveChance =
        dive === target ? 0.42 : sameSide && target !== "centre" ? 0.06 : 0;
      const saved = !missed && !woodwork && (greenZone
        ? greenRoll >= 0.90
        : Math.random() < saveChance);
      const scored = !missed && !woodwork && !saved;
      const shotStyle = shotStyleFor(accuracy, target);
      const label = scored
        ? `Goal: ${shotStyle}`
        : woodwork
          ? "Woodwork"
          : missed
            ? redZone
              ? "Missed: red zone"
              : "Missed: outside goal"
            : "Saved";
      if (redZone) albionRedMisses += 1;
      recentTargets.push(target);
      albionResults.push({ scored, label, target });
      albionKicks += 1;
      if (scored) albionGoals += 1;
      const slow = albionKicks >= 5 || woodwork;
      announce(
        `${player.name} steps up…`,
        slow ? "The pressure is on." : "Come on Albion!",
      );
      animateShot({
        target,
        dive,
        missed,
        woodwork,
        saved,
        scored,
        slow,
        shotStyle,
        foot: player.foot,
        aimX,
        aimY,
      });
      window.setTimeout(
        () => {
          const goalLines = [
            `${player.name} buries it!`,
            `${player.name} sends the keeper the wrong way.`,
            `A composed finish from ${player.name}.`,
            `The net ripples for ${player.name}!`,
          ];
          announce(
            scored
              ? "GOAL!"
              : woodwork
                ? "OFF THE POST!"
                : missed
                  ? redZone
                    ? "RED ZONE: MISSED!"
                    : "WIDE!"
                  : "SAVED!",
            scored
              ? goalLines[Math.floor(Math.random() * goalLines.length)]
              : woodwork
                ? `${player.name} hits the frame of the goal.`
                : missed
                  ? redZone
                    ? "The accuracy marker was outside the safe area."
                    : "The pointer was dragged beyond the frame of the goal."
                  : `The Palace keeper denies ${player.name}.`,
          );
          renderLineup();
          renderScore();
          const decision = shootoutDecision();
          if (decision.finished) {
            window.setTimeout(() => finish(decision.albionWon), 850);
            return;
          }
          window.setTimeout(() => {
            phase = "save";
            locked = true;
            setScene(true);
          }, 850);
        },
        slow ? 1550 : 1120,
      );
    }
    function takePanenka() {
      if (locked || phase !== "shoot") return;
      firstKickCoach.hidden = true;
      localStorage.setItem("albionShootoutGuideSeen", "yes");
      locked = true;
      stadiumScene.classList.remove("aim-ready", "aim-dragging");
      freezeAccuracy(
        targets.find((target) => target.dataset.target === "centre"),
        true,
      );
      targets.forEach((targetButton) => {
        targetButton.disabled = true;
      });
      $("panenkaButton").disabled = true;
      const player = lineup[albionKicks % lineup.length];
      const scored = Math.random() < 1 / 3;
      const saved = !scored;
      const target = "centre";
      const dive = scored
        ? Math.random() < 0.5
          ? "bottom-left"
          : "bottom-right"
        : "centre";
      panenkaAttempts += 1;
      if (scored) {
        panenkaGoals += 1;
        albionGoals += 1;
      }
      albionResults.push({
        scored,
        label: scored ? "Panenka goal" : "Panenka saved",
        target,
      });
      albionKicks += 1;
      const slow = true;
      announce(`${player.name} tries a Panenka…`, "A brave, delicate gamble.");
      animateShot({
        target,
        dive,
        missed: false,
        woodwork: false,
        saved,
        scored,
        slow,
        panenka: true,
        shotStyle: "panenka",
        foot: player.foot,
      });
      window.setTimeout(() => {
        announce(
          scored ? "PANENKA GOAL!" : "PANENKA SAVED!",
          scored
            ? `${player.name} delicately chips the keeper.`
            : "The Palace goalkeeper stays central and catches it.",
        );
        renderLineup();
        renderScore();
        const decision = shootoutDecision();
        if (decision.finished) {
          window.setTimeout(() => finish(decision.albionWon), 900);
          return;
        }
        window.setTimeout(() => {
          phase = "save";
          locked = true;
          setScene(true);
        }, 900);
      }, 1650);
    }
    function takePalacePenalty(button, automatic = false, committedAt = null) {
      window.clearTimeout(palaceRunTimer);
      window.clearTimeout(palaceShotTimer);
      window.clearTimeout(palaceReactionTimer);
      palaceReactionOpen = false;
      locked = true;
      reactionCue.hidden = true;
      stadiumScene.classList.remove(
        "aim-ready",
        "aim-dragging",
        "reaction-window",
      );
      goalFrame.classList.remove("reaction-launch", "boot-contact");
      goalFrame.classList.add("reaction-resolving");
      targets.forEach((targetButton) => {
        targetButton.disabled = true;
        targetButton.classList.toggle(
          "selected-target",
          Boolean(button) && targetButton === button,
        );
      });
      const dive = button?.dataset.target || "centre";
      const target = palacePlannedTarget;
      const reactionMs =
        committedAt === null
          ? palaceReactionStartedAt
            ? Math.max(0, performance.now() - palaceReactionStartedAt)
            : 1200
          : committedAt;
      const reaction = !button
        ? "none"
        : reactionMs <= 550
          ? "perfect"
          : "good";
      if (button) keeperStats.dives += 1;
      if (button && dive === target) keeperStats.correctGuesses += 1;
      const missed = Math.random() < 0.12;
      const woodwork = !missed && Math.random() < 0.06;
      const adjacent = adjacentDives[target]?.includes(dive);
      const exactChance = { perfect: 0.98, good: 0.92, none: 0 }[
        reaction
      ];
      const adjacentChance = { perfect: 0.68, good: 0.50, none: 0 }[
        reaction
      ];
      const guaranteedCorrectSave = palaceSaves === 0 && palaceKicks >= 3 && dive === target && reaction !== 'none';
      const saved =
        !missed &&
        !woodwork &&
        (guaranteedCorrectSave ||
          (dive === target
            ? Math.random() < exactChance
            : adjacent && Math.random() < adjacentChance));
      const scored = !missed && !woodwork && !saved;
      if (scored || saved) palaceShotsOnTarget += 1;
      if (saved) palaceSaves += 1;
      const technique = saveTechnique(target);
      const palaceTaker = palaceTakers[palaceKicks % palaceTakers.length];
      const shotStyle = target.includes("top")
        ? "rising"
        : target.includes("bottom")
          ? "placed"
          : palaceStrikeDelay < 1000
            ? "driven"
            : "curled";
      if (saved) keeperStats[technique.key] += 1;
      const label = scored
        ? "Goal"
        : woodwork
          ? "Woodwork"
          : missed
            ? "Wide"
            : `Verbruggen: ${technique.label}`;
      palaceResults.push({ scored, label, target });
      palaceKicks += 1;
      if (scored) palaceGoals += 1;
      const slow =
        palaceKicks >= 5 ||
        woodwork ||
        (saved && technique.key === "fingertips");
      const reactionText = {
        perfect: `Sharp reaction · ${Math.round(reactionMs)} ms`,
        good: `Good reaction · ${Math.round(reactionMs)} ms`,
        none: "No dive selected",
      }[reaction];
      announce("Palace strike…", `${reactionText}. Hold your nerve.`);
      animateShot({
        target,
        dive,
        missed,
        woodwork,
        saved,
        scored,
        slow,
        technique,
        shotStyle,
        foot: palaceTaker.foot,
        kickSoundPlayed: true,
      });
      window.setTimeout(
        () => {
          announce(
            saved
              ? "VERBRUGGEN SAVES!"
              : scored
                ? "Palace score"
                : woodwork
                  ? "OFF THE POST!"
                  : "PALACE MISS!",
            saved
              ? `${technique.label[0].toUpperCase()}${technique.label.slice(1)} · ${reactionText.toLowerCase()}.${technique.key === "fingertips" ? " Slow-motion replay follows." : ""}`
              : scored
                ? "The Eagles level the pressure."
                : "The ball stays out.",
          );
          renderScore();
          const decision = shootoutDecision();
          const continueShootout = () => {
            if (decision.finished) finish(decision.albionWon);
            else {
              phase = "shoot";
              locked = true;
              if (palaceKicks >= 5)
                announce("Sudden death", "Every kick matters now.");
              setScene(true);
            }
          };
          const reducedMotion = window.matchMedia?.(
            "(prefers-reduced-motion: reduce)",
          ).matches;
          if (
            saved &&
            technique.key === "fingertips" &&
            !reducedMotion
          ) {
            replayAnimationTimer = window.setTimeout(() => {
              clearMotion();
              taker.classList.add("palace-taker");
              animateShot(
                {
                  target,
                  dive,
                  missed,
                  woodwork,
                  saved,
                  scored,
                  slow: true,
                  technique,
                  shotStyle,
                  foot: palaceTaker.foot,
                },
                true,
              );
            }, 320);
            offerReplaySkip(continueShootout, 2200);
          } else window.setTimeout(continueShootout, 850);
        },
        slow ? 1550 : 1120,
      );
    }
    function commitPalaceDive(button) {
      if (
        locked ||
        phase !== "save" ||
        !palaceReactionOpen
      )
        return;
      const reactionMs = palaceReactionStartedAt
        ? Math.max(0, performance.now() - palaceReactionStartedAt)
        : 0;
      locked = true;
      window.clearTimeout(palaceReactionTimer);
      targets.forEach((targetButton) => {
        targetButton.disabled = true;
        targetButton.classList.toggle(
          "selected-target",
          targetButton === button,
        );
      });
      keeper.className = `keeper user-keeper keeper-committed commit-${button.dataset.target}`;
      keeper.style.removeProperty("--track-x");
      keeper.style.removeProperty("--track-y");
      announce(
        "Verbruggen reacts",
        `${Math.round(reactionMs)} ms · reaching for the ball.`,
      );
      takePalacePenalty(button, false, reactionMs);
    }
    function chooseTarget(button) {
      if (locked) return;
      if (phase === "shoot") takeAlbionPenalty(button);
      else commitPalaceDive(button);
    }
    goalFrame.addEventListener("pointerdown", (event) => {
      if (locked || !stadiumScene.classList.contains("aim-ready")) return;
      if (event.button !== undefined && event.button !== 0) return;
      event.preventDefault();
      aimingPointerId = event.pointerId;
      goalFrame.setPointerCapture?.(event.pointerId);
      stadiumScene.classList.add("aim-dragging");
      aimFromEvent(event);
    });
    goalFrame.addEventListener("pointermove", (event) => {
      if (locked || !stadiumScene.classList.contains("aim-ready")) return;
      if (
        aimingPointerId === event.pointerId ||
        (aimingPointerId === null && event.pointerType === "mouse")
      )
        aimFromEvent(event);
    });
    window.addEventListener("pointermove", (event) => {
      if (event.pointerType !== "mouse" || phase !== "save" || !palaceReactionOpen) return;
      aimFromEvent(event);
    }, { passive: true });
    goalFrame.addEventListener("pointerup", (event) => {
      if (aimingPointerId !== event.pointerId || locked) return;
      event.preventDefault();
      aimFromEvent(event);
      goalFrame.releasePointerCapture?.(event.pointerId);
      aimingPointerId = null;
      stadiumScene.classList.remove("aim-dragging");
      chooseAimPoint();
    });
    goalFrame.addEventListener("pointercancel", () => {
      aimingPointerId = null;
      stadiumScene.classList.remove("aim-dragging");
    });
    targets.forEach((button) => {
      button.addEventListener("pointerdown", (event) => {
        if (event.button !== undefined && event.button !== 0) return;
        event.preventDefault();
        chooseTarget(button);
      });
      button.addEventListener("click", (event) => {
        if (event.detail === 0) chooseTarget(button);
      });
    });
    $("panenkaButton").addEventListener("pointerdown", (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      event.preventDefault();
      takePanenka();
    });
    $("panenkaButton").addEventListener("click", (event) => {
      if (event.detail === 0) takePanenka();
    });
    continueShootoutButton.addEventListener("click", () => {
      const action = continueShootoutButton.dataset.action;
      if (action === "save") {
        startSaveCountdown();
      } else if (action === "shoot") {
        hideTurnReady();
        locked = true;
        placementTimer = window.setTimeout(startAlbionKick, 2200);
      }
    });
    document.addEventListener("keydown", (event) => {
      if (
        event.repeat ||
        /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)
      )
        return;
      const key = Number(event.key);
      if (key >= 1 && key <= 7) {
        event.preventDefault();
        chooseTarget(targets[key - 1]);
      }
      const movement = {
        ArrowLeft: [-7, 0],
        ArrowRight: [7, 0],
        ArrowUp: [0, -7],
        ArrowDown: [0, 7],
      }[event.key];
      if (movement && !locked) {
        event.preventDefault();
        updateAimPointer(
          aimPoint.x + movement[0],
          aimPoint.y + movement[1],
        );
      }
      if ((event.key === "Enter" || event.key === " ") && !locked) {
        event.preventDefault();
        chooseAimPoint();
      }
      if (event.key.toLowerCase() === "p") {
        event.preventDefault();
        takePanenka();
      }
    });
    const shootoutCard = $("shootout");
    const updateFullscreenButton = () => {
      const active =
        document.fullscreenElement === shootoutCard ||
        document.body.classList.contains("shootout-focus");
      $("fullscreenShootout").textContent = active
        ? "Exit full screen"
        : "Full-screen game";
    };
    $("fullscreenShootout").addEventListener("click", async () => {
      if (document.fullscreenElement === shootoutCard) {
        await document.exitFullscreen();
      } else if (document.body.classList.contains("shootout-focus")) {
        document.body.classList.remove("shootout-focus");
      } else if (shootoutCard.requestFullscreen) {
        try {
          await shootoutCard.requestFullscreen();
        } catch {
          document.body.classList.add("shootout-focus");
        }
      } else document.body.classList.add("shootout-focus");
      updateFullscreenButton();
    });
    document.addEventListener("fullscreenchange", updateFullscreenButton);
    document.addEventListener("keydown", (event) => {
      if (
        event.key === "Escape" &&
        document.body.classList.contains("shootout-focus")
      ) {
        document.body.classList.remove("shootout-focus");
        updateFullscreenButton();
      }
    });
    $("replayKick").addEventListener("click", () => {
      if (!lastKick || locked) return;
      clearMotion();
      if (phase === "save") taker.classList.add("palace-taker");
      locked = true;
      animateShot(lastKick, true);
      window.setTimeout(
        () => {
          locked = false;
          $("replayKick").hidden = false;
        },
        lastKick.slow ? 1700 : 1250,
      );
    });
    $("skipReplay").addEventListener("click", () => {
      replaySkipContinue?.();
    });
    $("shareShootout").dataset.defaultLabel = "Share result";
    $("shareShootout").addEventListener("click", () =>
      shareText(
        "Albion Fan Hub shoot-out",
        $("shareShootout").dataset.shareText,
        $("shareShootout"),
      ),
    );
    $("resetShootout").addEventListener("click", () => {
      const replaying = $("resetShootout").textContent.includes("again");
      reset();
      if (replaying) {
        window.requestAnimationFrame(() => {
          shootoutCard.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    });
    reset();
  }

  function fixtureCarousel() {
    const fixtures = (C.fixtures || []).slice(0, 3);
    let index = 0;
    const render = () => {
      const fixture = fixtures[index];
      $("nextFixtureCarousel").innerHTML =
        `<article class="${fixture.venue === "H" ? "fixture-home" : "fixture-away"}"><span>${fixture.venue === "H" ? "HOME" : "AWAY"}</span><b>${fixture.venue === "H" ? `Albion v ${esc(fixture.opponent)}` : `${esc(fixture.opponent)} v Albion`}</b><small>${esc(fixture.date)}</small></article>`;
      $("fixtureCarouselPosition").textContent =
        `${index + 1} of ${fixtures.length}`;
    };
    $("previousFixture").addEventListener("click", () => {
      index = (index + fixtures.length - 1) % fixtures.length;
      render();
    });
    $("nextFixtureButton").addEventListener("click", () => {
      index = (index + 1) % fixtures.length;
      render();
    });
    let touchStart = 0;
    $("nextFixtureCarousel").addEventListener(
      "touchstart",
      (event) => {
        touchStart = event.changedTouches[0].clientX;
      },
      { passive: true },
    );
    $("nextFixtureCarousel").addEventListener(
      "touchend",
      (event) => {
        const distance = event.changedTouches[0].clientX - touchStart;
        if (Math.abs(distance) < 40) return;
        index =
          distance < 0
            ? (index + 1) % fixtures.length
            : (index + fixtures.length - 1) % fixtures.length;
        render();
      },
      { passive: true },
    );
    render();
  }

  function calendarDownload() {
    const monthNumbers = {
      Jan: "01",
      Feb: "02",
      Mar: "03",
      Apr: "04",
      May: "05",
      Jun: "06",
      Jul: "07",
      Aug: "08",
      Sep: "09",
      Oct: "10",
      Nov: "11",
      Dec: "12",
    };
    const compactDate = (date) => {
      const [day, month, year] = date.split(" ");
      return `${year}${monthNumbers[month]}${String(day).padStart(2, "0")}`;
    };
    const nextDay = (date) => {
      const [day, month, year] = date.split(" ");
      const d = new Date(
        Date.UTC(
          Number(year),
          Number(monthNumbers[month]) - 1,
          Number(day) + 1,
        ),
      );
      return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
    };
    const eventText = (fixture, index) => {
      const title =
        fixture.venue === "H"
          ? `Brighton & Hove Albion v ${fixture.opponent}`
          : `${fixture.opponent} v Brighton & Hove Albion`;
      return [
        "BEGIN:VEVENT",
        `UID:albion-${index + 1}-2026@albion-fan-hub`,
        `DTSTART;VALUE=DATE:${compactDate(fixture.date)}`,
        `DTEND;VALUE=DATE:${nextDay(fixture.date)}`,
        `SUMMARY:${title}`,
        `DESCRIPTION:Premier League fixture. Date and kick-off subject to change. Check the official Albion website.`,
        `LOCATION:${fixture.venue === "H" ? "Amex Stadium, Falmer" : "Away fixture"}`,
        "END:VEVENT",
      ].join("\r\n");
    };
    const download = (events, filename) => {
      const calendar = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Albion Fan Hub//Fixtures 2026-27//EN\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\n${events}\r\nEND:VCALENDAR\r\n`;
      const url = URL.createObjectURL(
        new Blob([calendar], { type: "text/calendar;charset=utf-8" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast("Calendar file downloaded");
    };
    $("downloadCalendar").addEventListener("click", (event) => {
      event.preventDefault();
      download(
        (C.fixtures || []).map(eventText).join("\r\n"),
        "albion-fixtures-2026-27.ics",
      );
    });
    $("fixtureList").addEventListener("click", (event) => {
      const button = event.target.closest("[data-calendar-index]");
      if (!button) return;
      const index = Number(button.dataset.calendarIndex);
      const fixture = C.fixtures[index];
      if (!fixture) return;
      download(
        eventText(fixture, index),
        `albion-${fixture.opponent.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.ics`,
      );
    });
  }

  function soundAndInstall() {
    const audio = $("anthemAudio");
    const chantAudio = $("chantAudio");
    const chantButtons = [...document.querySelectorAll("[data-chant]")];
    const chantNowPlaying = $("chantNowPlaying");
    const chantPulse = $("chantPulse");
    const stopChantButton = $("stopChant");
    const toggle = $("soundToggle");
    const inlineToggle = $("inlineSoundToggle");
    const volume = $("soundVolume");
    const testButton = $("testSound");
    const soundStatus = $("soundStatus");
    const caption = $("soundCaption");
    let soundEnabled = localStorage.getItem("albionSound") === "on";
    const savedVolume = Number(
      localStorage.getItem("albionSoundVolume") || 75,
    );
    let masterVolume = Number.isFinite(savedVolume)
      ? Math.max(0, Math.min(1, savedVolume / 100))
      : 0.75;
    let audioContext = null;
    let captionTimer = 0;
    let chantClipTimer = 0;
    volume.value = String(Math.round(masterVolume * 100));
    audio.volume = masterVolume;
    chantAudio.volume = masterVolume;
    const setChantState = (key = "", title = "Choose a chant") => {
      chantNowPlaying.textContent = title;
      chantPulse.classList.toggle("playing", Boolean(key));
      stopChantButton.disabled = !key;
      chantButtons.forEach((button) => {
        const active = button.dataset.chant === key;
        button.classList.toggle("playing", active);
        button.setAttribute("aria-pressed", String(active));
        button.querySelector("small").textContent = active
          ? "Playing"
          : "Play chant";
      });
    };
    const stopChant = (message = "Choose a chant") => {
      window.clearTimeout(chantClipTimer);
      chantAudio.pause();
      chantAudio.currentTime = 0;
      setChantState("", message);
    };
    const showCaption = (text) => {
      window.clearTimeout(captionTimer);
      caption.textContent = text;
      caption.hidden = false;
      captionTimer = window.setTimeout(() => {
        caption.hidden = true;
      }, 1500);
    };
    const updateSound = (enabled) => {
      soundEnabled = enabled;
      localStorage.setItem("albionSound", enabled ? "on" : "off");
      toggle.textContent = enabled
        ? "🔊 Site sound on"
        : "🔇 Site sound off";
      inlineToggle.textContent = enabled ? "Turn sound off" : "Turn sound on";
      [toggle, inlineToggle].forEach((button) =>
        button.setAttribute("aria-pressed", String(enabled)),
      );
      toggle.classList.toggle("sound-on", enabled);
      toggle.classList.toggle("sound-off", !enabled);
      toggle.title = enabled
        ? "Turn all site sound off"
        : "Turn site sound on";
      soundStatus.textContent = enabled
        ? `Site sound is on at ${Math.round(masterVolume * 100)}% volume.`
        : "Site sound is off.";
      if (!enabled) {
        if (!audio.paused) audio.pause();
        if (!chantAudio.paused) stopChant("Chants paused");
        if (audioContext?.state === "running")
          audioContext.suspend().catch(() => {});
      }
    };
    playChant = (key, options = {}) => {
      const button = chantButtons.find(
        (item) => item.dataset.chant === key,
      );
      const title =
        options.title || button?.dataset.title || "Albion chant";
      if (!soundEnabled && !options.user) return;
      if (!soundEnabled) updateSound(true);
      window.clearTimeout(chantClipTimer);
      if (!audio.paused) audio.pause();
      if (chantAudio.dataset.currentChant !== key) {
        chantAudio.src = new URL(`${key}.mp3`, document.baseURI).href;
        chantAudio.dataset.currentChant = key;
        chantAudio.load();
      }
      chantAudio.currentTime = 0;
      chantAudio.volume = masterVolume;
      setChantState(key, options.win ? `${title} · Shoot-out winners!` : title);
      soundStatus.textContent = options.win
        ? "Seagulls victory chant playing."
        : `${title} playing.`;
      chantAudio.play().catch(() => {
        setChantState("", "Tap a chant to play");
        soundStatus.textContent =
          "Your browser needs one tap on a chant before match chants can play.";
      });
      if (options.clipMs)
        chantClipTimer = window.setTimeout(
          () => stopChant("Goal chant finished"),
          options.clipMs,
        );
    };
    playSfx = (type) => {
      const captions = {
        confirm: "Sound is working",
        kick: "Boot strikes the ball",
        goal: "Goal! The crowd roars",
        post: "The ball strikes the post",
        save: "Gloves meet the ball",
        miss: "The shot goes wide",
        crowd: "Albion supporters roar",
        whistle: "The referee whistles",
      };
      showCaption(captions[type] || "Match sound");
      if (!soundEnabled || masterVolume === 0) return;
      const AudioEngine = window.AudioContext || window.webkitAudioContext;
      if (!AudioEngine) return;
      audioContext ||= new AudioEngine();
      if (audioContext.state === "suspended") audioContext.resume();
      const now = audioContext.currentTime;
      const gain = audioContext.createGain();
      gain.connect(audioContext.destination);
      gain.gain.setValueAtTime(
        (type === "crowd" ? 0.08 : 0.18) * masterVolume,
        now,
      );
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        now + (type === "crowd" ? 1.2 : 0.28),
      );
      if (type === "crowd") {
        const buffer = audioContext.createBuffer(
          1,
          audioContext.sampleRate * 1.2,
          audioContext.sampleRate,
        );
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        const noise = audioContext.createBufferSource();
        const filter = audioContext.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 650;
        noise.buffer = buffer;
        noise.connect(filter);
        filter.connect(gain);
        noise.start(now);
        return;
      }
      const frequencies = {
        confirm: 440,
        kick: 95,
        goal: 620,
        post: 1180,
        save: 180,
        miss: 110,
        whistle: 1560,
      };
      const oscillator = audioContext.createOscillator();
      oscillator.type =
        type === "post" ? "square" : type === "whistle" ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(frequencies[type] || 220, now);
      oscillator.frequency.exponentialRampToValueAtTime(
        type === "goal" || type === "confirm"
          ? 920
          : Math.max(45, (frequencies[type] || 220) * 0.55),
        now + 0.25,
      );
      oscillator.connect(gain);
      oscillator.start(now);
      oscillator.stop(now + 0.3);
    };
    const toggleSound = () => {
      updateSound(!soundEnabled);
      if (soundEnabled) playSfx("confirm");
    };
    toggle.addEventListener("click", toggleSound);
    inlineToggle.addEventListener("click", toggleSound);
    volume.addEventListener("input", () => {
      masterVolume = Number(volume.value) / 100;
      localStorage.setItem("albionSoundVolume", volume.value);
      audio.volume = masterVolume;
      chantAudio.volume = masterVolume;
      if (soundEnabled)
        soundStatus.textContent =
          `Site sound is on at ${volume.value}% volume.`;
    });
    volume.addEventListener("change", () => {
      if (soundEnabled) playSfx("confirm");
    });
    testButton.addEventListener("click", () => {
      if (!soundEnabled) updateSound(true);
      playSfx("save");
      window.setTimeout(() => playSfx("crowd"), 320);
    });
    chantButtons.forEach((button) =>
      button.addEventListener("click", () =>
        playChant(button.dataset.chant, {
          title: button.dataset.title,
          user: true,
        }),
      ),
    );
    stopChantButton.addEventListener("click", () => stopChant());
    audio.addEventListener("play", () => {
      if (!soundEnabled) updateSound(true);
      if (!chantAudio.paused) stopChant("Choose a chant");
      audio.volume = masterVolume;
      soundStatus.textContent = "Anthem playing. Site sound is on.";
    });
    audio.addEventListener("pause", () => {
      soundStatus.textContent = soundEnabled
        ? `Anthem paused. Site sound remains on at ${Math.round(masterVolume * 100)}% volume.`
        : "Site sound is off.";
    });
    audio.addEventListener("ended", () => {
      soundStatus.textContent =
        `Anthem finished. Site sound remains on at ${Math.round(masterVolume * 100)}% volume.`;
    });
    audio.addEventListener("error", () => {
      soundStatus.textContent =
        "The anthem is unavailable, but generated match effects still work.";
    });
    chantAudio.addEventListener("ended", () => {
      setChantState("", "Choose another chant");
      soundStatus.textContent =
        `Chant finished. Site sound remains on at ${Math.round(masterVolume * 100)}% volume.`;
    });
    chantAudio.addEventListener("error", () => {
      setChantState("", "Recording unavailable");
      soundStatus.textContent =
        "That chant could not be played. Please try another recording.";
    });
    updateSound(soundEnabled);
    let installPrompt = null;
    const installButton = $("installApp");
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      installPrompt = event;
      installButton.hidden = false;
    });
    installButton.addEventListener("click", async () => {
      if (!installPrompt) return;
      installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      installButton.hidden = true;
    });
  }

  function pageUtilities() {
    const topButton = $("backToTop");
    const showTop = () =>
      topButton.classList.toggle("show", window.scrollY > 650);
    window.addEventListener("scroll", showTop, { passive: true });
    showTop();
    topButton.addEventListener("click", () =>
      window.scrollTo({ top: 0, behavior: "smooth" }),
    );
    const notice = $("cookieNotice");
    if (localStorage.getItem("albionCookieNotice") === "accepted")
      notice.hidden = true;
    $("acceptCookies").addEventListener("click", () => {
      localStorage.setItem("albionCookieNotice", "accepted");
      notice.hidden = true;
    });
    $("resetSite").addEventListener("click", () => {
      if (
        window.confirm &&
        !window.confirm(
          "Reset saved quiz, team, predictions, penalty record, fixture, stand, sound, theme and cookie choices?",
        )
      )
        return;
      Object.keys(localStorage)
        .filter((key) => key.startsWith("albion"))
        .forEach((key) => localStorage.removeItem(key));
      window.location.reload();
    });
  }

  function siteExperience() {
    const search = $("siteSearch");
    const results = $("siteSearchResults");
    const searchable = [
      ["quiz", "Quiz"],
      ["shootout", "Penalty shoot-out"],
      ["match-centre", "Matchday"],
      ["fixtures", "Fixtures"],
      ["xi", "Pick your XI"],
      ["predictor", "Match predictor"],
      ["league-predictor", "League position predictor"],
      ["story", "Albion Story"],
      ["records", "Records & Honours"],
      ["amex-stands", "Amex stand guide"],
      ["travel", "Getting to the Amex"],
      ["anthem", "Sussex by the Sea"],
    ];
    search.addEventListener("input", () => {
      const query = search.value.trim().toLowerCase();
      if (query.length < 2) {
        results.innerHTML = "";
        return;
      }
      const matches = searchable
        .filter(([id, label]) =>
          `${label} ${$(id)?.textContent || ""}`.toLowerCase().includes(query),
        )
        .slice(0, 6);
      results.innerHTML = matches.length
        ? matches
            .map(([id, label]) => `<a href="#${id}">${esc(label)}</a>`)
            .join("")
        : "<span>No matching section found.</span>";
    });
    results.addEventListener("click", () => {
      search.value = "";
      results.innerHTML = "";
    });
    const theme = $("themeToggle");
    const setTheme = (night) => {
      document.body.classList.toggle("night-theme", night);
      theme.setAttribute("aria-pressed", String(night));
      theme.textContent = night ? "Day-match theme" : "Night-match theme";
      localStorage.setItem("albionTheme", night ? "night" : "day");
    };
    setTheme(localStorage.getItem("albionTheme") === "night");
    theme.addEventListener("click", () =>
      setTheme(!document.body.classList.contains("night-theme")),
    );
    const continueButton = $("continueButton");
    const previousSection = localStorage.getItem("albionLastSection");
    const previousMatch = searchable.find(([id]) => id === previousSection);
    if (previousMatch) {
      continueButton.hidden = false;
      continueButton.textContent = `Continue: ${previousMatch[1]}`;
      continueButton.addEventListener("click", () =>
        $(previousSection)?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        }),
      );
    }
    if ("IntersectionObserver" in window) {
      window.setTimeout(() => {
        const observer = new IntersectionObserver(
          (entries) => {
            const visible = entries
              .filter((entry) => entry.isIntersecting)
              .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
            if (visible?.target?.id)
              localStorage.setItem("albionLastSection", visible.target.id);
          },
          { threshold: [0.35, 0.65] },
        );
        searchable.forEach(([id]) => {
          if ($(id)) observer.observe($(id));
        });
      }, 1200);
    }
    $("shareXI").dataset.defaultLabel = "Share XI";
    $("shareXI").addEventListener("click", () => {
      const players = [...document.querySelectorAll("#pitch select")]
        .map((select) => select.value)
        .filter(Boolean);
      const text =
        players.length === 11
          ? `My Albion ${$("formation").value}: ${players.join(", ")}.`
          : `I am building my Albion ${$("formation").value} in the Albion Fan Hub.`;
      shareText("My Albion XI", text, $("shareXI"));
    });
  }

  function ui() {
    const menu = $("menuToggle");
    const nav = $("navLinks");
    menu.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      menu.setAttribute("aria-expanded", String(open));
    });
    nav.querySelectorAll("a").forEach((link) =>
      link.addEventListener("click", () => {
        nav.classList.remove("open");
        menu.setAttribute("aria-expanded", "false");
      }),
    );
    $("fixtureSearch").addEventListener("input", renderFixtures);
    $("venueFilter").addEventListener("change", renderFixtures);
    $("monthFilter").addEventListener("change", () => {
      $("monthButtons")
        .querySelectorAll("button")
        .forEach((button) =>
          button.classList.toggle(
            "active",
            button.dataset.month === $("monthFilter").value,
          ),
        );
      localStorage.setItem("albionFixtureMonth", $("monthFilter").value);
      renderFixtures();
    });
    $("toggleFixtures").addEventListener("click", () => {
      const hidden = $("fixtureList").toggleAttribute("hidden");
      $("toggleFixtures").textContent = hidden
        ? "Show fixtures"
        : "Hide fixtures";
      $("toggleFixtures").setAttribute("aria-expanded", String(!hidden));
    });
    $("fixtureList").addEventListener("click", (event) => {
      const button = event.target.closest("[data-fixture-expand]");
      if (!button) return;
      const detail = $(`fixture-extra-${button.dataset.fixtureExpand}`);
      if (!detail) return;
      const opening = detail.hidden;
      detail.hidden = !opening;
      button.setAttribute("aria-expanded", String(opening));
      button.textContent = opening ? "Hide details" : "Details";
    });
    $("newQuiz").addEventListener("click", newQuiz);
    $("quizCategory").addEventListener("change", () => {
      localStorage.setItem("albionQuizCategory", $("quizCategory").value);
      localStorage.removeItem(quizProgressKey);
      newQuiz();
    });
    $("checkQuiz").addEventListener("click", checkQuiz);
    $("replayMistakes").addEventListener("click", replayQuizMistakes);
    if ($("replayWeakCategory"))
      $("replayWeakCategory").addEventListener(
        "click",
        replayWeakQuizCategory,
      );
    $("shareQuiz").dataset.defaultLabel = "Share quiz result";
    $("shareQuiz").addEventListener("click", () =>
      shareText(
        "Albion Fan Hub quiz",
        $("shareQuiz").dataset.shareText,
        $("shareQuiz"),
      ),
    );
    $("bestScore").textContent =
      `Best: ${localStorage.getItem("albionQuizBest") || 0}/5`;
  }

  matchConfiguration();
  countdown();
  setInterval(countdown, 60000);
  renderSquad();
  initXI();
  initFixtureMonths();
  renderFixtures();
  renderFixtureHighlights();
  predictor();
  leaguePredictor();
  randomContent();
  weather();
  amex();
  story();
  historyDetails();
  historyEraFilters();
  peopleDetails();
  recordTabs();
  travelGuide();
  shootout();
  fixtureCarousel();
  calendarDownload();
  soundAndInstall();
  pageUtilities();
  siteExperience();
  ui();
  initialiseQuiz();
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker
      .register("./service-worker.js")
      .then((registration) => {
        const showUpdate = () => {
          if (navigator.serviceWorker.controller)
            $("updateNotice").hidden = false;
        };
        if (registration.waiting) showUpdate();
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed") showUpdate();
          });
        });
        $("reloadUpdate").addEventListener("click", () => {
          if (registration.waiting) {
            registration.waiting.postMessage({ type: "SKIP_WAITING" });
            $("reloadUpdate").textContent = "Updating…";
          } else window.location.reload();
        });
        let reloading = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (reloading) return;
          reloading = true;
          window.location.reload();
        });
      })
      .catch(() => {});
  }
})();
