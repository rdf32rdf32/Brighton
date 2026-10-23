// Security regression checks for the publicly accessible, static Albion Fan Hub.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=name=>fs.readFileSync(name,'utf8');
const pages=['index.html','editor.html'];
for(const name of pages){
  const markup=read(name);
  const match=markup.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i);
  assert(match,'Missing CSP on '+name);
  const policy=match[1];
  for(const directive of ["default-src 'self'","script-src 'self'","object-src 'none'","base-uri 'self'","frame-src 'none'","form-action 'self'"]){
    assert(policy.includes(directive),name+': missing '+directive);
  }
  assert(!policy.includes("'unsafe-eval'"),name+': unsafe-eval is forbidden');
  assert(!/script-src[^;]*'unsafe-inline'/.test(policy),name+': inline scripts should stay disallowed');
  assert(!/\son(?:click|load|submit|change|error)\s*=/i.test(markup),name+': inline event handlers are not allowed');
  assert(!/<script\b(?![^>]*\bsrc=)[^>]*>/i.test(markup),name+': unreviewed inline script');
  for(const [,url] of markup.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/gi)){
    assert(!/^https?:|^\/\/|\.\./i.test(url),name+': scripts must be served from site only');
    assert(fs.existsSync(url.split('?')[0]),name+': missing JS '+url);
  }
  for(const [tag] of markup.matchAll(/<a\b[^>]*\btarget="_blank"[^>]*>/gi)){
    assert(/\brel="[^"]*\bnoopener\b/.test(tag),name+': missing noopener on outbound link');
  }
  assert(/<meta\s+name="referrer"\s+content="strict-origin-when-cross-origin"/i.test(markup),name+': missing referrer policy');
}
const main=read('index.html');
const csp=main.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i)[1];
for(const host of ['https://api.open-meteo.com','https://site.api.espn.com']){
  assert(csp.includes(host),'Active weather/score provider should not be blocked: '+host);
}
for(const host of ['https://commons.wikimedia.org','https://upload.wikimedia.org']){
  assert(csp.includes(host),'Historical photo provider should not be blocked: '+host);
}
const workflow=read('.github/workflows/albion-smoke.yml');
const uses=[...workflow.matchAll(/\buses:\s+([^\s#]+)/g)].map(m=>m[1]);
assert(uses.length>=4,'CI actions unexpectedly absent');
assert(uses.every(action=>/^[^@]+@[a-f0-9]{40}$/.test(action)),'All CI actions must be pinned to a full commit SHA');
assert.equal((workflow.match(/persist-credentials: false/g)||[]).length,4,'All checkouts must discard credentials');
assert(/permissions:\s*\n\s*contents: read/.test(workflow),'Workflow should be read-only');
console.log('PASS: CSP, public access, external feed/image allowances, local scripts and pinned read-only CI actions');
