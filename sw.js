// Offline support: the app shell is cached on first visit; fonts are cached as they load.
// Bump VERSION when the app changes so iPads pick up the new files.
const VERSION = 'lilypad-v14';
const SHELL = ['./', 'index.html', 'privacy.html', 'support.html', 'manifest.webmanifest', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png',
  'fonts/andika-latin-400-normal.woff2', 'fonts/andika-latin-700-normal.woff2', 'fonts/baloo-2-latin-600-normal.woff2', 'fonts/baloo-2-latin-800-normal.woff2'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (url.origin !== location.origin && !isFont) return;

  if (req.mode === 'navigate') {
    // Page: try the network for updates, fall back to the cached copy offline.
    e.respondWith(fetch(req)
      .then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put('index.html', copy)); return res; })
      .catch(() => caches.match('index.html')));
    return;
  }

  // Everything else: cache first, then network (and remember it).
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  })));
});
