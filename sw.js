// sw.js - Service Worker for offline support
const CACHE_NAME = 'my-pwa-cache-v1';
const FALLBACK_HTML = '/offline.html'; // Create this simple HTML file

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll([
        '/',
        '/index.html',
        '/app.js',
        '/db.js',
        '/styles.css',
        '/manifest.json'
      ]))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
      .catch(() => caches.match(FALLBACK_HTML))
  );
});