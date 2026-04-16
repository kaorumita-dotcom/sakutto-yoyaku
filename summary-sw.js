// summary-sw.js — minimal service worker (PWAインストール要件を満たすため)
const CACHE = 'sakutto-v1';
const PRECACHE = [
  './index.html',
  './summary.css',
  './summary.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // ネットワーク優先、失敗時にキャッシュ
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
