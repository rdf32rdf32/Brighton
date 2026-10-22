'use strict';
const assert=require('node:assert/strict');
const live=require('../live-scores.js');
const fixture={date:'22 Oct 2026',opponent:'FK Jablonec',venue:'A',competition:'UEFA Conference League'};
const event={
  id:'999123',date:'2026-10-22T16:45:00Z',
  status:{type:{state:'in',completed:false,shortDetail:"65'"}},
  competitions:[{competitors:[
    {homeAway:'home',score:'1',team:{id:'999',displayName:'FK Jablonec',shortDisplayName:'Jablonec'}},
    {homeAway:'away',score:'2',team:{id:'331',displayName:'Brighton & Hove Albion',shortDisplayName:'Brighton'}}
  ]}]
};
const found=live.matchEvent({events:[event]},fixture);
assert(found,'Live game must be matched');
assert.equal(found.state,'live');
assert.equal(live.scoreText(found),'Jablonec 1–2 Albion');
assert.equal(live.fromEvent({...event,status:{type:{state:'post',completed:true}}},fixture).state,'final');
const scheduled=live.fromEvent({...event,status:{type:{state:'pre',completed:false}},
  competitions:[{competitors:event.competitions[0].competitors.map(x=>({...x,score:undefined}))}]},fixture);
assert.equal(scheduled.state,'upcoming');
assert.equal(live.scoreText(scheduled),'Jablonec v Albion');
assert.equal(live.matchEvent({events:[event]}, {...fixture,opponent:'Liverpool'}),null,'Do not show a wrong opponent score');
assert.equal(live.matchEvent({events:[{...event,date:'2026-10-23T16:45:00Z'}]},fixture),null,'Do not accept wrong day');
assert.equal(live.matchEvent({events:[{...event,competitions:[{competitors:[
  {...event.competitions[0].competitors[0],team:{id:'999',displayName:'Liverpool'}},
  event.competitions[0].competitors[1]
]}]}]},fixture),null,'No unrelated Brighton scores');
assert.equal(live.fromEvent({...event,status:{type:{state:'in'}},
  competitions:[{competitors:[{...event.competitions[0].competitors[0],score:null},event.competitions[0].competitors[1]]}]},fixture),null,'Missing scores cannot be invented');
const onDay=live.selectFixture([{...fixture},{date:'25 Oct 2026',opponent:'Liverpool',competition:'Premier League'}],new Date('2026-10-22T12:00:00Z'));
assert.equal(onDay.opponent,'FK Jablonec');
assert.equal(live.selectFixture([{...fixture}],new Date('2026-10-30T12:00:00Z')),null);
console.log('PASS: provider match validation, final/live/pre-game states and no invented scores');
