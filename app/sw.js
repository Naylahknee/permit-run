// Offline support: cache every game file on install, then serve from cache.
importScripts('precache.js');
const CACHE = 'permit-run-' + self.PRECACHE_VERSION;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(self.PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    // only this design's old caches; classic/ keeps its own ('permit-run-classic-…')
    .then(keys => Promise.all(keys.filter(k => /^permit-run-[0-9a-f]+$/.test(k) && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // classic/ is a separate app with its own service worker and cache
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.includes('/classic/')) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match('./')))
  );
});
