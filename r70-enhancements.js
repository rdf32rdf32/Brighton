/* Albion Fan Hub r72: results, league stats, numbered squad polish */
(() => {
  'use strict';
  const data = window.ALBION_DATA_R66 || {};
  const fixtures = Array.isArray(data.fixtures) ? data.fixtures : [];
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const complete = (fx) => Number.isFinite(fx.albionGoals) && Number.isFinite(fx.opponentGoals);
  const outcome = (fx) => fx.albionGoals > fx.opponentGoals ? 'W' : fx.albionGoals < fx.opponentGoals ? 'L' : 'D';
  const displayScore = (fx) => fx.venue === 'H' ? `Albion ${fx.albionGoals}–${fx.opponentGoals} ${fx.opponent}` : `${fx.opponent} ${fx.opponentGoals}–${fx.albionGoals} Albion`;
  const resultFixtures = fixtures.filter(complete).slice().reverse();

  function stats(list) {
    return list.reduce((s, fx) => {
      s.p += 1; s.gf += fx.albionGoals; s.ga += fx.opponentGoals;
      const o = outcome(fx); if (o === 'W') s.w += 1; else if (o === 'D') s.d += 1; else s.l += 1;
      return s;
    }, {p:0,w:0,d:0,l:0,gf:0,ga:0});
  }

  function updateLeagueStats() {
    const league = resultFixtures.filter((fx) => (fx.competition || 'Premier League') === 'Premier League');
    const s = stats(league);
    if ($('seasonPlayed')) $('seasonPlayed').textContent = s.p;
    if ($('seasonPoints')) $('seasonPoints').textContent = s.w * 3 + s.d;
    if ($('seasonRecord')) $('seasonRecord').textContent = `${s.w}-${s.d}-${s.l}`;
    if ($('seasonGoals')) $('seasonGoals').textContent = `${s.gf}-${s.ga}`;
  }

  function renderResults(filter = 'all') {
    const list = $('resultsList');
    if (!list) return;
    const filtered = resultFixtures.filter((fx) => filter === 'all' || (filter === 'league' && (fx.competition || 'Premier League') === 'Premier League') || (filter === 'europe' && /UEFA|Europa|Conference/i.test(fx.competition || '')) || (filter === 'cups' && /Cup/i.test(fx.competition || '')));
    list.innerHTML = filtered.length ? filtered.map((fx) => {
      const o = outcome(fx);
      const venue = fx.venue === 'H' ? 'Home' : 'Away';
      const extra = [fx.round, venue, fx.attendance ? `Attendance ${Number(fx.attendance).toLocaleString('en-GB')}` : ''].filter(Boolean).join(' · ');
      return `<article class="result-card result-${o.toLowerCase()}">
        <div class="result-outcome" aria-label="${o === 'W' ? 'Win' : o === 'D' ? 'Draw' : 'Loss'}">${o}</div>
        <div class="result-main"><span>${esc(fx.competition || 'Premier League')} · ${esc(fx.date)}</span><h3>${esc(displayScore(fx))}</h3><small>${esc(extra)}</small><p>${esc(fx.summary || fx.note || '')}</p></div>
        <div class="result-actions"><span class="result-score">${esc(fx.result || `${fx.albionGoals}–${fx.opponentGoals}`)}</span>${fx.reportUrl ? `<a href="${esc(fx.reportUrl)}" rel="noopener" target="_blank">Match report ↗</a>` : ''}</div>
      </article>`;
    }).join('') : '<p class="empty-result-state">No completed results in this competition yet.</p>';
  }

  function renderResultFilters() {
    const wrap = $('resultFilterButtons');
    if (!wrap) return;
    const options = [
      ['all','All'], ['league','Premier League'], ['europe','Europe'], ['cups','Cups']
    ];
    wrap.innerHTML = options.map(([key,label], i) => `<button type="button" data-result-filter="${key}" class="${i === 0 ? 'active' : ''}" aria-pressed="${i === 0}">${label}</button>`).join('');
    wrap.addEventListener('click', (event) => {
      const button = event.target.closest('[data-result-filter]'); if (!button) return;
      wrap.querySelectorAll('button').forEach((b) => { b.classList.toggle('active', b === button); b.setAttribute('aria-pressed', String(b === button)); });
      renderResults(button.dataset.resultFilter);
    });
  }

  function updateResultsSummary() {
    const s = stats(resultFixtures);
    const map = {allCompPlayed:s.p, allCompWon:s.w, allCompDrawn:s.d, allCompLost:s.l};
    Object.entries(map).forEach(([id,val]) => { if ($(id)) $(id).textContent = val; });
    if ($('allCompGoals')) $('allCompGoals').textContent = `${s.gf}–${s.ga}`;
    if ($('resultsFormStrip')) $('resultsFormStrip').innerHTML = resultFixtures.slice(0,5).reverse().map((fx) => `<span class="form-${outcome(fx).toLowerCase()}" title="${esc(displayScore(fx))}">${outcome(fx)}</span>`).join('');
  }

  function updateLatestResult() {
    const fx = resultFixtures[0]; if (!fx) return;
    const score = displayScore(fx);
    if ($('heroLatestResult')) $('heroLatestResult').innerHTML = `<span>Latest result · ${esc(fx.date)}</span><b>${esc(score)}</b><a href="#results">Results →</a>`;
    if ($('matchCentreLatestResult')) $('matchCentreLatestResult').innerHTML = `<span>Latest result</span><b>${esc(score)}</b><small>${esc(fx.competition || 'Premier League')} · ${esc(fx.date)}</small>`;
  }

  // Ensure cards that are produced by older render paths retain their number badge.
  function reinforceNumbers() {
    const numberByName = new Map((data.squad || []).filter((p) => p.active !== false).map((p) => [p.name, p.number]));
    document.querySelectorAll('.player-profile-card').forEach((card) => {
      const name = card.querySelector('h3')?.textContent?.trim();
      const no = numberByName.get(name); if (!no) return;
      let badge = card.querySelector('.player-number');
      if (!badge) { badge = document.createElement('span'); badge.className = 'player-number'; card.querySelector('.player-card-top')?.appendChild(badge); }
      badge.textContent = no; badge.setAttribute('aria-label', `Squad number ${no}`);
    });
  }

  updateLeagueStats();
  updateResultsSummary();
  renderResultFilters();
  renderResults();
  updateLatestResult();
  reinforceNumbers();
  const squadGrid = $('playerProfileGrid');
  if (squadGrid && 'MutationObserver' in window) new MutationObserver(reinforceNumbers).observe(squadGrid, {childList:true,subtree:true});
})();
