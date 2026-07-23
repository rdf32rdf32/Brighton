(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const ratingFor = (score) =>
    [
      "Time for an Albion Refresher",
      "Are You a Secret Palace Fan?",
      "Still Learning the Albion Story",
      "Solid Albion Knowledge",
      "Amex Regular",
      "Seagulls Expert",
    ][Math.max(0, Math.min(5, Number(score) || 0))];
  const ordinal = (value) => {
    const number = Number(value);
    const mod100 = number % 100;
    if (mod100 >= 11 && mod100 <= 13) return `${number}th`;
    return `${number}${
      number % 10 === 1
        ? "st"
        : number % 10 === 2
          ? "nd"
          : number % 10 === 3
            ? "rd"
            : "th"
    }`;
  };
  const readJSON = (key, fallback) => {
    try {
      return JSON.parse(localStorage.getItem(key)) || fallback;
    } catch {
      return fallback;
    }
  };

  function renderProfile() {
    const latestQuiz = readJSON("albionQuizLatest", null);
    const best = Number(localStorage.getItem("albionQuizBest") || 0);
    $("profileQuizLevel").textContent =
      latestQuiz?.rating || (best ? ratingFor(best) : "Not rated yet");
    $("profileQuizScore").textContent = latestQuiz
      ? `Latest score ${latestQuiz.score}/${latestQuiz.total} · best ${best}/5`
      : best
        ? `Best score ${best}/5`
        : "Play the five-question quiz";

    const record = readJSON("albionShootoutRecord", {
      played: 0,
      wins: 0,
      saves: 0,
    });
    $("profileShootouts").textContent =
      `${Number(record.played) || 0} played · ${Number(record.wins) || 0} won`;
    $("profileShootoutDetail").textContent = record.played
      ? `${Number(record.saves) || 0} Palace penalties saved`
      : "No derby record yet";

    const position = Number(localStorage.getItem("albionLeaguePosition"));
    $("profileLeague").textContent =
      position >= 1 && position <= 20 ? `${ordinal(position)} place` : "Not saved";
  }

  const resetGroups = {
    quiz: (key) =>
      key.startsWith("albionQuiz") || key.startsWith("albionQuizSeen"),
    penalties: (key) => key.startsWith("albionShootout"),
    predictions: (key) =>
      key.startsWith("albionPrediction") ||
      key.startsWith("albionLeaguePrediction") ||
      key === "albionLeaguePosition",
    team: (key) => key.startsWith("albionXI"),
    display: (key) =>
      [
        "albionAccessibility",
        "albionTheme",
        "albionSound",
        "albionSoundVolume",
        "albionAnthemVolume",
      ].includes(key),
  };

  function initialiseResetControls() {
    document.querySelectorAll("[data-reset-group]").forEach((button) => {
      button.addEventListener("click", () => {
        const group = button.dataset.resetGroup;
        const matches = resetGroups[group];
        if (!matches) return;
        const label = button.textContent.trim();
        if (
          window.confirm &&
          !window.confirm(`Clear the saved ${label.toLowerCase()} choices?`)
        )
          return;
        Object.keys(localStorage)
          .filter(matches)
          .forEach((key) => localStorage.removeItem(key));
        $("resetStatus").textContent = `${label} choices cleared. Reloading…`;
        window.setTimeout(() => location.reload(), 450);
      });
    });
  }

  localStorage.removeItem("albionMatchdayItinerary");
  renderProfile();
  initialiseResetControls();
  window.addEventListener("albion:progress", renderProfile);
  window.addEventListener("storage", renderProfile);
})();
