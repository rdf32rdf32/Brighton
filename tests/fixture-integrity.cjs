'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const context=vm.createContext({window:{}});
vm.runInContext(fs.readFileSync('albion-data-r78.js','utf8'),context,{timeout:3000});
const d=context.window.ALBION_DATA_R66;
assert(d.version==='r98' && d.fixtureCheckedISO==='2026-10-23','Latest football release metadata is stale');
assert(d.squadCheckedISO==='2026-10-15','Fixture review must not falsely advance independent squad review');
const fixtures=d.fixtures;
const completed=fixtures.filter(f=>Number.isFinite(f.albionGoals)&&Number.isFinite(f.opponentGoals));
const totals=completed.reduce((s,f)=>{
  s.played++;s.goalsFor+=f.albionGoals;s.goalsAgainst+=f.opponentGoals;
  if(f.albionGoals>f.opponentGoals)s.wins++;else if(f.albionGoals<f.opponentGoals)s.losses++;else s.draws++;
  return s;
},{played:0,goalsFor:0,goalsAgainst:0,wins:0,draws:0,losses:0});
assert.deepEqual(totals,{played:12,goalsFor:34,goalsAgainst:7,wins:8,draws:3,losses:1});
const found=(name,date,competition='Premier League')=>{
  const fixture=fixtures.find(f=>f.opponent===name&&f.date===date&&f.competition===competition);
  assert(fixture,'Missing '+name+' on '+date);
  return fixture;
};
const draw=found('FK Jablonec','22 Oct 2026','UEFA Conference League');
assert.equal(draw.result,'0–0');
assert.equal(draw.status,'Full-time');
assert.equal(draw.resultOutcome,'D');
assert.equal(draw.homeScore,0);
assert.equal(draw.awayScore,0);
assert(/^https:\/\/www\.brightonandhovealbion\.com\/media-article\//.test(draw.reportUrl),'Missing official report');
const next=found('Liverpool','25 Oct 2026');
assert.equal(next.venue,'A');
assert.equal(next.time,'14:00');
assert(!('albionGoals' in next),'An unplayed match must not have a score');
for(const [name,date,time] of [
  ['Brentford','8 Nov 2026','14:00'],
  ['Hull City','22 Nov 2026','14:00'],
  ['Newcastle United','29 Nov 2026','14:05']
]){
  const f=found(name,date);
  assert.equal(f.time,time,'Incorrect rescheduled kick-off for '+name);
}
const seen=new Set();
for(const f of fixtures){
  const key=f.date+'|'+f.opponent+'|'+f.competition;
  assert(!seen.has(key),'Duplicate fixture '+key);
  seen.add(key);
  if(f.time)assert(/^([01]\d|2[0-3]):[0-5]\d$/.test(f.time),'Invalid kick-off time for '+key);
}
assert(html.includes('id="heroMatchTitle">Liverpool v Albion<'),'Incorrect non-JS hero fallback');
assert(html.includes('id="centreMatchTitle">Liverpool v Albion<'),'Incorrect match centre fallback');
assert(html.includes('id="allCompPlayed">12<'),'Incorrect static played count');
assert(html.includes('id="allCompDrawn">3<'),'Incorrect static draw count');
assert(html.includes('id="nextHomeDate">8 Nov 2026'),'Outdated next-home fallback');
assert(html.includes('albion-data-r78.js?v=20261023-r98'),'Fixture-data cache version missing');
assert(html.includes('app-r77.js?v=20261023-r98'),'Result report link fix must bust cached app script');
const app=fs.readFileSync('app-r77.js','utf8');
assert(app.includes('fx.reportUrl || fx.sourceUrl'),'Report links must support both source field names');
console.log('PASS: 12 verified results, next Liverpool, three rescheduled November dates and consistent static/dynamic UI');
