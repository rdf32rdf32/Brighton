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
        saved.currentQuiz.every((q) => q && Array.isArray(q.choices) && q.choices.length >= 2 && Number.isInteger(q.answer)) &&
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

  // Penalty shoot-out logic lives in shootout.js.

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
    if (localStorage.getItem("albionCookieNotice") === "accepted" || localStorage.getItem("albion-cookie-consent") === "accepted") { notice.hidden = true; notice.style.display = "none"; }
    $("acceptCookies").addEventListener("click", () => {
      localStorage.setItem("albionCookieNotice", "accepted"); localStorage.setItem("albion-cookie-consent", "accepted");
      notice.hidden = true; notice.style.display = "none";
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
  // Penalty shoot-out is initialised by the isolated shootout.js module.
  fixtureCarousel();
  calendarDownload();
  soundAndInstall();
  pageUtilities();
  siteExperience();
  ui();
  initialiseQuiz();
  // Production release: register a fresh service worker for install and offline support.
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("./service-worker.js?v=20260726-r14", { updateViaCache: "none" })
        .then((registration) => registration.update())
        .catch(() => {});
    });
  }
})();
