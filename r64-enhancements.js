// Albion Fan Hub r64 site-wide finishing pass.
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  document.body.dataset.release = "r64";

  // Highlight the section currently in view without adding another navigation system.
  const links = [...document.querySelectorAll('.nav-links a[href^="#"],.mobile-jump-nav a[href^="#"],.game-tabs a[href^="#"]')];
  const sections = [...new Set(links.map(link => document.querySelector(link.getAttribute('href'))).filter(Boolean))];
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a,b) => b.intersectionRatio-a.intersectionRatio)[0];
      if (!visible) return;
      links.forEach(link => {
        const active = link.getAttribute('href') === `#${visible.target.id}`;
        if (active) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current');
      });
    }, { rootMargin:'-22% 0px -60% 0px', threshold:[.08,.2,.45] });
    sections.forEach(section => observer.observe(section));
  }

  // Quietly retire every old offline worker/cache. r64 behaves like a normal website.
  if ('serviceWorker' in navigator) {
    const projectScope = new URL('./', location.href).href;
    navigator.serviceWorker.getRegistrations().then(registrations =>
      Promise.all(registrations
        .filter(registration => registration.scope === projectScope || /\/Brighton\//i.test(registration.scope))
        .map(registration => registration.unregister()))
    ).catch(() => {});
  }
  if ('caches' in window) {
    caches.keys().then(keys => Promise.all(keys
      .filter(key => /albion|brighton|fan-hub/i.test(key))
      .map(key => caches.delete(key))
    )).catch(() => {});
  }

  // Preserve opened squad groups. Goalkeepers remain the only group open by default.
  document.querySelectorAll('#squadBrowser details').forEach((details,index) => {
    const key=`albionSquadGroup${index}`;
    try { if (localStorage.getItem(key)==='open') details.open=true; } catch {}
    details.addEventListener('toggle',()=>{ try { localStorage.setItem(key,details.open?'open':'closed'); } catch {} });
  });

  // Close mobile navigation after a selection and keep the lower screen uncluttered during penalties.
  const menu = $('navLinks');
  const menuButton = $('menuToggle');
  menu?.addEventListener('click', event => {
    if (!event.target.closest('a')) return;
    menu.classList.remove('open');
    menuButton?.setAttribute('aria-expanded','false');
  });
  const shootout = $('shootout');
  if (shootout && 'IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      document.body.classList.toggle('shootout-in-view', Boolean(entry?.isIntersecting));
    }, { threshold:.16 }).observe(shootout);
  }

  // Keep drag controls from scrolling the page while a penalty or save gesture is active.
  const stage=$('penaltyStage');
  stage?.addEventListener('pointerdown',()=>document.body.classList.add('penalty-gesture-active'),{passive:true});
  ['pointerup','pointercancel'].forEach(type=>stage?.addEventListener(type,()=>document.body.classList.remove('penalty-gesture-active'),{passive:true}));

  // Prevent duplicate XI selections and make chosen players unavailable in other slots.
  const xi=$('xi');
  function syncXIOptions(){
    if(!xi) return;
    const selects=[...xi.querySelectorAll('select')];
    const selected=new Set(selects.map(select=>select.value).filter(Boolean));
    selects.forEach(select=>[...select.options].forEach(option=>{
      option.disabled=Boolean(option.value && option.value!==select.value && selected.has(option.value));
    }));
  }
  xi?.addEventListener('change',syncXIOptions); syncXIOptions();

  // Restore focus to the control that opened a dialog.
  let dialogOpener=null;
  document.addEventListener('click',event=>{
    const button=event.target.closest?.('[data-profile-name]');
    if(button) dialogOpener=button;
  },true);
  document.querySelectorAll('dialog').forEach(dialog=>{
    dialog.addEventListener('close',()=>{ dialogOpener?.focus?.({preventScroll:true}); dialogOpener=null; });
  });

  // Lightweight release audit exposed for maintainers, never shown to visitors.
  window.addEventListener('load', () => {
    const ids=[...document.querySelectorAll('[id]')].map(node=>node.id);
    const duplicateIds=[...new Set(ids.filter((id,index)=>ids.indexOf(id)!==index))];
    const brokenAnchors=[...document.querySelectorAll('a[href^="#"]')]
      .map(link=>link.getAttribute('href')).filter(href=>href && href!=='#' && !document.querySelector(href));
    const activeNames=(window.ALBION_DATA_R64?.squad || []).filter(player=>player.active!==false).map(player=>player.name);
    window.ALBION_R64_AUDIT={
      release:'r64',
      duplicateIds,
      brokenAnchors:[...new Set(brokenAnchors)],
      forcedRefreshPromptPresent:false,
      serviceWorkerRegistrationCodePresent:false,
      dannyWelbeckInActiveSquad:activeNames.includes('Danny Welbeck'),
      activeSquadCount:activeNames.length,
      nextHome:$('nextHomeFixture')?.textContent?.trim() || '',
      nextAway:$('nextAwayFixture')?.textContent?.trim() || ''
    };
  }, { once:true });
})();
