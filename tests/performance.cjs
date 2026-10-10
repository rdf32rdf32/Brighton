'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const h=fs.readFileSync('index.html','utf8');
const paths=[...h.matchAll(/(?:src|href)="([^"]+)"/g)].map(m=>m[1].split('?')[0])
  .filter(p=>/\.(?:css|js)$/.test(p)&&!p.includes('://'));
const active=[...new Set(paths)];
const total=active.reduce((n,p)=>n+fs.statSync(p).size,0);
assert(active.length<=8,'Too many active stylesheet/script assets: '+active.length);
assert(total<=1150000,'Active CSS and JS have exceeded the performance budget: '+total+' bytes');
assert(h.includes('rel="preload"'),'Above-fold illustration should be preloaded');
assert(h.includes('name="viewport"')||h.includes('name="viewport"'),'Mobile viewport metadata missing');
console.log('PASS: '+active.length+' active scripts/styles, '+total+' bytes (1.15 MB budget)');
