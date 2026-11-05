'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8'),context=vm.createContext({window:{}});
vm.runInContext(fs.readFileSync('albion-data-r78.js','utf8'),context,{timeout:3000});
const d=context.window.ALBION_DATA_R66;
assert.equal(d.version,'r100');assert.equal(d.fixtureCheckedISO,'2026-11-05');assert.equal(d.squadCheckedISO,'2026-11-05');
const fixtures=d.fixtures,done=fixtures.filter(f=>Number.isFinite(f.albionGoals)&&Number.isFinite(f.opponentGoals));
const totals=done.reduce((s,f)=>{s.played++;s.gf+=f.albionGoals;s.ga+=f.opponentGoals;if(f.albionGoals>f.opponentGoals)s.w++;else if(f.albionGoals<f.opponentGoals)s.l++;else s.d++;return s;},{played:0,gf:0,ga:0,w:0,d:0,l:0});
assert.deepEqual(totals,{played:16,gf:38,ga:11,w:10,d:4,l:2});
function found(name,date,comp='Premier League'){const arr=fixtures.filter(f=>f.opponent===name&&f.date===date&&f.competition===comp);assert.equal(arr.length,1,'Missing fixture '+name+date);return arr[0]}
for(const f of [found('Manchester City','31 Oct 2026'),found('Getafe','5 Nov 2026','UEFA Conference League')]){assert.equal(f.status,'Full-time');assert.equal(f.result,'0–1');assert.equal(f.albionGoals,1);assert.equal(f.opponentGoals,0);assert.equal(f.resultOutcome,'W')}
const cup=found('Manchester City','28 Oct 2026','Carabao Cup');assert.equal(cup.resultOutcome,'L');assert.equal(cup.albionGoals,2);assert.equal(cup.opponentGoals,2);assert(cup.sourceUrl.startsWith('https://www.brightonandhovealbion.com/media-article/'));
for(const [name,date,time] of [['Brentford','8 Nov 2026','14:00'],['Hull City','22 Nov 2026','14:00'],['Newcastle United','29 Nov 2026','14:05'],['Bournemouth','2 Dec 2026','20:15'],['Nottingham Forest','5 Dec 2026','17:30'],['Everton','13 Dec 2026','14:00']])assert.equal(found(name,date).time,time);
const seen=new Set();for(const f of fixtures){const key=f.date+'|'+f.opponent+'|'+f.competition;assert(!seen.has(key),'Duplicate '+key);seen.add(key);if(f.time)assert(/^([01]\d|2[0-3]):[0-5]\d$/.test(f.time));assert.equal(Number.isFinite(f.albionGoals),Number.isFinite(f.opponentGoals))}
const squad=new Map(d.squad.filter(p=>p.active&&p.squadStatus==='first-team').map(p=>[p.name,p.number]));
for(const p of d.penaltyTakers)assert.equal(squad.get(p.name),p.number,'Invalid taker '+p.name);
assert(!d.penaltyTakers.some(p=>p.name==='Danny Welbeck'));
const playerGoals=d.scoring.players.reduce((n,p)=>n+p.premierLeague+p.carabaoCup+p.conferenceLeague+p.faCup,0),own=Object.values(d.scoring.ownGoals).reduce((n,x)=>n+x,0);
assert.equal(playerGoals+own,totals.gf,'Scorer and fixture goals differ');
for(const [id,value] of [['heroMatchTitle','Albion v Brentford'],['centreMatchTitle','Albion v Brentford'],['allCompPlayed','16'],['allCompGoals','38–11']])assert(html.includes('id="'+id+'">'+value+'<'),'Bad fallback '+id);
for(const [id,val] of [['dashboardOpponent','Brentford'],['predictorMatchTitle','Albion v Brentford'],['awayScoreLabel','Brentford goals'],['scorersMeta','35 player goals · 3 own goals · 38 Brighton goals']])assert(html.includes('id="'+id+'">'+val+'<'),'Stale fallback '+id);
assert(html.includes('albion-data-r78.js?v=20261105-r100'));assert(html.includes('shootout-r82.js?v=20261105-r100'));assert(html.includes('app-r77.js?v=20261105-r100'));
const app=fs.readFileSync('app-r77.js','utf8');assert(app.includes('fx.reportUrl || fx.sourceUrl'));
console.log('PASS: verified 16 results, 38–11, match centre, squad and shoot-out regression checks');
