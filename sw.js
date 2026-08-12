/* Service worker for the calorie tracker PWA.
   Strategy: network-first with cache fallback — you always get the newest
   version when online, and the full app when offline.
   Bump CACHE_VERSION whenever you deploy a change. */
const CACHE_VERSION = 'tracker-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-180.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok && res.type === 'basic' && !res.redirected) {
          // Keep the cache fresh — but only with real, same-origin, non-redirect
          // responses, so a host's login/error page can never overwrite the app.
          const copy = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put(req, copy)).catch(() => {});
        } else if (!res.ok && req.mode === 'navigate') {
          // e.g. an auth wall returned 401 — prefer the cached app (it needs no server)
          return caches.match('./index.html').then(hit => hit || res);
        }
        return res;
      })
      .catch(() =>
        caches.match(req, { ignoreSearch: true })
          .then(hit => hit || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()))
      )
  );
});
