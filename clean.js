(() => {
  'use strict';
  const taker = document.getElementById('penaltyTaker');
  const keeper = document.getElementById('keeper');
  const shirt = document.getElementById('penaltyShirt');
  if (taker) taker.classList.add('clean-player-rig');
  if (keeper) keeper.classList.add('clean-keeper-rig');

  const syncTeam = () => {
    if (!taker || !keeper) return;
    const palace = taker.classList.contains('palace-taker') || shirt?.dataset.player === 'PALACE';
    taker.dataset.team = palace ? 'palace' : 'brighton';
    keeper.dataset.team = palace ? 'brighton' : 'palace';
  };
  syncTeam();
  if (taker) new MutationObserver(syncTeam).observe(taker, { attributes: true, attributeFilter: ['class'] });
  if (shirt) new MutationObserver(syncTeam).observe(shirt, { attributes: true, attributeFilter: ['data-player'] });

  // Hide any leftover technical UI without running diagnostics.
  document.querySelectorAll('[data-diagnostic], .diagnostic-panel, .site-health-output, #diagnosticStatus').forEach((el) => {
    const section = el.closest('section');
    (section || el).hidden = true;
  });
})();
