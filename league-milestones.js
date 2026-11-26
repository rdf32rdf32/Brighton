/* Albion Fan Hub: league points milestones, calculated from recorded scores. */
(function () {
  'use strict';
  function calculate(fixtures) {
    const games = (fixtures || []).filter(f => f.competition === 'Premier League' &&
      Number.isInteger(f.albionGoals) && Number.isInteger(f.opponentGoals));
    const points = games.reduce((p,f) => p + (f.albionGoals > f.opponentGoals ? 3 : f.albionGoals === f.opponentGoals ? 1 : 0),0);
    return { played: games.length, points, remaining: Math.max(0,38-games.length) };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { calculate };
  if (typeof document === 'undefined') return;
  const box = document.getElementById('leagueMilestones');
  if (!box) return;
  function render() {
    const data = window.ALBION_DATA_R66;
    if (!data || !Array.isArray(data.fixtures)) return;
    const s = calculate(data.fixtures);
    const summary = document.getElementById('leagueMilestoneSummary');
    summary.textContent = s.points + ' points from ' + s.played + ' of 38 matches · ' + s.remaining + ' remaining';
    const rows = document.getElementById('leagueMilestoneRows');
    const fragment = document.createDocumentFragment();
    for (const target of [40,50,60,70]) {
      const row = document.createElement('div');
      row.style.cssText = 'display:grid;gap:.25rem;margin:.65rem 0;';
      const label = document.createElement('span');
      const remaining = Math.max(0,target-s.points);
      label.textContent = target+' points — '+(remaining===0 ? 'Reached' : remaining > 3*s.remaining ? 'Out of reach' : remaining+' more needed');
      const bar = document.createElement('progress');
      bar.max = target; bar.value = Math.min(target,s.points);
      bar.setAttribute('aria-label',target+'-point milestone');
      bar.style.cssText='width:100%;height:.75rem;accent-color:#1687d3;';
      row.append(label,bar);
      fragment.append(row);
    }
    rows.replaceChildren(fragment);
  }
  render();
  window.addEventListener('albion-final-score',render);
})();
