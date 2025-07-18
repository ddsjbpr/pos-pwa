// File: sw.js - Service Worker for POS PWA
const CACHE_NAME = 'pos-pwa-cache-v1';
const OFFLINE_PAGE = '/offline.html';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',

  // Entry point
  '/src/main.js',

  // App core
  '/src/app/initApp.js',
  '/src/app/renderLayout.js',
  '/src/app/renderSection.js',
  '/src/app/handleNav.js',

  // Auth
  '/src/auth/login.js',
  '/src/auth/register.js',

  // Database & state
  '/src/db/posDatabase.js',
  '/src/state/appState.js',

  // Utilities
  '/src/utils/session.js',
  '/src/utils/crypto.js',
  '/src/utils/validation.js',
  '/src/utils/id.js',
  '/src/utils/dom.js',

  // UI
  '/src/ui/navVisibility.js',
  '/src/ui/drawer.js',

  // Optional assets
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // '/screenshots/screenshot1.png',
  // '/screenshots/screenshot2.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.error("Cache addAll failed:", err);
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
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches.match(request).then((res) => res || caches.match(OFFLINE_PAGE))
        )
    );
  } else {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
  }
});
