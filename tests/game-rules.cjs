'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const game=fs.readFileSync('shootout-r82.js','utf8');
const begin=game.indexOf('  function resultDecision() {');
const end=game.indexOf('  async function prepareAlbionKick()',begin);
assert(begin>0&&end>begin,'Penalty decision engine missing');
const scenarios=[
[{albionKicks:0,palaceKicks:0,albionGoals:0,palaceGoals:0},false,false,'opening'],
[{albionKicks:4,palaceKicks:3,albionGoals:4,palaceGoals:0},true,true,'early clinch'],
[{albionKicks:4,palaceKicks:3,albionGoals:1,palaceGoals:2},false,false,'Palace not yet clinched'],
[{albionKicks:5,palaceKicks:4,albionGoals:3,palaceGoals:2},false,false,'remaining Palace kick'],
[{albionKicks:5,palaceKicks:5,albionGoals:3,palaceGoals:3},false,false,'level after five'],
[{albionKicks:6,palaceKicks:5,albionGoals:4,palaceGoals:3},false,false,'sudden death incomplete pair'],
[{albionKicks:6,palaceKicks:6,albionGoals:4,palaceGoals:3},true,true,'Albion sudden-death win'],
[{albionKicks:6,palaceKicks:6,albionGoals:3,palaceGoals:4},true,false,'Palace sudden-death win'],
[{albionKicks:5,palaceKicks:5,albionGoals:1,palaceGoals:2},true,false,'Palace win after five'],
];
for(const [state,finished,albionWon,name] of scenarios){
 const decision=(new Function('state',game.slice(begin,end)+'\nreturn resultDecision;'))(state)();
 assert.equal(decision.finished,finished,name+': finished');
 if(finished)assert.equal(decision.albionWon,albionWon,name+': winner');
}
assert(game.includes('state.phase = "palace-prewhistle"'),'No pre-whistle phase');
assert(game.includes('state.phase = "palace-run"'),'No post-whistle dive phase');
assert(game.includes('state.phase !== "palace-run" || state.pendingDive'),'Early dives not whistle-gated');
assert(game.includes('shuffleKeeperOnLine(eventStagePoint(event));'),'Goalkeeper shuffling not wired');
console.log('PASS: 9 penalty decision scenarios, regulation and sudden death, whistle gating');
