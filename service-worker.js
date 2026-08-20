// r69 retirement worker: remove Brighton/Albion offline behaviour, then unregister itself.
const IS_BRIGHTON_CACHE = key => /brighton|albion|fan-hub/i.test(key);
self.addEventListener("install", event => event.waitUntil(self.skipWaiting()));
self.addEventListener("activate", event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(IS_BRIGHTON_CACHE).map(key => caches.delete(key)))),
    self.registration.unregister(),
    self.clients.claim()
  ]));
});
