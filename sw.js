// File: sw.js - Service Worker for POS PWA
const CACHE_NAME = 'pos-pwa-cache-v3'; // You might want to increment this to v2 to force an update
const OFFLINE_PAGE = '/pos-pwa/offline.html'; // <--- CHANGED

const PRECACHE_ASSETS = [
  '/pos-pwa/',                  // <--- CHANGED: Represents the root of your app
  '/pos-pwa/index.html',        // <--- CHANGED
  '/pos-pwa/manifest.json',     // <--- CHANGED
  '/pos-pwa/offline.html',      // <--- CHANGED

  // Entry point
  '/pos-pwa/src/main.js',       // <--- CHANGED

  // App core
  '/pos-pwa/src/app/initApp.js',    // <--- CHANGED
  '/pos-pwa/src/app/renderLayout.js', // <--- CHANGED
  '/pos-pwa/src/app/renderSection.js',// <--- CHANGED
  '/pos-pwa/src/app/handleNav.js',    // <--- CHANGED

  // Auth
  '/pos-pwa/src/auth/login.js',    // <--- CHANGED
  '/pos-pwa/src/auth/register.js', // <--- CHANGED

  // Database & state
  '/pos-pwa/src/db/posDatabase.js',// <--- CHANGED
  '/pos-pwa/src/state/appState.js',// <--- CHANGED

  // Utilities
  '/pos-pwa/src/utils/session.js', // <--- CHANGED
  '/pos-pwa/src/utils/crypto.js',  // <--- CHANGED
  '/pos-pwa/src/utils/validation.js',// <--- CHANGED
  '/pos-pwa/src/utils/id.js',      // <--- CHANGED
  '/pos-pwa/src/utils/dom.js',     // <--- CHANGED

  // UI
  '/pos-pwa/src/ui/navVisibility.js',// <--- CHANGED
  '/pos-pwa/src/ui/drawer.js',     // <--- CHANGED

  // Optional assets
  '/pos-pwa/icons/icon-192x192.png',// <--- CHANGED
  '/pos-pwa/icons/icon-512x512.png',// <--- CHANGED
  // '/pos-pwa/screenshots/screenshot1.png', // <--- UNCOMMENT AND CHANGE IF NEEDED
  // '/pos-pwa/screenshots/screenshot2.png', // <--- UNCOMMENT AND CHANGE IF NEEDED
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.error("Cache addAll failed:", err);
        // You might want to log which asset failed to cache here for better debugging
      })
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
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
        .then((response) => {
          // Check if the response is valid before caching
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          // If network fails, try to match the request in cache or fall back to offline page
          caches.match(request).then((res) => res || caches.match(OFFLINE_PAGE))
        )
    );
  } else {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
  }
});
