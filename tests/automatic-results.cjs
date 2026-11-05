'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const sync=require('../scripts/automate-results.cjs');
const read=n=>fs.readFileSync(n,'utf8');
const html=read('index.html');
const s=html.indexOf('albion-data-r78.js?v=');
const a=html.indexOf('auto-results.js?v=');
const p=html.indexOf('app-r77.js?v=');
assert(s>=0 && s<a && a<p,'Automatic results must load after the baseline and before the app');
const ctx=vm.createContext({window:{}});
vm.runInContext(read('albion-data-r78.js'),ctx);
const baseline=ctx.window.ALBION_DATA_R66;
const initialCount=baseline.fixtures.filter(x=>Number.isFinite(x.albionGoals)).length;
vm.runInContext(read('auto-results.js'),ctx);
assert.equal(ctx.window.ALBION_DATA_R66,baseline,'Empty overlay must leave verified records unchanged');
const away={date:'8 Nov 2026',opponent:'Brentford',venue:'H',competition:'Premier League'};
const event={id:'123456789',date:'2026-11-08T14:00:00Z',
 status:{type:{state:'post',completed:true}},competitions:[{competitors:[
  {homeAway:'home',score:'2',team:{id:'331',displayName:'Brighton & Hove Albion'}},
  {homeAway:'away',score:'1',team:{id:'337',displayName:'Brentford'}}
 ]}]};
assert.equal(sync.validate(event,away).albionGoals,2);
assert.equal(sync.validate(event,{...away,venue:'A'}),null,'Wrong venue must be rejected');
assert.equal(sync.validate({...event,status:{type:{state:'in',completed:false}}},away),null,
  'Live scores must never be recorded as final');
assert.equal(sync.validate({...event,date:'2026-11-09T14:00:00Z'},away),null,
  'Wrong-day match must never be recorded');
const goals=sync.parseScorers([
 {scoringPlay:true,type:{text:'Goal'},team:{id:'331'},athletesInvolved:[{displayName:'Pascal Groß'}]},
 {scoringPlay:true,type:{text:'Own Goal'},team:{id:'331'},ownGoal:true}
],2);
assert.deepEqual(goals,[{name:'Pascal Groß'},{ownGoal:true}]);
assert.equal(sync.parseScorers([],2),null,'Incomplete scorer list cannot be published');
const record={...away,eventId:'123456789',albionGoals:2,opponentGoals:1,
 checkedISO:'2026-11-08',scorers:goals};
const output=sync.render([record]);
new vm.Script(output);
const approved=vm.createContext({window:{}});
vm.runInContext(read('albion-data-r78.js'),approved);
vm.runInContext(output,approved);
const next=approved.window.ALBION_DATA_R66;
assert.notEqual(next,baseline);
assert.equal(next.fixtures.filter(x=>Number.isFinite(x.albionGoals)).length,initialCount+1);
const liverpool=next.fixtures.find(f=>f.opponent==='Brentford' && f.date==='8 Nov 2026');
assert.equal(liverpool.result,'2–1');
assert.equal(liverpool.resultOutcome,'W');
assert.equal(liverpool.albionGoals,2);
assert.equal(liverpool.opponentGoals,1);
assert.equal(next.scoring.players.find(p=>p.name==='Pascal Groß').premierLeague,
 baseline.scoring.players.find(p=>p.name==='Pascal Groß').premierLeague+1);
assert.equal(next.scoring.ownGoals.premierLeague,baseline.scoring.ownGoals.premierLeague+1);
assert.equal(baseline.fixtures.find(f=>f.date==='8 Nov 2026').albionGoals,undefined,
 'Manual baseline cannot be mutated');
const incompleteCode=sync.render([{...record,scorers:null}]);
const other=vm.createContext({window:{}});
vm.runInContext(read('albion-data-r78.js'),other);
vm.runInContext(incompleteCode,other);
assert.equal(other.window.ALBION_DATA_R66.scoring.automaticPending,true);
assert.equal(other.window.ALBION_DATA_R66.scoring.checkedISO,baseline.scoring.checkedISO);
assert(html.includes('auto-results.js?v=20261105-synced'),'Cache tag missing');
assert(read('.github/workflows/automatic-results.yml').includes('schedule:'));
console.log('PASS: automated records, final-only safeguards, venue/date checks, own goals, scorer fallback and immutable archive');
