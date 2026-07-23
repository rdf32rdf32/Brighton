(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const original = window.ALBION_CONTENT || {};
  const clone = (value) => JSON.parse(JSON.stringify(value));

  function number(id) {
    const value = Number($(id).value);
    return Number.isFinite(value) ? value : 0;
  }

  function populate() {
    const match = original.nextMatch || {};
    $("editOpponent").value = match.opponent || "";
    $("editDateLong").value = match.dateLong || "";
    $("editDateShort").value = match.dateShort || "";
    $("editTime").value = match.time || "";
    $("editVenue").value = match.venue || "";
    $("editDateISO").value = match.dateISO || "";
    const seasonKey = original.currentSeason || "2026/27";
    const season = original.seasonDatabase?.[seasonKey] || {};
    $("editSeason").value = seasonKey;
    $("editSeasonStatus").value = season.status || "";
    $("editPosition").value = season.position || "";
    $("editPlayed").value = season.played || 0;
    $("editWon").value = season.won || 0;
    $("editDrawn").value = season.drawn || 0;
    $("editLost").value = season.lost || 0;
    $("editGoalsFor").value = season.goalsFor || 0;
    $("editGoalsAgainst").value = season.goalsAgainst || 0;
    $("editPoints").value = season.points || 0;
    $("editResults").value = (season.results || [])
      .map(
        (result) =>
          `${result.date} | ${result.opponent} | ${result.venue} | ${result.albionGoals}-${result.opponentGoals}`,
      )
      .join("\n");
    $("editFixtures").value = (original.fixtures || [])
      .map(
        (fixture) => `${fixture.date} | ${fixture.venue} | ${fixture.opponent}`,
      )
      .join("\n");
    $("editSquad").value = (original.squad || [])
      .map((player) => `${player.position} | ${player.name}`)
      .join("\n");
    $("editLastUpdated").value = original.lastUpdated || "";
    $("editFreshFixtures").value = original.freshness?.fixtures || "";
    $("editFreshSquad").value = original.freshness?.squad || "";
    $("editFreshTravel").value = original.freshness?.travel || "";
    $("editFreshHistory").value = original.freshness?.history || "";
  }

  function lines(id) {
    return $(id)
      .value.split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function build() {
    const content = clone(original);
    content.featureVersion = "16";
    content.lastUpdated = $("editLastUpdated").value.trim();
    content.nextMatch = {
      opponent: $("editOpponent").value.trim(),
      dateLong: $("editDateLong").value.trim(),
      dateShort: $("editDateShort").value.trim(),
      time: $("editTime").value,
      venue: $("editVenue").value.trim(),
      dateISO: $("editDateISO").value.trim(),
    };
    const seasonKey = $("editSeason").value.trim();
    content.currentSeason = seasonKey;
    const previousSeason = content.seasonDatabase?.[seasonKey] || {};
    content.seasonDatabase ||= {};
    content.seasonDatabase[seasonKey] = {
      ...previousSeason,
      label: seasonKey,
      status: $("editSeasonStatus").value.trim(),
      competition: previousSeason.competition || "Premier League",
      position: number("editPosition") || null,
      played: number("editPlayed"),
      won: number("editWon"),
      drawn: number("editDrawn"),
      lost: number("editLost"),
      goalsFor: number("editGoalsFor"),
      goalsAgainst: number("editGoalsAgainst"),
      points: number("editPoints"),
      results: lines("editResults").map((line) => {
        const [date, opponent, venue, score] = line
          .split("|")
          .map((item) => item.trim());
        const [albionGoals, opponentGoals] = (score || "")
          .split("-")
          .map(Number);
        return {
          date,
          opponent,
          venue,
          albionGoals,
          opponentGoals,
        };
      }),
    };
    content.fixtures = lines("editFixtures").map((line) => {
      const [date, venue, opponent] = line
        .split("|")
        .map((item) => item.trim());
      return { date, opponent, venue: venue.toUpperCase() };
    });
    content.squad = lines("editSquad").map((line) => {
      const [position, name] = line.split("|").map((item) => item.trim());
      return { name, position };
    });
    content.freshness = {
      fixtures: $("editFreshFixtures").value.trim(),
      squad: $("editFreshSquad").value.trim(),
      travel: $("editFreshTravel").value.trim(),
      history: $("editFreshHistory").value.trim(),
    };
    return content;
  }

  function validate(content) {
    const errors = [];
    if (!content.nextMatch.opponent) errors.push("next opponent is missing");
    if (Number.isNaN(new Date(content.nextMatch.dateISO).valueOf()))
      errors.push("next-match ISO date is invalid");
    if (!content.fixtures.length) errors.push("fixture list is empty");
    content.fixtures.forEach((fixture, index) => {
      if (
        !fixture.date ||
        !fixture.opponent ||
        !["H", "A"].includes(fixture.venue)
      )
        errors.push(`fixture line ${index + 1} is incomplete`);
    });
    const allowedPositions = [
      "Goalkeeper",
      "Defender",
      "Midfielder",
      "Forward",
    ];
    content.squad.forEach((player, index) => {
      if (!player.name || !allowedPositions.includes(player.position))
        errors.push(`squad line ${index + 1} has an invalid position or name`);
    });
    const season = content.seasonDatabase[content.currentSeason];
    if (season.played !== season.won + season.drawn + season.lost)
      errors.push("played must equal won + drawn + lost");
    season.results.forEach((result, index) => {
      if (
        !result.date ||
        !result.opponent ||
        !["H", "A"].includes(result.venue) ||
        !Number.isFinite(result.albionGoals) ||
        !Number.isFinite(result.opponentGoals)
      )
        errors.push(`result line ${index + 1} is invalid`);
    });
    return errors;
  }

  function runValidation() {
    const content = build();
    const errors = validate(content);
    $("editorStatus").textContent = errors.length
      ? `Please correct: ${errors.join("; ")}.`
      : `Validation passed: ${content.fixtures.length} fixtures, ${content.squad.length} players and ${content.seasonDatabase[content.currentSeason].results.length} results.`;
    return { content, errors };
  }

  $("validateContent").addEventListener("click", runValidation);
  $("downloadContent").addEventListener("click", () => {
    const { content, errors } = runValidation();
    if (errors.length) return;
    const blob = new Blob(
      [`window.ALBION_CONTENT = ${JSON.stringify(content, null, 2)};\n`],
      { type: "text/javascript" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "content-data.js";
    link.click();
    URL.revokeObjectURL(url);
    $("editorStatus").textContent =
      "Validated content-data.js downloaded. Replace the existing repository file.";
  });
  populate();
})();
