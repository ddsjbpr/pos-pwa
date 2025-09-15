// sw.js - Optimized Offline-First Service Worker
const CACHE_VERSION = 'v1.0.3'; // Bumping version after changes
const CACHE_NAME = `pos-pwa-cache-${CACHE_VERSION}`;
const OFFLINE_PAGE = './offline.html';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './offline.html',

  // Core App Scripts
  './src/main.js',
  './src/db/posDatabase.js',
  './src/db/firebase-config.js',
  './src/app/initApp.js',

  // Core & Section Styles
  './src/styles/variables.css',
  './src/styles/base.css',
  './src/styles/typography.css',
  './src/styles/forms.css',
  './src/styles/buttons.css',
  './src/styles/nav.css',
  './src/styles/layout.css',
  './src/styles/modals.css',
  './src/styles/tables.css',
  './src/styles/utilities.css',
  './src/styles/animations.css',
  './src/styles/sections/order.css',
  './src/styles/sections/sales.css',
  './src/styles/sections/users.css',
  './src/styles/sections/menu.css',
  './src/styles/responsive.css',
  './src/styles/dark-mode.css',
  './src/styles/print.css',

  // Local Vendor Styles
  './src/vendor/noto-sans/noto-sans.css',
  './src/vendor/fontawesome/css/all.min.css',

  // Local Vendor Fonts
  './src/vendor/fontawesome/webfonts/fa-solid-900.woff2',
  './src/vendor/fontawesome/webfonts/fa-solid-900.ttf',

  // Local Vendor Scripts
  './src/vendor/third-party/JS/chart.umd.min.js',
  './src/vendor/third-party/JS/purify.min.js',
  './src/vendor/third-party/JS/jspdf.umd.min.js',
  './src/vendor/third-party/JS/html2canvas.min.js',
  './src/vendor/third-party/JS/xlsx.full.min.js',
  './src/vendor/pramukh/pramukhime.js',
  './src/vendor/pramukh/pramukhime-common.js',
  './src/vendor/pramukh/pramukhindic.js',

  // Icons
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
];

// Install - precache app shell
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const promises = PRECACHE_ASSETS.map(async (url) => {
        try {
          await cache.add(url);
          console.log(`[SW] Cached: ${url}`);
        } catch (err) {
          console.warn(`[SW] Failed to cache: ${url}`, err);
        }
      });
      return Promise.allSettled(promises);
    })
  );
});

// Activate - clean old caches
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

// Fetch - runtime caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Bypass Firebase/Firestore API calls (always fetch network)
  if (url.origin.includes('firebase') || url.origin.includes('firestore')) {
    event.respondWith(fetch(request));
    return;
  }
 
  // Navigation requests (SPA/PWA routing) - Network-first, with cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone());
          return networkResponse;
        } catch (error) {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          return caches.match(OFFLINE_PAGE);
        }
      })()
    );
    return;
  }

  // Static assets - cache first
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});

// Background Sync event listener for syncing offline queue
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-queue') {
    console.log('[SW] Background sync event triggered.');
    event.waitUntil(
      self.clients.matchAll({ includeUncontrolled: true }).then(clients => {
        for (const client of clients) {
          client.postMessage({ type: 'do-sync' });
        }
      })
    );
  }
});

// The syncOfflineQueue function is now removed, as the client handles the database work.
