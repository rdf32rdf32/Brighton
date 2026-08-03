// Albion Fan Hub r62 site-wide finishing pass.
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);

  // Highlight the section currently in view without adding a second navigation system.
  const links = [...document.querySelectorAll('.nav-links a[href^="#"],.mobile-jump-nav a[href^="#"]')];
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

  // Preserve which squad position groups the visitor opened.
  document.querySelectorAll('#squadBrowser details').forEach((details,index) => {
    const key=`albionSquadGroup${index}`;
    try { if (localStorage.getItem(key)==='open') details.open=true; } catch {}
    details.addEventListener('toggle',()=>{ try { localStorage.setItem(key,details.open?'open':'closed'); } catch {} });
  });

  // Make stale service-worker updates visible instead of silently serving an old release.
  const banner=$('siteUpdateBanner'), refresh=$('refreshSiteUpdate');
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').then(registration => {
      const show=worker=>{ if (!worker || !banner) return; banner.hidden=false; refresh.onclick=()=>{ worker.postMessage({type:'SKIP_WAITING'}); location.reload(); }; };
      if (registration.waiting) show(registration.waiting);
      registration.addEventListener('updatefound',()=>{
        const worker=registration.installing;
        worker?.addEventListener('statechange',()=>{ if(worker.state==='installed' && navigator.serviceWorker.controller) show(worker); });
      });
    }).catch(()=>{});
    let refreshing=false;
    navigator.serviceWorker.addEventListener('controllerchange',()=>{ if(!refreshing){ refreshing=true; location.reload(); } });
  }

  // Keep drag controls from scrolling the page while a penalty or save gesture is active.
  const stage=$('penaltyStage');
  stage?.addEventListener('pointerdown',()=>document.body.classList.add('penalty-gesture-active'),{passive:true});
  ['pointerup','pointercancel'].forEach(type=>stage?.addEventListener(type,()=>document.body.classList.remove('penalty-gesture-active'),{passive:true}));

  // Prevent duplicate XI selections and make the selected player visible across all selectors.
  const xi=$('xi');
  function syncXIOptions(){
    if(!xi) return;
    const selects=[...xi.querySelectorAll('select')];
    const selected=new Set(selects.map(select=>select.value).filter(Boolean));
    selects.forEach(select=>[...select.options].forEach(option=>{ option.disabled=Boolean(option.value && option.value!==select.value && selected.has(option.value)); }));
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
})();
