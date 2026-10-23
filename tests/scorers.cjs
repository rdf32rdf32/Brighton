'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = vm.createContext({window:{}});
const data = fs.readFileSync('albion-data-r78.js','utf8');
vm.runInContext(data,context,{timeout:3000});
new vm.Script(fs.readFileSync('top-scorers.js','utf8'),{filename:'top-scorers.js'});
const d=context.window.ALBION_DATA_R66;
const s=d.scoring;
assert(s && s.season==='2026/27' && s.checkedISO==='2026-10-23','Scorer version/date missing');
assert(s.players.length>=15,'Missing goal scorers');
const keys=['premierLeague','carabaoCup','conferenceLeague','faCup'];
const names=new Set();
let playerGoals=0;
for(const player of s.players){
  assert(!names.has(player.name),'Duplicate scorer '+player.name);
  names.add(player.name);
  for(const key of keys){
    assert(Number.isInteger(player[key])&&player[key]>=0,'Invalid goal count '+player.name+' '+key);
    playerGoals+=player[key];
  }
}
const completed=d.fixtures.filter(f=>Number.isFinite(f.albionGoals)&&Number.isFinite(f.opponentGoals));
const map={'Premier League':'premierLeague','Carabao Cup':'carabaoCup','EFL Cup':'carabaoCup','UEFA Conference League':'conferenceLeague','FA Cup':'faCup'};
for(const key of keys){
  const scored=s.players.reduce((n,p)=>n+p[key],0)+(s.ownGoals[key]||0);
  const recorded=completed.filter(f=>map[f.competition]===key).reduce((n,f)=>n+f.albionGoals,0);
  assert.equal(scored,recorded,key+' goals do not match recorded match totals');
}
const own=keys.reduce((n,k)=>n+(s.ownGoals[k]||0),0);
assert.equal(playerGoals,31,'Player-scored goals should be 31');
assert.equal(own,3,'Three own goals, excluded from individual totals');
assert.equal(playerGoals+own,34,'Total should reconcile with recorded 34 Brighton goals');
const sum=p=>keys.reduce((n,k)=>n+p[k],0);
assert.equal(Math.max(...s.players.map(sum)),5,'All-competition goal leader must have five');
assert.equal(s.players.find(p=>p.name==='Charalampos Kostoulas').premierLeague,3,'Palace Kostoulas league goal missing');
assert.equal(s.players.find(p=>p.name==='Diego Gómez').premierLeague,1,'Palace Gómez goal missing');
assert.equal(s.players.find(p=>p.name==='Yasin Ayari').premierLeague,2,'Palace Ayari goal missing');
assert.equal(s.players.find(p=>p.name==='Jack Hinshelwood').premierLeague,3,'Palace Hinshelwood goal missing');
const html=fs.readFileSync('index.html','utf8');
assert(html.includes('id="top-scorers"')&&html.includes('id="scorersRows"'),'Scorer section not present');
assert(html.includes('href="#top-scorers"'),'Scorers not linked in navigation');
assert(html.includes('top-scorers.css?v=20261018-r96')&&html.includes('top-scorers.js?v=20261018-r96'),'Scorer assets missing');
console.log('PASS: '+s.players.length+' scorers, 31 player goals, 3 own goals, all competitions reconcile');
