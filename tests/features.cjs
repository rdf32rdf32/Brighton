'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const script=fs.readFileSync('top-scorers.js','utf8');
const css=fs.readFileSync('top-scorers.css','utf8');
const ctx=vm.createContext({window:{}});
vm.runInContext(fs.readFileSync('albion-data-r78.js','utf8'),ctx,{timeout:3000});
const d=ctx.window.ALBION_DATA_R66;
new vm.Script(script,{filename:'top-scorers.js'});
const sections=['stats-centre','history-archive','xiUpgrade','xiReviewMatch','xiPlayerPalette','xiConfirmedPlayers'];
for(const id of sections)assert(html.includes('id="'+id+'"'),'Missing new section '+id);
for(const name of ['statsCompetition','statsKpis','statsTrend','statsCompetitionRows','archiveSearch','archiveEra','archiveEntryList','archiveFeature','xiPalettePosition','xiPaletteSearch','xiLockPrediction','xiCompareLineup','xiAccuracyHistory']){
  assert(html.includes('id="'+name+'"'),'Missing interactive control '+name);
}
assert(html.includes('href="#stats-centre"')&&html.includes('href="#history-archive"'),'Missing navigation shortcuts');
assert(html.includes('top-scorers.js?v=20261018-r96')&&html.includes('top-scorers.css?v=20261018-r96'),'Extension cache not refreshed');
const dates=d.fixtures.filter(f=>Number.isFinite(f.albionGoals)&&Number.isFinite(f.opponentGoals));
assert.equal(dates.length,12,'Completed match count');
const byComp=Object.groupBy(dates,f=>f.competition);
const expect={'Premier League':[7,23],'Carabao Cup':[1,3],'UEFA Conference League':[4,8],'FA Cup':[0,0]};
for(const [name,[count,goals]] of Object.entries(expect)){
  const games=byComp[name]||[];
  assert.equal(games.length,count,name+' match count');
  assert.equal(games.reduce((n,f)=>n+f.albionGoals,0),goals,name+' goals');
}
const total=dates.reduce((n,f)=>n+f.albionGoals,0);
assert.equal(total,34,'Recorded totals must reconcile');
assert.equal(d.scoring.players.reduce((n,p)=>n+p.premierLeague+p.carabaoCup+p.conferenceLeague+p.faCup,0)+
  Object.values(d.scoring.ownGoals).reduce((n,x)=>n+x,0),total,'Scorers and results disagree');
assert((script.match(/\[19\d\d,'|\[20\d\d,'/g)||[]).length>=12,'History needs at least twelve entries');
assert(html.includes('Creative Commons')&&html.includes('creativecommons.org/licenses/by-sa/2.0')&&html.includes('commons.wikimedia.org'),'Missing historical photo credits');
assert(script.includes('MutationObserver(renderPalette)'),'Drag palette does not survive pitch redraws');
assert(script.includes("select.dispatchEvent(new Event('change'"),'Pitch assignment must persist with the existing XI saver');
assert(script.includes('entry.correct=entry.starters.filter'),'Line-up accuracy calculation missing');
assert(script.includes('localStorage.getItem('),'Prediction history must be persisted locally');
assert(css.includes('.stats-kpi-grid')&&css.includes('.archive-photos')&&css.includes('.xi-player-chip'),'New responsive styles missing');
const assetPaths=[...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(m=>m[1].split('?')[0]).filter(p=>/\.(?:css|js)$/.test(p)&&!p.includes('://'));
assert(new Set(assetPaths).size<=9,'Too many active CSS/JS assets');
console.log('PASS: three r96 feature panels, goal/fixture integrity, player placement and history archive integration');
