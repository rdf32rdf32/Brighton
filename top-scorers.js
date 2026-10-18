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



/* r96: Stats Centre, History Archive and XI builder enhancements.
   All competition statistics are computed from manually verified fixture records. */
(() => {
  'use strict';
  const d = window.ALBION_DATA_R66;
  const root = document.getElementById('stats-centre');
  if (!d || !root) return;
  const $ = id => document.getElementById(id);
  const fixtures = (d.fixtures || []).filter(f => Number.isFinite(f.albionGoals) && Number.isFinite(f.opponentGoals));
  const competitions = ['Premier League', 'Carabao Cup', 'UEFA Conference League', 'FA Cup'];
  const scorerKeys = {'Premier League':'premierLeague', 'Carabao Cup':'carabaoCup', 'UEFA Conference League':'conferenceLeague', 'FA Cup':'faCup'};
  const named = {'all':'All competitions', ...Object.fromEntries(competitions.map(c => [c,c]))};
  const outcome = f => f.albionGoals > f.opponentGoals ? 'W' : f.albionGoals < f.opponentGoals ? 'L' : 'D';
  const asMonth = f => {
    const date = new Date(f.date + ' 12:00:00 GMT');
    return Number.isNaN(date.valueOf()) ? f.date : new Intl.DateTimeFormat('en-GB',{month:'short',year:'numeric',timeZone:'UTC'}).format(date);
  };
  const monthTime = month => Date.parse('1 ' + month + ' 12:00:00 GMT') || 0;
  const summarize = games => games.reduce((s,f) => {
    s.played++;
    s.gf+=f.albionGoals; s.ga+=f.opponentGoals;
    s[outcome(f).toLowerCase()]++;
    return s;
  },{played:0,w:0,d:0,l:0,gf:0,ga:0});
  const node = (tag,content,classname) => {
    const el=document.createElement(tag);
    el.textContent=String(content);
    if(classname)el.className=classname;
    return el;
  };
  const friendly = num => num > 0 ? '+' + num : String(num);
  const date = new Date(d.fixtureCheckedISO + 'T12:00:00Z');
  if(!Number.isNaN(date.valueOf())) $('statsUpdated').textContent='Fixtures checked ' + new Intl.DateTimeFormat('en-GB',{dateStyle:'long',timeZone:'UTC'}).format(date) + ' · not live';
  const allSummary=summarize(fixtures);
  const scorerTotal=(d.scoring?.players||[]).reduce((sum,p)=>sum + ['premierLeague','carabaoCup','conferenceLeague','faCup'].reduce((v,k)=>v+(p[k]||0),0),0);
  const ownGoals=Object.values(d.scoring?.ownGoals||{}).reduce((a,b)=>a+b,0);
  if(d.scoring && allSummary.gf !== scorerTotal + ownGoals) {
    $('statsSourceNote').prepend(node('strong','Please review goal totals: scorer data and results do not currently agree. ','stats-warning'));
  }
  const list=games=>{
    const s=summarize(games);
    return s.played+' played · '+s.w+'W '+s.d+'D '+s.l+'L · '+s.gf+'–'+s.ga+' goals';
  };
  function render(){
    const comp=$('statsCompetition').value;
    const metric=$('statsTrendMetric').value;
    const filtered=comp==='all'?fixtures:fixtures.filter(f=>f.competition===comp);
    const s=summarize(filtered);
    const scorerField=scorerKeys[comp];
    const players=(d.scoring?.players||[]).map(p=>({
      name:p.name,goals:scorerField?(p[scorerField]||0):Object.values(scorerKeys).reduce((n,k)=>n+(p[k]||0),0)
    })).filter(p=>p.goals>0).sort((a,b)=>b.goals-a.goals || a.name.localeCompare(b.name,'en-GB'));
    const kpis=[
      ['Played',s.played],['Record',s.w+'W '+s.d+'D '+s.l+'L'],['Goals for',s.gf],['Goals against',s.ga],
      ['Goal difference',friendly(s.gf-s.ga)],['Win rate',s.played?Math.round(s.w/s.played*100)+'%':'—'],
      ['Goals per game',s.played?(s.gf/s.played).toFixed(2):'—'],
      [comp==='Premier League'?'Points':'Clean sheets',comp==='Premier League'?s.w*3+s.d:filtered.filter(f=>f.opponentGoals===0).length]
    ];
    const fragment=document.createDocumentFragment();
    kpis.forEach(([label,value])=>{
      const card=document.createElement('article');
      card.append(node('span',label),node('strong',value));
      fragment.append(card);
    });
    $('statsKpis').replaceChildren(fragment);
    const months=new Map();
    filtered.forEach(f=>{
      const name=asMonth(f);
      if(!months.has(name))months.set(name,[]);
      months.get(name).push(f);
    });
    const monthStats=[...months.entries()].sort(([a],[b])=>monthTime(a)-monthTime(b))
      .map(([name,games])=>({name, ...summarize(games)}));
    const max=Math.max(1,...monthStats.map(m=>metric==='goals'?m.gf:metric==='conceded'?m.ga:m.played));
    const trend=document.createDocumentFragment();
    monthStats.forEach(m=>{
      const val=metric==='goals'?m.gf:metric==='conceded'?m.ga:m.played;
      const wrap=node('div','','stats-trend-row');
      wrap.setAttribute('role','listitem');
      wrap.setAttribute('aria-label',m.name+': '+val+' '+(metric==='played'?'matches':metric==='conceded'?'conceded':'goals scored'));
      const track=node('div','','stats-trend-track');
      const bar=node('span','','stats-trend-bar');
      bar.style.width=(val/max*100)+'%';
      track.append(bar);
      wrap.append(node('span',m.name,'stats-trend-label'),track,node('strong',val));
      trend.append(wrap);
    });
    if(!monthStats.length)trend.append(node('p','No completed matches in this competition yet.'));
    $('statsTrend').replaceChildren(trend);
    const venues=document.createDocumentFragment();
    [['H','Home'],['A','Away']].forEach(([key,label])=>{
      const games=filtered.filter(f=>f.venue===key);
      const box=node('article','','stats-venue');
      box.append(node('strong',label),node('span',list(games)));
      venues.append(box);
    });
    $('statsVenues').replaceChildren(venues);
    const top=document.createDocumentFragment();
    players.slice(0,4).forEach((p,i)=>{
      const row=node('div','','stats-top-player');
      row.append(node('span',(i+1)+'. '+p.name),node('strong',p.goals));
      top.append(row);
    });
    if(!players.length)top.append(node('p','No player goals recorded yet.'));
    $('statsTopPlayers').replaceChildren(top);
    const compRows=document.createDocumentFragment();
    competitions.forEach(c=>{
      const v=summarize(fixtures.filter(f=>f.competition===c));
      const tr=document.createElement('tr');
      [c,v.played,v.w,v.d,v.l,v.gf,v.ga].forEach((item,i)=>{
        const el=node(i===0?'th':'td',item);
        if(i===0)el.scope='row';
        tr.append(el);
      });
      compRows.append(tr);
    });
    $('statsCompetitionRows').replaceChildren(compRows);
  }
  $('statsCompetition').addEventListener('change',render);
  $('statsTrendMetric').addEventListener('change',render);
  render();
})();

(() => {
 'use strict';
 const root=document.getElementById('history-archive');
 if(!root)return;
 const $=id=>document.getElementById(id);
 const source='https://www.brightonandhovealbion.com/media-gallery/galleries-125-anniversary-in-pictures';
 const moments=[
   [1901,'The club is founded','origins','Origins','Albion were founded in the Seven Stars pub on Ship Street on 24 June 1901.','https://www.brightonandhovealbion.com/media-article/club-news-125-anniversary-blue-plaque-unveiling-seven-stars-june-2026'],
   [1910,'Charity Shield glory','origins','Silverware','Albion defeated Aston Villa 1–0 at Stamford Bridge to win the FA Charity Shield.',source],
   [1979,'The First Division beckons','survival','Promotion','Victory against Newcastle United in May 1979 brought Albion promotion to the top flight for the first time.',source],
   [1983,'Wembley FA Cup final','survival','Wembley','Albion drew 2–2 with Manchester United in the FA Cup final and then lost the replay.',source],
   [1997,'The Goldstone farewell','survival','Stadium','Stuart Storer scored the winning goal against Doncaster Rovers in the club’s final game at the Goldstone.',source],
   [1997,'Survival at Hereford','survival','Fightback','Robbie Reinelt’s equaliser at Hereford ensured that Albion retained their Football League status on goals scored.',source],
   [1999,'The Withdean years begin','survival','Stadium','After two seasons playing in Gillingham, Albion returned to Brighton at Withdean Stadium.',source],
   [2004,'Cardiff play-off triumph','survival','Promotion','Albion beat Bristol City 1–0 in the play-off final at the Millennium Stadium.',source],
   [2011,'The Amex opens','amex','Stadium','Albion beat Doncaster Rovers 2–1 in the first competitive league game at the Amex on 6 August 2011.',source],
   [2017,'Premier League promotion','amex','Promotion','A 2–1 win against Wigan Athletic secured promotion to the Premier League.',source],
   [2023,'Europe for the first time','amex','Europe','A sixth-place Premier League finish earned Albion a first European campaign.',source],
   [2026,'Albion at 125','amex','Anniversary','Brighton commemorated the club’s formation at the Seven Stars and celebrated 125 years of its history.','https://www.brightonandhovealbion.com/media-article/club-news-125-anniversary-blue-plaque-unveiling-seven-stars-june-2026']
 ];
 const list=$('archiveEntryList'),feature=$('archiveFeature');
 const mk=(tag,value,className)=>{
   const el=document.createElement(tag);
   el.textContent=String(value);
   if(className)el.className=className;
   return el;
 };
 let active=null;
 function show(i){
   active=i;
   const [year,title,era,tag,description,url]=moments[i];
   const wrap=document.createDocumentFragment();
   wrap.append(mk('span',year+' · '+tag,'archive-detail-kicker'),mk('h3',title),mk('p',description));
   const link=mk('a','View source and historic photographs ↗','archive-source-link');
   link.href=url;link.target='_blank';link.rel='noopener noreferrer';
   wrap.append(link);
   feature.replaceChildren(wrap);
   list.querySelectorAll('[data-archive-index]').forEach(btn=>{
     const selected=Number(btn.dataset.archiveIndex)===i;
     btn.classList.toggle('is-selected',selected);
     btn.setAttribute('aria-pressed',String(selected));
   });
 }
 function render(){
   const era=$('archiveEra').value;
   const query=$('archiveSearch').value.toLocaleLowerCase('en-GB').trim();
   const found=moments.map((m,i)=>({m,i})).filter(({m})=>(era==='all'||m[2]===era)&&
     (!query||m.join(' ').toLocaleLowerCase('en-GB').includes(query)));
   const fragment=document.createDocumentFragment();
   found.forEach(({m,i})=>{
     const btn=mk('button','','archive-entry');
     btn.type='button';btn.dataset.archiveIndex=String(i);
     btn.append(mk('b',m[0]),mk('span',m[1]));
     btn.addEventListener('click',()=>show(i));
     fragment.append(btn);
   });
   list.replaceChildren(fragment);
   $('archiveResultsCount').textContent=found.length+' historic '+(found.length===1?'moment':'moments')+' found';
   if(!found.length){active=null;feature.replaceChildren(mk('p','No matching event. Try another year, word or era.'));}
   else show(found.some(x=>x.i===active)?active:found[0].i);
 }
 $('archiveSearch').addEventListener('input',render);
 $('archiveEra').addEventListener('change',render);
 render();
})();
