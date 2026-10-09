'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const ctx=vm.createContext({window:{}});
vm.runInContext(fs.readFileSync('albion-data-r78.js','utf8'),ctx,{timeout:3000});
const d=ctx.window.ALBION_DATA_R66;
assert(d&&Array.isArray(d.fixtures)&&d.fixtures.length>20);
const checked=Date.parse(d.checkedISO+'T12:00:00Z');
assert(Number.isFinite(checked),'Invalid football data date');
const seen=new Set();
for(const f of d.fixtures){
  const key=f.date+'|'+f.opponent+'|'+f.competition;
  assert(!seen.has(key),'Duplicate fixture '+key);
  seen.add(key);assert(['H','A'].includes(f.venue),'Invalid venue '+key);
  assert(Number.isFinite(f.albionGoals)===Number.isFinite(f.opponentGoals),'Partial result '+key);
}
const age=Math.max(0,Math.floor((Date.now()-checked)/86400000));
if(age>14)console.warn('WARNING: manual fixture/squad data '+age+' days old; check official club records.');
console.log('PASS: '+d.fixtures.length+' unique fixtures, reviewed '+d.checkedISO);
