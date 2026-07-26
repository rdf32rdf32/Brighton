const CACHE_NAME = "albion-production-r18-20260726";
const CORE = [
  "./",
  "./index.html",
  "./style.css?v=20260726-r18",
  "./release-fixes.css?v=20260726-r18",
  "./shootout.css?v=20260726-r18",
  "./polish.css?v=20260726-r18",
  "./content-data.js?v=20260726-r18",
  "./quiz-data.js?v=20260726-r18",
  "./app.js?v=20260726-r18",
  "./release-fixes.js?v=20260726-r18",
  "./shootout.js?v=20260726-r18",
  "./polish.js?v=20260726-r18",
  "./manifest.json",
  "./favicon.svg",
  "./albion-safe-graphic.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./social-preview.png",
  "./offline.html",
  "./contact.html",
  "./cookies.html",
  "./copyright.html",
  "./privacy.html"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
          return response;
        })
        .catch(async () =>
          (await caches.match(request)) ||
          (await caches.match("./index.html")) ||
          (await caches.match("./offline.html")),
        ),
    );
    return;
  }

  const isAudio = /\.(mp3|wav|ogg)$/i.test(url.pathname);
  if (isAudio) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
        return response;
      })),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok && response.type === "basic") caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
