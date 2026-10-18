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



/* r96: enhanced XI selection and local, manually checked prediction accuracy. */
(() => {
  'use strict';
  const d=window.ALBION_DATA_R66;
  const wrapper=document.getElementById('xiUpgrade');
  const pitch=document.getElementById('pitch');
  if(!d || !wrapper || !pitch)return;
  const $=id=>document.getElementById(id);
  const squad=(d.squad||[]).filter(p=>p.active!==false && (p.squadStatus||'first-team')==='first-team');
  const slots=()=>Array.from(pitch.querySelectorAll('.player-slot'));
  const selects=()=>Array.from(pitch.querySelectorAll('select'));
  const playerByName=new Map(squad.map(p=>[p.name,p]));
  const getRecords=()=>{try{const d=JSON.parse(localStorage.getItem('albionXIAccuracyV1'));return Array.isArray(d)?d:[];}catch{return[];}};
  const storeRecords=records=>localStorage.setItem('albionXIAccuracyV1',JSON.stringify(records.slice(-40)));
  const future=(d.fixtures||[]).filter(f=>!Number.isFinite(f.albionGoals)&&Number.isFinite(Date.parse(f.date+' 12:00:00 GMT')))
    .sort((a,b)=>Date.parse(a.date+' 12:00:00 GMT')-Date.parse(b.date+' 12:00:00 GMT'));
  const nextMatch=future.find(f=>Date.parse(f.date+' 12:00:00 GMT')>=Date.now()-86400000)||future[0]||null;
  const matchKey=nextMatch?nextMatch.date+'|'+nextMatch.opponent:'';
  let picked=null;
  let dragOrigin=-1;
  let dragName='';
  function message(value){$('xiPaletteStatus').textContent=value;}
  function eligible(select,name){
    return !!select && Array.from(select.options).some(o=>o.value===name);
  }
  function markSlots(){
    slots().forEach((label,i)=>{
      label.dataset.xiPosition=String(i);
      const select=label.querySelector('select');
      label.draggable=!!select?.value;
      label.classList.toggle('xi-ready-for-drop',!!picked&&eligible(select,picked));
      label.classList.toggle('xi-ineligible',!!picked&&!eligible(select,picked));
      if(select?.value)label.title='Drag '+select.value+' to swap with another eligible position';
      else label.removeAttribute('title');
    });
  }
  function renderPalette(){
    const name=$('xiPaletteSearch').value.trim().toLocaleLowerCase('en-GB');
    const pos=$('xiPalettePosition').value;
    const chosen=new Set(selects().map(s=>s.value).filter(Boolean));
    const players=squad.filter(p=>(pos==='all'||p.position===pos)&&
      (!name||[p.name,p.number,p.role].join(' ').toLocaleLowerCase('en-GB').includes(name)));
    const fragment=document.createDocumentFragment();
    players.forEach(p=>{
      const button=document.createElement('button');
      button.type='button';
      button.className='xi-player-chip';
      button.draggable=true;
      button.dataset.xiPlayer=p.name;
      button.setAttribute('aria-pressed',String(p.name===picked));
      if(chosen.has(p.name))button.classList.add('xi-on-pitch');
      if(p.name===picked)button.classList.add('xi-picked');
      const number=document.createElement('b');
      number.textContent=p.number||'—';
      const nameLabel=document.createElement('span');
      nameLabel.textContent=p.name;
      button.append(number,nameLabel);
      button.addEventListener('click',()=>{
        picked=(picked===p.name)?null:p.name;
        renderPalette();
        message(picked?'Selected '+picked+'. Tap an eligible pitch position or drag this player there.':'Selection cleared.');
      });
      fragment.append(button);
    });
    if(!players.length){
      const empty=document.createElement('p');
      empty.textContent='No matching current first-team players.';
      fragment.append(empty);
    }
    $('xiPlayerPalette').replaceChildren(fragment);
    markSlots();
  }
  function notifyChange(select){
    select.dispatchEvent(new Event('change',{bubbles:true}));
  }
  function assignPlayer(name,index,origin=-1){
    const destinations=selects();
    const target=destinations[index];
    if(!playerByName.has(name) || !target)return false;
    if(!eligible(target,name)){
      message(name+' cannot be selected for this position. Try another position.');
      return false;
    }
    const current=target.value;
    if(current===name){picked=null;renderPalette();return true;}
    if(origin<0)origin=destinations.findIndex((s,i)=>i!==index&&s.value===name);
    // If moving a player already on the pitch, swap only when the displaced player fits the old role.
    if(origin>=0 && origin!==index){
      if(current && eligible(destinations[origin],current)){
        destinations[origin].value=current;
      }else{
        destinations[origin].value='';
      }
    }
    destinations.forEach((s,i)=>{
      if(i!==index&&i!==origin&&s.value===name)s.value='';
    });
    target.value=name;
    notifyChange(target);
    picked=null;
    renderPalette();
    message('Placed '+name+' into '+(slots()[index]?.querySelector('span')?.textContent||'your XI')+'. Your selection has been saved.');
    return true;
  }
  $('xiPaletteSearch').addEventListener('input',renderPalette);
  $('xiPalettePosition').addEventListener('change',renderPalette);
  $('xiPlayerPalette').addEventListener('dragstart',event=>{
    const chip=event.target.closest('[data-xi-player]');
    if(!chip||!event.dataTransfer)return;
    dragName=chip.dataset.xiPlayer;dragOrigin=-1;
    event.dataTransfer.effectAllowed='move';
    event.dataTransfer.setData('text/plain',dragName);
  });
  pitch.addEventListener('dragstart',event=>{
    const label=event.target.closest('.player-slot');
    const index=slots().indexOf(label);
    const name=label?.querySelector('select')?.value;
    if(index<0||!name||!event.dataTransfer)return;
    dragName=name;dragOrigin=index;
    event.dataTransfer.effectAllowed='move';
    event.dataTransfer.setData('text/plain',name);
  });
  pitch.addEventListener('dragover',event=>{
    const label=event.target.closest('.player-slot');
    const name=dragName || event.dataTransfer?.getData('text/plain');
    if(label&&name&&eligible(label.querySelector('select'),name)){
      event.preventDefault();
      event.dataTransfer.dropEffect='move';
    }
  });
  pitch.addEventListener('drop',event=>{
    const label=event.target.closest('.player-slot');
    const index=slots().indexOf(label);
    if(index<0)return;
    event.preventDefault();
    const name=event.dataTransfer?.getData('text/plain')||dragName;
    assignPlayer(name,index,dragOrigin);
    dragName='';dragOrigin=-1;
  });
  pitch.addEventListener('dragend',()=>{dragName='';dragOrigin=-1;});
  $('xiPlayerPalette').addEventListener('dragend',()=>{dragName='';dragOrigin=-1;});
  pitch.addEventListener('click',event=>{
    if(!picked||event.target.closest('select'))return;
    const label=event.target.closest('.player-slot');
    if(!label)return;
    const index=slots().indexOf(label);
    if(index>=0){
      event.preventDefault();
      assignPlayer(picked,index);
    }
  });
  pitch.addEventListener('change',event=>{
    if(!event.target.matches('select'))return;
    const select=event.target;
    const val=select.value;
    // A player cannot occupy two starting places.
    if(val)selects().forEach(other=>{
      if(other!==select&&other.value===val){
        other.value='';
        notifyChange(other);
      }
    });
    renderPalette();
  });
  new MutationObserver(renderPalette).observe(pitch,{childList:true});
  document.getElementById('formation')?.addEventListener('change',()=>{picked=null;renderPalette();});
  document.getElementById('clearXI')?.addEventListener('click',()=>{picked=null;renderPalette();});
  document.getElementById('loadPredicted')?.addEventListener('click',()=>{picked=null;renderPalette();});
  document.getElementById('completeXI')?.addEventListener('click',renderPalette);
  renderPalette();

  // A confirmed XI is entered manually; no fabricated live team sheet.
  const confirmed=$('xiConfirmedPlayers');
  const review=$('xiReviewMatch');
  const checkboxes=new Map();
  squad.forEach(p=>{
    const label=document.createElement('label');
    label.className='xi-confirmed-player';
    const input=document.createElement('input');
    input.type='checkbox';input.value=p.name;
    const text=document.createElement('span');
    text.textContent=(p.number?'#'+p.number+' · ':'')+p.name;
    label.append(input,text);
    confirmed.append(label);
    checkboxes.set(p.name,input);
    input.addEventListener('change',()=>{
      updateConfirmedCount();
      updateComparisonButton();
    });
  });
  function updateConfirmedCount(){
    const num=[...checkboxes.values()].filter(b=>b.checked).length;
    $('xiConfirmedCount').textContent=num+' of 11 selected';
    $('xiConfirmedCount').classList.toggle('xi-count-ready',num===11);
  }
  $('xiConfirmedSearch').addEventListener('input',()=>{
    const term=$('xiConfirmedSearch').value.toLocaleLowerCase('en-GB').trim();
    confirmed.querySelectorAll('.xi-confirmed-player').forEach(label=>{
      label.hidden=!!term&&!label.textContent.toLocaleLowerCase('en-GB').includes(term);
    });
  });
  const matchingRecord=()=>getRecords().find(r=>r.key===review.value);
  function updateComparisonButton(){
    const rec=matchingRecord();
    $('xiCompareLineup').disabled=!rec || [...checkboxes.values()].filter(x=>x.checked).length!==11;
  }
  function renderHistory(){
    const records=getRecords();
    const total=records.filter(r=>Number.isInteger(r.correct));
    const wrap=$('xiAccuracyHistory');
    const frag=document.createDocumentFragment();
    if(total.length){
      const accuracy=Math.round(100*total.reduce((n,r)=>n+r.correct,0)/(total.length*11));
      const intro=document.createElement('p');
      intro.textContent=total.length+' checked '+(total.length===1?'match':'matches')+' · Overall accuracy '+accuracy+'%';
      frag.append(intro);
      total.slice().reverse().slice(0,8).forEach(r=>{
        const row=document.createElement('div');
        row.className='xi-history-row';
        const title=document.createElement('span');
        title.textContent=r.label+' · '+r.formation;
        const value=document.createElement('strong');
        value.textContent=r.correct+'/11';
        row.append(title,value);
        frag.append(row);
      });
    }else{
      const p=document.createElement('p');
      p.textContent='No checked predictions yet. Lock a prediction, then enter the official XI after it is announced.';
      frag.append(p);
    }
    wrap.replaceChildren(frag);
  }
  function renderReviewOptions(){
    const records=getRecords();
    const selected=review.value;
    review.replaceChildren();
    if(!records.length){
      const option=document.createElement('option');
      option.value='';option.textContent='No predictions locked yet';
      review.append(option);
    }else{
      records.slice().reverse().forEach(r=>{
        const opt=document.createElement('option');
        opt.value=r.key;opt.textContent=r.label;
        review.append(opt);
      });
      review.value=records.some(r=>r.key===selected)?selected:
        records.some(r=>r.key===matchKey)?matchKey:records[records.length-1].key;
    }
    renderSelectedReview();
  }
  function renderSelectedReview(){
    const rec=matchingRecord();
    checkboxes.forEach((input,name)=>{input.checked=!!rec?.actual?.includes(name);});
    updateConfirmedCount();
    updateComparisonButton();
    if(!rec){
      $('xiAccuracyResult').textContent='Lock a prediction to compare it with the actual eleven.';
      return;
    }
    if(Number.isInteger(rec.correct)){
      const matched=rec.starters.filter(n=>rec.actual.includes(n));
      $('xiAccuracyResult').textContent=rec.label+': '+rec.correct+'/11 correct ('+Math.round(rec.correct/11*100)+'%). Matching players: '+matched.join(', ')+'.';
    }else{
      $('xiAccuracyResult').textContent='Locked prediction for '+rec.label+' ('+rec.formation+'). Enter the confirmed starters to check your accuracy.';
    }
  }
  $('xiConfirmedPlayers').addEventListener('change',updateConfirmedCount);
  review.addEventListener('change',renderSelectedReview);
  function lockButton(){
    const locked=getRecords().some(r=>r.key===matchKey);
    $('xiLockPrediction').disabled=!matchKey||locked;
    $('xiLockStatus').textContent=!nextMatch?'No upcoming fixture found in the recorded schedule.':
      locked?'A prediction is already locked for '+nextMatch.opponent+'. Use the comparison panel below after the line-up is published.':
      'Choose 11 unique starters, then lock your prediction before the match.';
  }
  $('xiLockPrediction').addEventListener('click',()=>{
    if(!nextMatch){$('xiLockStatus').textContent='No upcoming match is available.';return;}
    const starters=selects().map(s=>s.value);
    if(starters.filter(Boolean).length!==11||new Set(starters).size!==11){
      $('xiLockStatus').textContent='Please select 11 different starting players first.';
      return;
    }
    const records=getRecords();
    if(records.some(r=>r.key===matchKey))return;
    records.push({key:matchKey,label:nextMatch.date+' · '+nextMatch.opponent,
      formation:$('formation').value,starters,createdAt:new Date().toISOString()});
    storeRecords(records);
    lockButton();renderReviewOptions();renderHistory();
    $('xiLockStatus').textContent='Prediction locked. Check the official team sheet when published, then enter the actual XI below.';
  });
  $('xiCompareLineup').addEventListener('click',()=>{
    const rec=matchingRecord();
    const actual=[...checkboxes.entries()].filter(([,input])=>input.checked).map(([name])=>name);
    if(!rec||actual.length!==11||new Set(actual).size!==11){
      $('xiAccuracyResult').textContent='Select precisely 11 confirmed starting players first.';
      return;
    }
    const records=getRecords();
    const entry=records.find(r=>r.key===rec.key);
    if(!entry)return;
    entry.actual=actual;
    entry.correct=entry.starters.filter(name=>actual.includes(name)).length;
    entry.checkedAt=new Date().toISOString();
    storeRecords(records);renderSelectedReview();renderHistory();
  });
  $('xiMatchLabel').textContent=nextMatch?'Next scheduled: '+nextMatch.date+' · '+nextMatch.opponent:'No further fixture currently recorded';
  lockButton();renderReviewOptions();renderHistory();
})();
