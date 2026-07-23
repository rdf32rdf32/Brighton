const CACHE_NAME = 'albion-fan-hub-v14';
const FILES = [
  './', './index.html', './style.css', './app.js', './quiz-data.js', './content-data.js',
  './manifest.json', './favicon.svg', './albion-safe-graphic.svg', './sussex-by-the-sea.mp3',
  './icon-192.png', './icon-512.png', './social-preview.png', './privacy.html', './cookies.html', './copyright.html', './contact.html', './offline.html'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(FILES)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener('fetch', event => {
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request).then(cached => cached || (event.request.mode === 'navigate' ? caches.match('./offline.html') : Response.error()))));
});
