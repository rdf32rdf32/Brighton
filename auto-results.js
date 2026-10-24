/* Automatically generated match records. Updated by GitHub Actions, not by site visitors. */
/* RESULTS_START */
const changes = [];
/* RESULTS_END */
(function () {
  'use strict';
  const base = window.ALBION_DATA_R66;
  if (!base || !Array.isArray(base.fixtures) || !Array.isArray(changes) || !changes.length) return;
  const keyOf = f => [f.date, f.competition, f.venue, f.opponent].join('|');
  const baseline = new Map(base.fixtures.map(f => [keyOf(f), f]));
  const accepted = new Map();
  for (const item of changes) {
    const fixture = baseline.get(keyOf(item));
    if (!fixture || Number.isFinite(fixture.albionGoals) || Number.isFinite(fixture.opponentGoals)) continue;
    if (!Number.isInteger(item.albionGoals) || !Number.isInteger(item.opponentGoals) ||
        item.albionGoals < 0 || item.opponentGoals < 0 ||
        item.albionGoals > 25 || item.opponentGoals > 25 ||
        !/^\d{6,15}$/.test(String(item.eventId || '')) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(String(item.checkedISO || ''))) continue;
    accepted.set(keyOf(item), item);
  }
  if (!accepted.size) return;
  const updated = base.fixtures.map(f => {
    const match = accepted.get(keyOf(f));
    if (!match) return f;
    const home = f.venue === 'H' ? match.albionGoals : match.opponentGoals;
    const away = f.venue === 'H' ? match.opponentGoals : match.albionGoals;
    return Object.assign({}, f, {
      albionGoals: match.albionGoals, opponentGoals: match.opponentGoals,
      homeScore: home, awayScore: away, result: home + '–' + away,
      resultOutcome: match.albionGoals > match.opponentGoals ? 'W' :
        match.albionGoals < match.opponentGoals ? 'L' : 'D',
      status: 'Full-time',
      sourceUrl: 'https://www.espn.com/soccer/match/_/gameId/' + match.eventId,
      automatedSource: 'ESPN final-score feed',
      automatedCheckedISO: match.checkedISO
    });
  });
  const scoring = base.scoring && Object.assign({}, base.scoring, {
    players: base.scoring.players.map(p => Object.assign({}, p)),
    ownGoals: Object.assign({}, base.scoring.ownGoals)
  });
  let incomplete = false;
  if (scoring) {
    const compMap = {'Premier League':'premierLeague','Carabao Cup':'carabaoCup',
      'UEFA Conference League':'conferenceLeague','FA Cup':'faCup','EFL Cup':'carabaoCup'};
    const normalize = str => String(str || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    for (const item of accepted.values()) {
      const comp = compMap[item.competition];
      if (!comp || !Array.isArray(item.scorers) || item.scorers.length !== item.albionGoals) {
        incomplete = true;
        continue;
      }
      for (const goal of item.scorers) {
        if (goal.ownGoal === true) { scoring.ownGoals[comp] = (scoring.ownGoals[comp] || 0) + 1; continue; }
        const match = scoring.players.find(p => normalize(p.name) === normalize(goal.name));
        if (match) match[comp] = (match[comp] || 0) + 1;
        else {
          const player = {name:goal.name,premierLeague:0,carabaoCup:0,conferenceLeague:0,faCup:0};
          player[comp] = 1;
          scoring.players.push(player);
        }
      }
    }
    if (!incomplete) {
      scoring.checkedISO = [...accepted.values()].map(m => m.checkedISO).sort().at(-1);
    }
    scoring.automaticPending = incomplete;
  }
  const lastChecked = [...accepted.values()].map(m => m.checkedISO).sort().at(-1);
  window.ALBION_DATA_R66 = Object.freeze(Object.assign({}, base, {
    fixtures: updated, scoring: scoring || base.scoring,
    fixtureCheckedISO: lastChecked > String(base.fixtureCheckedISO || '') ? lastChecked : base.fixtureCheckedISO
  }));
})();
