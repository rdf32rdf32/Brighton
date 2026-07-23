const CACHE_NAME = 'albion-fan-hub-v22';
const FILES = [
  './', './index.html', './style.css', './app.js', './v16.js', './v17.js', './v18.js', './quiz-data.js', './content-data.js',
  './manifest.json', './favicon.svg', './albion-safe-graphic.svg', './sussex-by-the-sea.mp3',
  './albion-albion-albion.mp3', './seagulls.mp3', './we-are-brighton.mp3',
  './come-on-brighton.mp3', './we-all-follow-albion.mp3', './brighton-aces.mp3',
  './b-r-i-g-h-t-o-n.mp3', './great-escape.mp3', './glory-glory.mp3',
  './icon-192.png', './icon-512.png', './social-preview.png', './privacy.html', './cookies.html', './copyright.html', './contact.html', './offline.html',
  './editor.html', './editor.js'
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
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
