(() => {
  'use strict';
  document.documentElement.dataset.release = 'rollback-5-professional-rebuild';

  const notice = document.getElementById('cookieNotice');
  const accept = document.getElementById('acceptCookies');
  const key = 'albion-cookie-consent';
  if (notice && accept) {
    let accepted = false;
    try { accepted = localStorage.getItem(key) === 'accepted'; } catch (_) {}
    notice.hidden = accepted;
    accept.addEventListener('click', () => {
      try { localStorage.setItem(key, 'accepted'); } catch (_) {}
      notice.hidden = true;
    });
  }

  // Prevent accidental double activation on touch devices during a kick.
  const goal = document.getElementById('goal');
  if (goal) goal.style.touchAction = 'none';
})();
