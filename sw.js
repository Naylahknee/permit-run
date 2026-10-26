// Permit Run offline app. Fetch navigations from the network first so users
// see new releases instead of being locked into a previous cached homepage.
// v2026-10-26a is intentionally part of this file, not just precache.js:
// changing the imported manifest alone may not trigger a SW update promptly.
importScripts('precache.js');
const CACHE = 'permit-run-' + self.PRECACHE_VERSION + '-v20261026a';
const base = new URL('./', self.location.href);

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(self.PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key.startsWith('permit-run-') &&
        !key.startsWith('permit-run-classic-') && key !== CACHE)
        .map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== base.origin ||
      !url.pathname.startsWith(base.pathname) ||
      url.pathname.startsWith(base.pathname + 'classic/')) return;

  // Network-first for HTML, including ?design=new. Offline still works.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, copy)));
        }
        return response;
      }).catch(() => caches.match(request, { ignoreSearch: true })
        .then(hit => hit || caches.match('./')))
    );
    return;
  }

  // Versioned precache for graphics, scripts and styles.
  event.respondWith(
    caches.match(request).then(hit => hit || fetch(request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, copy)));
      }
      return response;
    }))
  );
});
