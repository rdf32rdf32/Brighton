/* Albion Fan Hub: optional live match scores. ESPN is an unofficial, best-effort public feed.
   Never infer scores from fixtures, and never silently change the manually checked season archive. */
(function (root) {
  'use strict';
  const LEAGUES = Object.freeze({
    'Premier League':'eng.1',
    'UEFA Conference League':'uefa.europa.conf',
    'FA Cup':'eng.fa',
    'Carabao Cup':'eng.league_cup',
    'EFL Cup':'eng.league_cup'
  });
  const MONTHS={Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
  const SOURCE='https://www.espn.com/soccer/team/_/id/331/brighton-hove-albion';

  function parseFixtureDay(date) {
    const m=/^(\d{1,2}) ([A-Z][a-z]{2}) (20\d{2})$/.exec(date||'');
    if(!m||MONTHS[m[2]]===undefined)return null;
    return Date.UTC(+m[3],MONTHS[m[2]],+m[1]);
  }
  function ukDay(now) {
    const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
    const p=Object.fromEntries(parts.map(v=>[v.type,v.value]));
    return Date.UTC(+p.year,+p.month-1,+p.day);
  }
  function selectFixture(fixtures,now) {
    const today=ukDay(now),DAY=86400000;
    const eligible=(fixtures||[]).map(f=>({...f,day:parseFixtureDay(f.date)}))
      .filter(f=>f.day!==null && LEAGUES[f.competition] && f.day>=today-1*DAY && f.day<=today+2*DAY);
    // Prefer a match today, then a future match. Yesterday's match is the last resort.
    return eligible.find(f=>f.day===today) ||
      eligible.filter(f=>f.day>today).sort((a,b)=>a.day-b.day)[0] ||
      eligible.filter(f=>f.day<today).sort((a,b)=>b.day-a.day)[0] || null;
  }
  function normalise(name) {
    return String(name||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
      .toLowerCase().replace(/\b(football|club|fc|afc|fk|cf|sc|town)\b/g,'')
      .replace(/[^a-z0-9]+/g,' ').trim();
  }
  function isAlbion(team) {
    return String(team?.id||'')==='331'|| /brighton/i.test(String(team?.displayName||team?.name||''));
  }
  function isOpponent(team,fixture) {
    const actual=normalise(team?.displayName||team?.name||team?.shortDisplayName);
    const expected=normalise(fixture.opponent);
    return Boolean(actual && expected && (actual===expected || actual.includes(expected) || expected.includes(actual)));
  }
  function readScore(value) {
    const raw=(value&&typeof value==='object')?(value.displayValue??value.value):value;
    return /^\d+$/.test(String(raw??''))?String(raw):null;
  }
  function fromEvent(event,fixture) {
    const entries=event?.competitions?.[0]?.competitors;
    if(!Array.isArray(entries)||entries.length!==2)return null;
    const albion=entries.find(e=>isAlbion(e.team));
    const opponent=entries.find(e=>e!==albion && isOpponent(e.team,fixture));
    if(!albion||!opponent)return null;
    const home=entries.find(e=>e.homeAway==='home');
    const away=entries.find(e=>e.homeAway==='away');
    if(!home||!away || (fixture.venue && albion.homeAway!==(fixture.venue==='H'?'home':'away')))return null;
    const type=event.status?.type||{};
    const state=type.state==='in'?'live':(type.completed===true&&type.state==='post'&&!/postponed|cancelled|canceled|abandoned/i.test(String(type.name||'')+' '+String(type.description||''))?'final':'upcoming');
    const homeScore=readScore(home.score),awayScore=readScore(away.score);
    if(state!=='upcoming'&&(homeScore===null||awayScore===null))return null;
    const name=e=>e===albion?'Albion':String(e.team?.shortDisplayName||e.team?.displayName||'Opponent');
    return {
      id:String(event.id||''),state,home:name(home),away:name(away),
      homeScore,awayScore,detail:String(type.shortDetail||type.detail||''),
      date:String(event.date||''),fixture
    };
  }
  function matchEvent(payload,fixture) {
    if(!Array.isArray(payload?.events))return null;
    const date=fixture.date;
    for(const event of payload.events) {
      // The competition and two teams MUST match. Do not accept unrelated fixtures.
      const parsed=fromEvent(event,fixture);
      if(parsed && event.date && parseFixtureDay(date)!==null) {
        const eventDate=new Date(event.date);
        if(!Number.isFinite(eventDate.getTime()))continue;
        const uk=ukDay(eventDate);
        if(uk===parseFixtureDay(date))return parsed;
      }
    }
    return null;
  }
  function scoreText(match) {
    if(match.state==='upcoming')return match.home+' v '+match.away;
    return match.home+' '+match.homeScore+'–'+match.awayScore+' '+match.away;
  }
  if(typeof module!=='undefined' && module.exports) {
    module.exports={parseFixtureDay,ukDay,selectFixture,normalise,isAlbion,isOpponent,readScore,fromEvent,matchEvent,scoreText};
  }
  if(typeof document==='undefined'||typeof window==='undefined')return;

  const data=window.ALBION_DATA_R66||{};
  const hero=document.getElementById('next-match');
  if(!hero||!Array.isArray(data.fixtures))return;
  const panel=document.createElement('div');
  panel.id='albionLiveScore';
  panel.className='albion-live-feed';
  panel.setAttribute('role','status');
  panel.setAttribute('aria-live','polite');
  const heading=document.createElement('strong'),body=document.createElement('span'),foot=document.createElement('small');
  heading.textContent='Match feed';body.textContent='Connecting…';
  panel.append(heading,body,foot);
  const before=document.getElementById('heroLatestResult');
  if(before&&before.parentElement===hero)hero.insertBefore(panel,before);else hero.append(panel);
  let timeout=null, lastShown='', stopped=false;
  const sourceLink=document.createElement('a');
  sourceLink.href=SOURCE;sourceLink.target='_blank';sourceLink.rel='noopener noreferrer';
  sourceLink.textContent='ESPN ↗';
  foot.append(document.createTextNode('Unofficial score feed · '),sourceLink);
  function show(title,message,extra,state) {
    const key=[title,message,extra,state].join('|');
    if(key===lastShown)return;
    lastShown=key;panel.dataset.feedState=state||'unknown';
    heading.textContent=title;body.textContent=message;
    let extraNode=foot.querySelector('.live-feed-extra');
    if(!extraNode){extraNode=document.createElement('span');extraNode.className='live-feed-extra';foot.prepend(extraNode);}
    extraNode.textContent=extra?extra+' · ':'';
  }
  // Independent of the matchday panel: revisit unconfirmed recent fixtures,
  // including matches more than a day old, until a verified final score arrives.
  // Both the fast matchday poll and the slower archive reconciliation use this guard.
  function recordFinal(match, f) {
    if(!match || match.state!=='final' || !/^\d{6,15}$/.test(match.id))return false;
    const home=Number(match.homeScore), away=Number(match.awayScore);
    if(![home,away].every(n=>Number.isInteger(n)&&n>=0&&n<=25))return false;
    if(Number.isFinite(f.albionGoals)||Number.isFinite(f.opponentGoals))return false;
    const ag=f.venue==='H'?home:away, og=f.venue==='H'?away:home;
    Object.assign(f,{albionGoals:ag,opponentGoals:og,homeScore:home,awayScore:away,
      result:home+'–'+away,resultOutcome:ag>og?'W':ag<og?'L':'D',
      status:'Full-time',automatedSource:'ESPN final-score feed',
      note:'Final score from ESPN; official match report and scorers may follow.'});
    return true;
  }
  let checkingArchive=false;
  async function refreshRecentResults() {
    if(checkingArchive || stopped || document.visibilityState==='hidden')return;
    checkingArchive=true;
    try {
      const today=ukDay(new Date()), DAY=86400000;
      const pending=data.fixtures.filter(f=>{
        const day=parseFixtureDay(f.date);
        return day!==null && day<=today && day>=today-21*DAY && LEAGUES[f.competition] &&
          !Number.isFinite(f.albionGoals) && !Number.isFinite(f.opponentGoals) &&
          !/postponed|cancelled|abandoned/i.test(f.status||'');
      });
      let changed=false;
      await Promise.all(pending.map(async f=>{
        try {
          const token=new Date(parseFixtureDay(f.date)).toISOString().slice(0,10).replace(/-/g,'');
          const url='https://site.api.espn.com/apis/site/v2/sports/soccer/'+LEAGUES[f.competition]+'/scoreboard?dates='+token+'&limit=150';
          const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),10000);
          let payload;
          try {
            const response=await fetch(url,{signal:controller.signal,cache:'no-store',credentials:'omit'});
            if(!response.ok)return;
            payload=await response.json();
          } finally {clearTimeout(timer);}
          const match=matchEvent(payload,f);
          if(recordFinal(match,f))changed=true;
        } catch (_) { /* Keep the last confirmed result during provider outages. */ }
      }));
      if(changed)window.dispatchEvent(new Event('albion-final-score'));
    } finally {checkingArchive=false;}
  }
  const archiveTimer=setInterval(refreshRecentResults,300000);
  refreshRecentResults();
  async function poll() {
    if(stopped)return;
    if(document.visibilityState==='hidden') {timeout=setTimeout(poll,120000);return;}
    const fixture=selectFixture(data.fixtures,new Date());
    if(!fixture) {show('Live match feed','No Albion fixture in the next two days.','Check the official club calendar','idle');timeout=setTimeout(poll,1200000);return;}
    const league=LEAGUES[fixture.competition];
    const day=fixture.date.match(/^(\d{1,2}) ([A-Z][a-z]{2}) (20\d{2})$/);
    const token=day[3]+String(MONTHS[day[2]]+1).padStart(2,'0')+day[1].padStart(2,'0');
    let delay=120000;
    try {
      const controller=new AbortController();
      const watchdog=setTimeout(()=>controller.abort(),10000);
      let response;
      try {
        response=await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/'+league+'/scoreboard?dates='+token+'&limit=150',
          {signal:controller.signal,cache:'no-store',credentials:'omit'});
      } finally {clearTimeout(watchdog);}
      if(!response.ok)throw new Error('Provider HTTP '+response.status);
      const match=matchEvent(await response.json(),fixture);
      if(!match) {
        show('Automatic score feed','No verified provider score for '+fixture.opponent+' ('+fixture.date+').',
          'The season archive is maintained separately','unavailable');
        delay=300000;
      } else {
        const detail=match.state==='live'?'In progress'+(match.detail?' · '+match.detail:''):
          match.state==='final'?'Full time':'Scheduled'+(match.detail?' · '+match.detail:'');
        show(match.state==='live'?'● LIVE':match.state==='final'?'Final score':'Matchday updates',
          scoreText(match),'Source: ESPN · '+detail+' · Checked '+new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date())+' UK',
          match.state);
        if(recordFinal(match,fixture))window.dispatchEvent(new Event('albion-final-score'));
        if(match.state==='live')delay=45000;
        else if(match.state==='upcoming')delay=180000;
        else delay=300000;
      }
    } catch(err) {
      show('Score feed temporarily unavailable','Manual fixture information remains available.',
        'Check the official club results if you need confirmation','offline');
      delay=300000;
    }
    timeout=setTimeout(poll,delay);
  }
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&!stopped){clearTimeout(timeout);refreshRecentResults();poll();}});
  window.addEventListener('pagehide',()=>{stopped=true;clearTimeout(timeout);clearInterval(archiveTimer);},{once:true});
  // Inserting a score panel above the main content changes its layout height.
  // Restore a requested deep-link target once images/scripts have completed loading.
  const initialHash=window.location.hash;
  if(/^#[A-Za-z0-9_-]+$/.test(initialHash)) {
    window.addEventListener('load',()=>{
      window.requestAnimationFrame(()=>{
        if(window.location.hash!==initialHash)return;
        const anchor=document.getElementById(initialHash.slice(1));
        if(anchor)anchor.scrollIntoView({block:'start',behavior:'instant'});
      });
    },{once:true});
  }
  poll();
})(typeof globalThis!=='undefined'?globalThis:this);
