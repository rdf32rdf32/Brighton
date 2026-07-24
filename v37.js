(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  document.documentElement.classList.add('v37');
  const KEYS = {largeTextSetting:'large-controls',highContrastSetting:'high-contrast',reduceMotionSetting:'reduce-motion',dataSaverSetting:'data-saver'};
  const apply = () => Object.entries(KEYS).forEach(([id,cls]) => {
    const input=$(id); if(!input) return;
    const value=localStorage.getItem('albionSetting:'+id)==='true';
    input.checked=value; document.documentElement.classList.toggle(cls,value);
  });
  Object.entries(KEYS).forEach(([id,cls]) => $(id)?.addEventListener('change', e => {
    localStorage.setItem('albionSetting:'+id,String(e.target.checked));
    document.documentElement.classList.toggle(cls,e.target.checked);
  }));
  const settings=$('supporter-settings');
  function openSettings(){ if(!settings)return; settings.hidden=false; document.documentElement.classList.add('settings-open'); $('settingsToggle')?.setAttribute('aria-expanded','true'); settings.scrollIntoView({behavior:document.documentElement.classList.contains('reduce-motion')?'auto':'smooth',block:'start'}); }
  function closeSettings(){ document.documentElement.classList.remove('settings-open'); $('settingsToggle')?.setAttribute('aria-expanded','false'); $('settingsToggle')?.focus(); }
  $('settingsToggle')?.addEventListener('click',openSettings); $('closeSettings')?.addEventListener('click',closeSettings);
  document.querySelector('a[href="#supporter-settings"]')?.addEventListener('click',e=>{e.preventDefault();openSettings();});
  function diagnostics(){
    const checks=[
      ['JavaScript','pass'],['Local storage',(()=>{try{localStorage.setItem('__a','1');localStorage.removeItem('__a');return'pass'}catch{return'fail'}})()],
      ['Quiz bank',Array.isArray(window.ALBION_QUIZ)&&window.ALBION_QUIZ.length>=5?'pass':'fail'],
      ['Penalty engine',$('stadiumScene')&&$('penaltyTaker')&&$('keeper')?'pass':'fail'],
      ['Audio',document.querySelectorAll('audio').length?'pass':'warn'],
      ['Connection',navigator.onLine?'pass':'warn'],['Build','v37']
    ];
    const failed=checks.filter(x=>x[1]==='fail').length;
    const status=$('diagnosticStatus');
    if(status){status.textContent=failed?'Some checks need attention.':'All essential site checks passed.'; let box=status.parentElement.querySelector('.diagnostic-report'); if(!box){box=document.createElement('div');box.className='diagnostic-report';status.after(box)} box.innerHTML=checks.map(([n,v])=>`<div>${v==='pass'?'✓':v==='fail'?'✕':v==='warn'?'!':'•'} <b>${n}</b>${v==='v37'?'':`: ${v}`}</div>`).join('');}
  }
  $('runDiagnostics')?.addEventListener('click',diagnostics);
  apply(); diagnostics();
  document.querySelectorAll('[data-reset-group]').forEach(btn=>btn.addEventListener('click',()=>{
    const group=btn.dataset.resetGroup;
    if(group==='display') Object.keys(KEYS).forEach(id=>localStorage.removeItem('albionSetting:'+id));
    if(group==='quiz') ['albionQuizBest','albionQuizProgress'].forEach(k=>localStorage.removeItem(k));
    if(group==='penalties') Object.keys(localStorage).filter(k=>/penalt/i.test(k)).forEach(k=>localStorage.removeItem(k));
    if(group==='predictions') Object.keys(localStorage).filter(k=>/predict/i.test(k)).forEach(k=>localStorage.removeItem(k));
    if(group==='team') Object.keys(localStorage).filter(k=>/xi|team|formation|captain/i.test(k)).forEach(k=>localStorage.removeItem(k));
    apply(); const s=$('resetStatus'); if(s)s.textContent=`${btn.textContent.trim()} choices reset.`;
  }));
})();
