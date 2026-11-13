/* Ash Do service worker — offline-first app shell.
   The version and precache list below are filled in at build time by the plugin in vite.config.js. */
/* global self, caches */
const VERSION = '__VERSION__';
const PRECACHE = __PRECACHE__;
const CACHE = `ashdo-${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('ashdo-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // the app makes no third-party requests

  // Navigations: always serve the cached app shell so the app opens offline.
  if (req.mode === 'navigate') {
    event.respondWith(caches.match('/index.html').then((cached) => cached || fetch(req)));
    return;
  }

  // Static assets: cache first, then network (and remember it).
  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
    )
  );
});
