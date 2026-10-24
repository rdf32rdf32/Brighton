'use strict';
// Scheduled scoreboard updater. Unofficial ESPN API: never fabricate a final result.
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const live = require('../live-scores.js'), root = path.resolve(__dirname,'..');
const leagues = {'Premier League':'eng.1','Carabao Cup':'eng.league_cup',
  'EFL Cup':'eng.league_cup','UEFA Conference League':'uefa.europa.conf','FA Cup':'eng.fa'};
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const today = () => new Date().toISOString().slice(0,10);
const key = f => [f.date,f.competition,f.venue,f.opponent].join('|');
const completed = f => Number.isFinite(f.albionGoals) && Number.isFinite(f.opponentGoals);
function validate(event,fixture) {
  if (!event || event.status?.type?.completed !== true ||
      event.status?.type?.state !== 'post' || !/^\d{6,15}$/.test(String(event.id||''))) return null;
  const players=event.competitions?.[0]?.competitors;
  const albion=players?.find(c => live.isAlbion(c.team));
  if (!albion || albion.homeAway !== (fixture.venue==='H'?'home':'away')) return null;
  const matching=live.matchEvent({events:[event]},fixture);
  if (!matching || matching.state!=='final') return null;
  const ag=Number(fixture.venue==='H'?matching.homeScore:matching.awayScore);
  const og=Number(fixture.venue==='H'?matching.awayScore:matching.homeScore);
  if (![ag,og].every(n=>Number.isInteger(n)&&n>=0&&n<=25)) return null;
  return {eventId:String(event.id),albionGoals:ag,opponentGoals:og};
}
function parseScorers(items,goals) {
  if (goals===0) return [];
  if (!Array.isArray(items)) return null;
  const result=[];
  for (const entry of items) {
    const label=String(entry.type?.text||entry.type?.displayName||entry.type?.name||entry.description||'');
    if (entry.scoringPlay!==true && !/^(?:goal|penalty goal|own goal|penalty kick goal)\b/i.test(label)) continue;
    if (String(entry.team?.id||entry.scoringTeam?.id||'')!=='331') continue;
    if (entry.ownGoal===true||entry.type?.name==='ownGoal'||/own.goal/i.test(label)) {
      result.push({ownGoal:true});continue;
    }
    const p=entry.athletesInvolved?.[0]||entry.participants?.[0]?.athlete||entry.athlete||entry.scorer;
    const name=String(p?.displayName||p?.fullName||p?.name||'').trim();
    if (!/^[\p{L}][\p{L}\p{M}\p{Zs}.'’\-]{3,75}$/u.test(name)||!name.includes(' ')) return null;
    result.push({name});
  }
  return result.length===goals?result:null;
}
async function fetchJson(url) {
  const response=await fetch(url,{signal:AbortSignal.timeout(15000),
    headers:{'Accept':'application/json'}});
  if (!response.ok) throw new Error('HTTP '+response.status);
  return response.json();
}
function scoreboard(f) {
  const day=live.parseFixtureDay(f.date);
  if (day===null) throw new Error('Invalid date');
  return 'https://site.api.espn.com/apis/site/v2/sports/soccer/'+leagues[f.competition]+
    '/scoreboard?dates='+new Date(day).toISOString().slice(0,10).replace(/-/g,'')+'&limit=150';
}
async function lookup(f) {
  const url=scoreboard(f);
  const first=await fetchJson(url);
  const ev=(first.events||[]).find(e=>validate(e,f));
  const result=validate(ev,f);
  if (!result) return null;
  const second=await fetchJson(url);
  const again=(second.events||[]).find(e=>String(e.id)===result.eventId);
  if (JSON.stringify(validate(again,f))!==JSON.stringify(result)) return null;
  let scorers=null;
  if (result.albionGoals===0) scorers=[];
  else {
    const sources=[again.competitions?.[0]?.details,again.details];
    try {
      const info=await fetchJson('https://site.api.espn.com/apis/site/v2/sports/soccer/'+
        leagues[f.competition]+'/summary?event='+result.eventId);
      sources.push(info.scoringPlays,info.header?.competitions?.[0]?.details,
        info.details,info.plays?.scoringPlays);
    } catch(err) { console.warn('Scorer provider unavailable: '+err.message); }
    for (const source of sources) {
      const found=parseScorers(source,result.albionGoals);
      if (found!==null) {scorers=found;break;}
    }
  }
  return Object.assign({},f,result,{checkedISO:today(),scorers});
}
function render(records) {
  const source=read('auto-results.js');
  const re=/\/\* RESULTS_START \*\/[\s\S]*?\/\* RESULTS_END \*\//;
  if (!re.test(source)) throw new Error('Missing overlay markers');
  return source.replace(re,'/* RESULTS_START */\nconst changes = '+JSON.stringify(records,null,2)+';\n/* RESULTS_END */');
}
async function main() {
  const ctx=vm.createContext({window:{}});
  vm.runInContext(read('albion-data-r78.js'),ctx,{timeout:3000});
  const saved=JSON.parse(read('auto-results.json'));
  if (!Array.isArray(saved)) throw new Error('Invalid saved results');
  const existing=new Map(saved.map(r=>[key(r),r]));
  const t=Date.parse(today()+'T00:00:00Z');
  const fixtures=ctx.window.ALBION_DATA_R66.fixtures.filter(f=>{
    const date=live.parseFixtureDay(f.date),prev=existing.get(key(f));
    return leagues[f.competition]&&!completed(f)&&date!==null&&date<=t&&date>=t-7*86400000&&
      (!prev||prev.scorers===null);
  });
  let updated=0, errors=0;
  for(const f of fixtures) {
    try {
      const result=await lookup(f),prior=existing.get(key(f));
      if (!result) {console.log('Pending verification: '+f.date+' '+f.opponent);continue;}
      if (prior&&(result.albionGoals!==prior.albionGoals||
                  result.opponentGoals!==prior.opponentGoals)) {
        console.error('Conflicting score requires review: '+key(f));errors++;continue;
      }
      if (!prior||(prior.scorers===null&&result.scorers!==null)) {
        existing.set(key(f),result);updated++;
        console.log('Confirmed '+f.opponent+': '+result.albionGoals+'–'+result.opponentGoals+
          (result.scorers===null?' (scorers pending)':' (scorers confirmed)'));
      }
    } catch(err) {errors++;console.error('Feed error for '+f.opponent+': '+err.message);}
  }
  if (updated) {
    const records=[...existing.values()].sort((a,b)=>key(a).localeCompare(key(b)));
    const output=render(records);
    new vm.Script(output);
    fs.writeFileSync(path.join(root,'auto-results.json'),JSON.stringify(records,null,2)+'\n');
    fs.writeFileSync(path.join(root,'auto-results.js'),output);
  }
  console.log('Automatic updates: '+updated+'; provider errors: '+errors);
  if (errors&&!updated) process.exitCode=1;
}
module.exports={validate,parseScorers,render,key};
if(require.main===module) main().catch(err=>{console.error(err);process.exitCode=1;});
