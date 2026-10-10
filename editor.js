(() => {
"use strict";
const source=window.ALBION_DATA_R66;
const $=id=>document.getElementById(id);
if(!source||!Array.isArray(source.fixtures)||!Array.isArray(source.squad)){
 $("editorStatus").textContent="Could not load the live data file.";return;
}
const original=JSON.parse(JSON.stringify(source));
const add=(row,type,field,value,label,attributes={})=>{
 const td=document.createElement("td"),input=document.createElement(type);
 input.dataset.field=field;input.setAttribute("aria-label",label);
 if(type==="input"){
  input.type=attributes.type||"text";
  if(input.type==="checkbox")input.checked=Boolean(value);
  else input.value=value==null?"":String(value);
  if(input.type==="number"){input.min="0";input.max="99";}
 }else{
  for(const val of attributes.values||[]){const opt=document.createElement("option");opt.value=val;opt.textContent=val;input.append(opt);}
  input.value=value;
 }
 td.append(input);row.append(td);return input;
};
$("checkedISO").value=source.fixtureCheckedISO||source.checkedISO;
$("squadCheckedISO").value=source.squadCheckedISO||source.checkedISO;
source.fixtures.forEach((f,i)=>{
 const row=document.createElement("tr");row.dataset.index=i;
 add(row,"input","date",f.date,"Date row "+(i+1));
 add(row,"input","opponent",f.opponent,"Opponent row "+(i+1));
 add(row,"select","venue",f.venue,"Venue row "+(i+1),{values:["H","A"]});
 add(row,"input","time",f.time||"","UK kick-off row "+(i+1));
 add(row,"input","albionGoals",Number.isFinite(f.albionGoals)?f.albionGoals:null,"Albion goals row "+(i+1),{type:"number"});
 add(row,"input","opponentGoals",Number.isFinite(f.opponentGoals)?f.opponentGoals:null,"Opponent goals row "+(i+1),{type:"number"});
 $("fixtureRows").append(row);
});
source.squad.forEach((p,i)=>{
 const row=document.createElement("tr");row.dataset.index=i;
 add(row,"input","number",p.number,"Shirt number row "+(i+1),{type:"number"});
 add(row,"input","name",p.name,"Player name row "+(i+1));
 add(row,"select","position",p.position,"Position row "+(i+1),{values:["Goalkeeper","Defender","Midfielder","Forward"]});
 add(row,"input","active",p.active!==false,"Active row "+(i+1),{type:"checkbox"});
 $("squadRows").append(row);
});
const val=(row,field)=>row.querySelector('[data-field="'+field+'"]');
function build(){
 const d=JSON.parse(JSON.stringify(original)),errors=[];
 d.checkedISO=$("checkedISO").value;d.fixtureCheckedISO=d.checkedISO;d.squadCheckedISO=$("squadCheckedISO").value;
 for(const key of ["checkedISO","squadCheckedISO"]){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d[key])||!Number.isFinite(Date.parse(d[key]+"T12:00:00Z")))errors.push("Invalid "+key);
 }
 if(!errors.length){
  d.checked=new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(d.checkedISO+"T12:00:00Z"));
 }
 for(const row of $("fixtureRows").querySelectorAll("tr")){
  const i=Number(row.dataset.index),f=d.fixtures[i],previous=original.fixtures[i];
  for(const field of ["date","opponent","venue","time"])f[field]=val(row,field).value.trim();
  const a=val(row,"albionGoals").value.trim(),b=val(row,"opponentGoals").value.trim();
  if(!/^\d{1,2} [A-Z][a-z]{2} 20\d{2}$/.test(f.date)||!f.opponent||!["H","A"].includes(f.venue))errors.push("Invalid fixture row "+(i+1));
  if(f.time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(f.time))errors.push("Invalid kick-off row "+(i+1));
  if((a==="")!==(b==="")||[a,b].some(x=>x!==""&&(!/^\d+$/.test(x)||Number(x)>30)))errors.push("Invalid score row "+(i+1));
  if(a!==""&&b!==""){
   f.albionGoals=Number(a);f.opponentGoals=Number(b);
   f.result=f.venue==="H"?a+"-"+b:b+"-"+a;
   f.homeScore=f.venue==="H"?Number(a):Number(b);
   f.awayScore=f.venue==="H"?Number(b):Number(a);
   f.status="Full-time";
  }else{
   delete f.albionGoals;delete f.opponentGoals;delete f.result;delete f.homeScore;delete f.awayScore;
   if(previous.status==="Full-time")f.status="Fixture scheduled";
  }
 }
 for(const row of $("squadRows").querySelectorAll("tr")){
  const i=Number(row.dataset.index),p=d.squad[i];
  p.name=val(row,"name").value.trim();p.position=val(row,"position").value;
  p.number=val(row,"number").value===""?null:Number(val(row,"number").value);
  p.active=val(row,"active").checked;
  if(!p.name)errors.push("Missing player name row "+(i+1));
 }
 return {d,errors};
}
function validate(){
 const o=build();
 $("editorStatus").textContent=o.errors.length?"Please correct: "+o.errors.join("; "):"Validation passed: "+o.d.fixtures.length+" fixtures and "+o.d.squad.length+" player records.";
 return o;
}
$("validateContent").addEventListener("click",validate);
$("downloadContent").addEventListener("click",()=>{
 const {d,errors}=validate();if(errors.length)return;
 const content="// Albion Fan Hub current manual football data.\nwindow.ALBION_DATA_R66 = Object.freeze("+JSON.stringify(d,null,2)+");\n";
 const url=URL.createObjectURL(new Blob([content],{type:"text/javascript"}));
 const link=document.createElement("a");link.href=url;link.download="albion-data-r78.js";document.body.append(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),2000);
 $("editorStatus").textContent="Downloaded active data file; commit to GitHub and verify deployment.";
});
$("editorStatus").textContent="Loaded "+source.fixtures.length+" fixtures and "+source.squad.length+" squad records.";
})();