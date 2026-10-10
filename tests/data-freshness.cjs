'use strict';
const fs=require('node:fs'),vm=require('node:vm');
const context=vm.createContext({window:{}});
vm.runInContext(fs.readFileSync('albion-data-r78.js','utf8'),context,{timeout:3000});
const d=context.window.ALBION_DATA_R66,now=Date.now(),issues=[];
const checked=Date.parse((d.fixtureCheckedISO||d.checkedISO)+'T12:00:00Z');
if(!Number.isFinite(checked))issues.push('Fixture review date missing');
else if((now-checked)/86400000>8)issues.push('Football data last reviewed over 7 days ago.');
const months={Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
for(const f of d.fixtures){
 const m=/^(\d{1,2}) ([A-Z][a-z]{2}) (20\d{2})$/.exec(f.date||'');
 if(!m||months[m[2]]==null)continue;
 const matchDayEnd=Date.UTC(Number(m[3]),months[m[2]],Number(m[1]),23,59);
 if(matchDayEnd<now && !(Number.isFinite(f.albionGoals)&&Number.isFinite(f.opponentGoals)) &&
 !/(postponed|cancelled|abandoned)/i.test(f.status||''))issues.push(f.date+' '+f.opponent+' lacks a result/status.');
}
const squadDate=Date.parse((d.squadCheckedISO||d.checkedISO)+'T12:00:00Z');
if(Number.isFinite(squadDate)&&(now-squadDate)/86400000>31)issues.push('Squad verification is over 30 days old.');
if(issues.length){for(const issue of issues)console.error('::error::'+issue);process.exitCode=1;}
else console.log('PASS: data review and past match results within freshness limits.');
