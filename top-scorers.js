/* Brighton top scorers — curated 2026/27 figures, not a live feed. */
(() => {
  'use strict';
  const data = window.ALBION_DATA_R66;
  const scoring = data && data.scoring;
  const rows = document.getElementById('scorersRows');
  if (!scoring || !rows || !Array.isArray(scoring.players)) return;

  const competitions = ['premierLeague', 'carabaoCup', 'conferenceLeague', 'faCup'];
  const labels = {all:'All competitions', premierLeague:'Premier League', carabaoCup:'Carabao Cup', conferenceLeague:'Conference League', faCup:'FA Cup'};
  const table = rows.closest('table');
  const dateNode = document.getElementById('scorersDate');
  const leaderNode = document.getElementById('scorersLeader');
  const metaNode = document.getElementById('scorersMeta');
  const noteNode = document.getElementById('scorersNote');
  const emptyNode = document.getElementById('scorersEmpty');
  const buttons = Array.from(document.querySelectorAll('[data-scorer-filter]'));
  const own = scoring.ownGoals || {};
  const total = player => competitions.reduce((sum, key) => sum + (Number(player[key]) || 0), 0);
  const ownTotal = competitions.reduce((sum, key) => sum + (Number(own[key]) || 0), 0);
  const playerTotal = scoring.players.reduce((sum, player) => sum + total(player), 0);
  const fixtures = (Array.isArray(data.fixtures) ? data.fixtures : []).filter(f =>
    Number.isFinite(f.albionGoals) && Number.isFinite(f.opponentGoals));
  const fixtureGoals = fixtures.reduce((sum, f) => sum + f.albionGoals, 0);
  const countsByComp = competitions.reduce((obj, key) => {
    obj[key] = scoring.players.reduce((sum, player) => sum + (Number(player[key]) || 0), 0) + (Number(own[key]) || 0);
    return obj;
  }, {});
  const compMap = {'Premier League':'premierLeague', 'Carabao Cup':'carabaoCup', 'EFL Cup':'carabaoCup', 'UEFA Conference League':'conferenceLeague', 'FA Cup':'faCup'};
  const fixtureByComp = competitions.reduce((obj, key) => { obj[key] = 0; return obj; }, {});
  fixtures.forEach(f => { if (compMap[f.competition]) fixtureByComp[compMap[f.competition]] += f.albionGoals; });
  const synced = fixtureGoals === playerTotal + ownTotal &&
    competitions.every(key => countsByComp[key] === fixtureByComp[key]);
  const checked = new Date(scoring.checkedISO + 'T12:00:00Z');
  if (dateNode && !Number.isNaN(checked.valueOf())) {
    dateNode.textContent = 'Checked ' + new Intl.DateTimeFormat('en-GB', {day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(checked);
  }

  function cell(tag, value, className) {
    const el = document.createElement(tag);
    el.textContent = String(value);
    if (className) el.className = className;
    if (tag === 'th') el.scope = 'row';
    return el;
  }
  function render(filter) {
    const key = Object.prototype.hasOwnProperty.call(labels, filter) ? filter : 'all';
    const scored = scoring.players.map(player => ({ ...player, all: total(player) }))
      .filter(player => player[key] > 0)
      .sort((a, b) => b[key] - a[key] || b.all - a.all || a.name.localeCompare(b.name, 'en-GB'));
    const fragment = document.createDocumentFragment();
    scored.forEach((player, i) => {
      const tr = document.createElement('tr');
      if (i === 0) tr.className = 'scorers-leading-row';
      tr.appendChild(cell('th', (i + 1) + '. ' + player.name));
      competitions.forEach(comp => tr.appendChild(cell('td', player[comp], key === comp ? 'scorers-selected-cell' : '')));
      tr.appendChild(cell('td', player.all, key === 'all' ? 'scorers-selected-cell scorers-total-cell' : 'scorers-total-cell'));
      fragment.appendChild(tr);
    });
    rows.replaceChildren(fragment);
    buttons.forEach(button => {
      const active = button.dataset.scorerFilter === key;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    table.querySelectorAll('th[data-goals-field]').forEach(th => th.classList.toggle('scorers-selected-head', th.dataset.goalsField === key));
    if (emptyNode) emptyNode.hidden = scored.length !== 0;
    if (leaderNode) {
      if (scored.length) {
        const first = scored[0][key];
        const leaders = scored.filter(p => p[key] === first).map(p => p.name);
        leaderNode.textContent = leaders.join(' · ') + ' — ' + first + (first === 1 ? ' goal' : ' goals') + (key === 'all' ? '' : ' in ' + labels[key]);
      } else leaderNode.textContent = 'No scorers yet · ' + labels[key];
    }
    if (metaNode) {
      const count = key === 'all' ? playerTotal : scoring.players.reduce((sum, player) => sum + (Number(player[key]) || 0), 0);
      const ownCount = key === 'all' ? ownTotal : (Number(own[key]) || 0);
      metaNode.textContent = count + ' player goals · ' + ownCount + ' own goals · ' + (count + ownCount) + ' Brighton goals';
    }
  }
  if (!synced && noteNode) {
    const warning = document.createElement('strong');
    warning.className = 'scorers-warning';
    warning.textContent = 'Scorer breakdown needs review against the latest completed results. ';
    noteNode.prepend(warning);
  }
  buttons.forEach(button => button.addEventListener('click', () => render(button.dataset.scorerFilter)));
  render('all');
})();
