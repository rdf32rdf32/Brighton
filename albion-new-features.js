/* R110 — independent supporter features; no external libraries. */
(() => {
'use strict';
const $=id=>document.getElementById(id);
const node=(tag,value)=>{const el=document.createElement(tag);if(value!==undefined)el.textContent=value;return el;};
const dayKey=()=>{const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(p=>[p.type,p.value]));return [parts.year,parts.month,parts.day].join('-');};
/* Standings: never infer ranks or substitute a previous season. */
function parseTable(payload) {
  const groups=[];
  function visit(x){if(!x||typeof x!=='object')return;if(Array.isArray(x.standings?.entries))groups.push(x.standings.entries);if(Array.isArray(x.children))x.children.forEach(visit);}
  visit(payload);
  if(Array.isArray(payload?.entries))groups.push(payload.entries);
  for(const entries of groups){
    if(entries.length!==36)continue;
    const rows=entries.map(e=>{
      const stats=Array.isArray(e.stats)?e.stats:[];
      const get=(...names)=>{const s=stats.find(s=>names.includes(s.name)||names.includes(s.abbreviation));const v=s?.value??s?.displayValue;return v===null||v===undefined||v===''?NaN:Number(v);};
      const name=e.team?.displayName||e.team?.name;
      return {name,id:String(e.team?.id||''),rank:get('rank','position','RK'),played:get('gamesPlayed','matchesPlayed','GP','P'),wins:get('wins','W'),draws:get('ties','draws','D'),losses:get('losses','L'),gd:get('pointDifferential','goalDifference','GD'),points:get('points','PTS','PCTPTS')};
    });
    if(rows.every(r=>typeof r.name==='string'&&r.name.trim()&&Number.isInteger(r.rank)&&r.rank>=1&&r.rank<=36&&Number.isInteger(r.played)&&r.played>=0&&r.played<=6&&Number.isInteger(r.points)&&r.points>=0&&r.points<=18)&&new Set(rows.map(r=>r.rank)).size===36&&rows.some(r=>r.id==='331'||/brighton/i.test(r.name)))return rows.sort((a,b)=>a.rank-b.rank);
  }
  return null;
}
const tableBody=$('euroTableBody'),euroStatus=$('euroStatus'),euroRefresh=$('euroRefresh');
if(tableBody&&euroStatus&&euroRefresh){
  let busy=false,lastGood=null;
  async function refresh(){
    if(busy)return;busy=true;euroRefresh.disabled=true;euroStatus.textContent='Checking the 2026/27 league-phase table…';
    const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),10000);
    try{
      const response=await fetch('https://site.api.espn.com/apis/v2/sports/soccer/uefa.europa.conf/standings?season=2026',{signal:ctl.signal,cache:'no-store',credentials:'omit'});
      if(!response.ok)throw Error('Unavailable');
      const payload=await response.json();
      if(payload.season?.year!=null&&Number(payload.season.year)!==2026)throw Error('Wrong season');
      const rows=parseTable(payload);if(!rows)throw Error('No validated 36-team table');
      const frag=document.createDocumentFragment();
      for(const r of rows){
        const tr=node('tr');tr.className=r.rank<=8?'zone-top':r.rank<=24?'zone-playoff':'zone-out';
        if(r.id==='331'||/brighton/i.test(r.name))tr.classList.add('albion-row');
        [r.rank,r.name,r.played,r.wins,r.draws,r.losses,r.gd,r.points].forEach((v,i)=>{const cell=node(i===1?'th':'td',typeof v==='number'&&!Number.isFinite(v)?'—':String(v));if(i===1)cell.scope='row';tr.append(cell);});frag.append(tr);
      }
      tableBody.replaceChildren(frag);$('euroTableWrap').hidden=false;
      const albion=rows.find(r=>r.id==='331'||/brighton/i.test(r.name));
      lastGood=new Date();
      euroStatus.textContent='Albion: '+albion.rank+' of 36 · '+albion.points+' points · Checked '+lastGood.toLocaleString('en-GB',{timeZone:'Europe/London'})+' UK (ESPN)';
    }catch(_){euroStatus.textContent=lastGood?'Refresh unavailable. Showing last successful check: '+lastGood.toLocaleString('en-GB',{timeZone:'Europe/London'})+' UK.':'Automatic standings unavailable. Use the official UEFA standings link.';}
    finally{clearTimeout(timer);busy=false;euroRefresh.disabled=false;}
  }
  euroRefresh.addEventListener('click',refresh);
  if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();refresh();}});observer.observe($('european-standings'));}else refresh();
  setInterval(()=>{if(!document.hidden&&euroStatus.textContent!=='Standings load when you reach this section.')refresh();},300000);
}
/* Daily challenge: curated historical clues, deterministic UK date, local-only score. */
const quiz=$('guessOptions');
if(quiz){
 const bank=[
 ['Lewis Dunk','England','Centre-back','Came through Brighton’s academy and captained Albion in their first European campaign.'],
 ['Glenn Murray','England','Striker','Played for both Brighton and Crystal Palace; scored 20+ league goals in the 2016/17 promotion season.'],
 ['Pascal Groß','Germany','Midfielder','Joined from Ingolstadt in 2017 and scored Albion’s first Premier League goal.'],
 ['Kaoru Mitoma','Japan','Winger','Joined from Kawasaki Frontale and spent a season on loan at Union Saint-Gilloise.'],
 ['Moisés Caicedo','Ecuador','Midfielder','Joined from Independiente del Valle and later moved to Chelsea.'],
 ['Alexis Mac Allister','Argentina','Midfielder','Won the 2022 World Cup while an Albion player; later joined Liverpool.'],
 ['Solly March','England','Winger','Joined Albion from Lewes and helped secure promotion to the Premier League in 2017.'],
 ['Bobby Zamora','England','Striker','Scored prolifically for Brighton at Withdean before playing for Tottenham, West Ham and Fulham.'],
 ['Peter Ward','England','Striker','A Goldstone Ground hero who joined Brighton from Burton Albion in 1975.'],
 ['Gordon Smith','Scotland','Forward','Scored for Brighton in the 1983 FA Cup final against Manchester United.'],
 ['Bruno Saltor','Spain','Right-back','Joined Brighton from Valencia in 2012 and captained the side during promotion to the Premier League.'],
 ['Anthony Knockaert','France','Winger','Joined from Standard Liège and was named Championship Player of the Season in 2016/17.'],
 ['Neal Maupay','France','Striker','Joined Albion from Brentford in 2019 and later moved to Everton.'],
 ['Leandro Trossard','Belgium','Winger','Joined from Genk and later moved to Arsenal.'],
 ['Marc Cucurella','Spain','Defender','Joined from Getafe, won Albion’s player of the season award and moved to Chelsea.'],
 ['Ben White','England','Defender','Spent a promotion-winning loan season at Leeds before moving from Brighton to Arsenal.'],
 ['Robert Sánchez','Spain','Goalkeeper','Developed at Brighton and had loan spells at Forest Green and Rochdale before moving to Chelsea.'],
 ['Mathew Ryan','Australia','Goalkeeper','Joined from Valencia in 2017 and was Albion’s first-choice keeper in their first Premier League season.'],
 ['Dale Stephens','England','Midfielder','Joined from Charlton and played a major role in the 2016/17 promotion campaign.'],
 ['Steve Sidwell','England','Midfielder','Returned to Brighton from Stoke and scored a famous long-range goal at Bristol City in 2016.'],
 ['Craig Mackail-Smith','Scotland','Striker','Joined Brighton from Peterborough in 2011 as the Amex era began.'],
 ['Adam Lallana','England','Midfielder','Joined Albion after winning the Premier League with Liverpool.'],
 ['Danny Welbeck','England','Striker','Played for Manchester United and Arsenal before joining Brighton in 2020.'],
 ['Shane Duffy','Republic of Ireland','Centre-back','Joined from Blackburn and partnered Lewis Dunk during Brighton’s promotion season.']
 ];
 const key='albionDailyPlayerR109',date=dayKey();
 const parts=date.match(/\d+/g).map(Number);
 const serial=parts[0]>1900?Math.floor(Date.UTC(parts[0],parts[1]-1,parts[2])/86400000):Math.floor(Date.now()/86400000);
 const index=((serial%bank.length)+bank.length)%bank.length;
 const answer=bank[index],options=[answer[0],bank[(index+5)%bank.length][0],bank[(index+11)%bank.length][0],bank[(index+17)%bank.length][0]];
 for(let i=options.length-1;i>0;i--){const j=(serial+index+i*13)%(i+1);[options[i],options[j]]=[options[j],options[i]];}
 let state={date,choice:null,played:0,wins:0,last:''};
 try{const stored=JSON.parse(localStorage.getItem(key)||'null');if(stored&&Number.isInteger(stored.played)&&Number.isInteger(stored.wins)){state={...state,played:Math.max(0,stored.played),wins:Math.max(0,stored.wins),last:stored.last||'',choice:stored.date===date&&options.includes(stored.choice)?stored.choice:null};}}catch(_){}
 $('guessDate').textContent=date+' · New challenge at midnight UK time';
 const clues=$('guessClues');[answer[1],answer[2],answer[3]].forEach((clue,i)=>clues.append(node('li',['Nationality: ','Position: ','Career clue: '][i]+clue)));
 function update(){
   $('guessRecord').textContent=state.wins+' correct from '+state.played+' daily challenges on this device.';
   $('guessStatus').textContent=state.choice?(state.choice===answer[0]?'Correct! ':'Not quite. ' )+'The answer is '+answer[0]+'. Return tomorrow for a new challenge.':'Choose the player who matches all three clues.';
   for(const b of quiz.querySelectorAll('button')){b.disabled=Boolean(state.choice);b.setAttribute('aria-pressed',String(b.textContent===state.choice));}
 }
 for(const name of options){const b=node('button',name);b.type='button';b.className='ghost';b.addEventListener('click',()=>{if(state.choice)return;state.choice=name;state.played++;if(name===answer[0])state.wins++;state.last=date;try{localStorage.setItem(key,JSON.stringify(state));}catch(_){}update();});quiz.append(b);}
 update();
}
if(typeof module!=='undefined'&&module.exports)module.exports={parseTable};
})();
