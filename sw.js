// sw.js - PWA Service Worker (modular version)
const CACHE_NAME = 'pos-pwa-cache-v1';
const OFFLINE_PAGE = './offline.html';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './offline.html',

  // Modular JS entry point
  './src/main.js',

  // Optional icons/screenshots (uncomment if available)
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  // './screenshots/screenshot1.png',
  // './screenshots/screenshot2.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(PRECACHE_ASSETS).catch(err => {
        console.error("Cache addAll failed:", err);
      })
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then(res => res || caches.match(OFFLINE_PAGE))
        )
    );
  } else {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request))
    );
  }
});
  
