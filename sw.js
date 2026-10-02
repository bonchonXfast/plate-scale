/* Plate & Scale service worker: caches the app shell so it opens offline.
   Personal data lives in IndexedDB and is never sent anywhere by this worker. */
const VERSION = 'plate-scale-f8985fa4f4';
const SHELL = ["./", "./index.html", "./app.css?v=f8985fa4f4", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png", "./js/foods.js?v=f8985fa4f4", "./js/db.js?v=f8985fa4f4", "./js/store.js?v=f8985fa4f4", "./js/calc.js?v=f8985fa4f4", "./js/charts.js?v=f8985fa4f4", "./js/photos.js?v=f8985fa4f4", "./js/vision.js?v=f8985fa4f4", "./js/assistant.js?v=f8985fa4f4", "./js/backup.js?v=f8985fa4f4", "./js/demo.js?v=f8985fa4f4", "./js/app-core.js?v=f8985fa4f4", "./js/sheets.js?v=f8985fa4f4", "./js/views-main.js?v=f8985fa4f4", "./js/views-progress.js?v=f8985fa4f4", "./js/views-settings.js?v=f8985fa4f4", "./js/boot.js?v=f8985fa4f4"];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('plate-scale-') && k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Google Fonts: stale-while-revalidate
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(VERSION + '-fonts').then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  // navigation: network first, fall back to cached shell
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => { const copy = r.clone(); caches.open(VERSION).then(c => c.put('./index.html', copy)); return r; }).catch(() => caches.match('./index.html')));
    return;
  }
  // static assets: cache first
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return r; })));
});
