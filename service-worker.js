const CACHE_NAME = 'albion-fan-hub-r50';
const CORE = [
  "./", "./index.html", "./style.css?v=20260727-r38", "./shootout.css?v=20260727-r38",
  "./r35-polish.css?v=20260727-r38", "./r37-layout.css?v=20260727-r38", "./r38-mobile.css?v=20260727-r38", "./r39-geometry.css?v=20260728-r50", "./shootout-mobile.css?v=20260728-r50", "./content-data.js?v=20260727-r38", "./quiz-data.js?v=20260727-r38",
  "./site-controls.js?v=20260727-r38", "./app.js?v=20260727-r38", "./shootout.js?v=20260728-r50",
  "./r35-polish.js?v=20260727-r38", "./manifest.json", "./favicon.svg", "./albion-safe-graphic.svg",
  "./icon-192.png", "./icon-512.png", "./social-preview.png", "./offline.html", "./contact.html",
  "./cookies.html", "./copyright.html", "./privacy.html"
];
self.addEventListener("install", e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(CORE))); });
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  const r=e.request; if(r.method!=="GET") return; const u=new URL(r.url); if(u.origin!==location.origin) return;
  if(r.mode==="navigate") { e.respondWith(fetch(r).then(res=>{if(res.ok)caches.open(CACHE_NAME).then(c=>c.put(r,res.clone()));return res;}).catch(async()=>await caches.match(r)||await caches.match("./index.html")||await caches.match("./offline.html"))); return; }
  if(/\.(mp3|wav|ogg)$/i.test(u.pathname)){e.respondWith(caches.match(r).then(c=>c||fetch(r).then(res=>{if(res.ok)caches.open(CACHE_NAME).then(x=>x.put(r,res.clone()));return res;})));return;}
  e.respondWith(caches.match(r).then(c=>{const n=fetch(r).then(res=>{if(res.ok&&res.type==="basic")caches.open(CACHE_NAME).then(x=>x.put(r,res.clone()));return res;}).catch(()=>c);return c||n;}));
});
self.addEventListener("message", e => { if(e.data?.type==="SKIP_WAITING") self.skipWaiting(); });
