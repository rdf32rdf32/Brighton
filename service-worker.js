const CACHE_NAME = 'albion-fan-hub-r56';
const CORE = [
  './','./index.html','./style.css?v=20260728-r56','./shootout.css?v=20260728-r56',
  './r35-polish.css?v=20260728-r56','./r37-layout.css?v=20260728-r56','./r38-mobile.css?v=20260728-r56','./r39-geometry.css?v=20260728-r56','./shootout-mobile.css?v=20260728-r56','./r56-final.css?v=20260728-r56',
  './content-data.js?v=20260728-r56','./quiz-data.js?v=20260728-r56','./site-controls.js?v=20260728-r56','./app.js?v=20260728-r56','./match-player.js?v=20260728-r56','./shootout.js?v=20260728-r56','./r35-polish.js?v=20260728-r56','./r56-final.js?v=20260728-r56',
  './manifest.json','./favicon.svg','./albion-safe-graphic.svg','./icon-192.png','./icon-512.png','./social-preview.png','./offline.html','./contact.html','./cookies.html','./copyright.html','./privacy.html'
];
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request, { cache: 'no-store' }).then(response => {
      if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put('./index.html', response.clone()));
      return response;
    }).catch(async () => await caches.match('./index.html') || await caches.match('./offline.html')));
    return;
  }
  if (/\.(?:css|js|json|svg|png|html)$/i.test(url.pathname)) {
    event.respondWith(fetch(request, { cache: 'no-store' }).then(response => {
      if (response.ok && response.type === 'basic') caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
      return response;
    }).catch(() => caches.match(request)));
    return;
  }
  if (/\.(?:mp3|wav|ogg)$/i.test(url.pathname)) {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
      return response;
    })));
    return;
  }
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});
self.addEventListener('message', event => { if (event.data?.type === 'SKIP_WAITING') self.skipWaiting(); });
