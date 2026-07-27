(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const root = document.documentElement;
  const updateViewport = () => root.style.setProperty('--safe-vh', `${(window.visualViewport?.height || window.innerHeight) * .01}px`);
  updateViewport();
  window.addEventListener('resize', updateViewport, { passive:true });
  window.visualViewport?.addEventListener('resize', updateViewport, { passive:true });

  if (!document.querySelector('.skip-link')) {
    const skip = document.createElement('a');
    skip.className = 'skip-link'; skip.href = '#main-content'; skip.textContent = 'Skip to main content';
    document.body.prepend(skip);
  }
  const main = document.querySelector('main');
  if (main && !main.id) main.id = 'main-content';
  if (main && !main.hasAttribute('tabindex')) main.tabIndex = -1;

  const top = document.createElement('button');
  top.className = 'back-to-top'; top.type = 'button'; top.setAttribute('aria-label','Back to top'); top.textContent = '↑';
  document.body.append(top);
  top.addEventListener('click', () => window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}));
  const syncTop = () => top.classList.toggle('is-visible', scrollY > 900);
  addEventListener('scroll', syncTop, {passive:true}); syncTop();

  document.querySelectorAll('audio').forEach(audio => {
    audio.preload = audio.closest('#anthem,#chants') ? 'metadata' : 'none';
    audio.addEventListener('play', () => document.querySelectorAll('audio').forEach(other => { if (other !== audio && !other.paused) other.pause(); }));
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) document.querySelectorAll('audio').forEach(a => a.pause()); });

  const stage = $('penaltyStage');
  const ready = $('palaceReadyPanel');
  if (stage && ready) {
    const controls = document.createElement('div');
    controls.className = 'mobile-save-controls'; controls.id = 'mobileSaveControls'; controls.hidden = true;
    controls.setAttribute('aria-label','Goalkeeper save direction');
    [['← Left',.18],['● Centre',.5],['Right →',.82]].forEach(([label,x]) => {
      const b=document.createElement('button'); b.type='button'; b.className='ghost'; b.textContent=label;
      b.addEventListener('click', () => {
        const rect=stage.getBoundingClientRect();
        const opts={bubbles:true,cancelable:true,clientX:rect.left+rect.width*x,clientY:rect.top+rect.height*.42,pointerId:91,pointerType:'touch',isPrimary:true};
        stage.dispatchEvent(new PointerEvent('pointerdown',opts));
        stage.dispatchEvent(new PointerEvent('pointerup',opts));
        stage.focus({preventScroll:true});
      });
      controls.append(b);
    });
    ready.insertAdjacentElement('afterend', controls);
    const syncControls = () => {
      const active = !ready.hidden || stage.classList.contains('is-saving') || stage.classList.contains('is-palace-run');
      controls.hidden = !active;
    };
    new MutationObserver(syncControls).observe(ready,{attributes:true,attributeFilter:['hidden']});
    new MutationObserver(syncControls).observe(stage,{attributes:true,attributeFilter:['class']});
    syncControls();
  }

  document.querySelectorAll('button:not([aria-label])').forEach(button => {
    const text=button.textContent.trim(); if (text) button.setAttribute('aria-label',text);
  });
  document.querySelectorAll('select').forEach(select => { if (!select.getAttribute('aria-label') && !select.labels?.length) select.setAttribute('aria-label',select.id || 'Selection'); });

  const release = document.querySelector('.site-smooth-status');
  if (release) release.textContent='Release 35';

  if ('serviceWorker' in navigator) navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), {once:true});
})();
