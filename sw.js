/* =====================================================================
   Service Worker for 24-Hour Time Blocking Weekly Planner
   Caches local files and external CDN dependencies for offline use
   ===================================================================== */

const CACHE_NAME = 'time-planner-v4';

// Core static assets necessary for offline execution
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './js/config.js',
  './js/i18n.js',
  './js/supabaseClient.js',
  './js/storage.js',
  './js/timeEngine.js',
  './js/tags.js',
  './js/tasksBank.js',
  './js/views.js',
  './js/modals.js',
  './js/pomodoro.js',
  './js/insights.js',
  './js/app.js'
];

// External CDN dependencies to cache when loaded
const CDN_HOSTS = [
  'cdn.tailwindcss.com',
  'unpkg.com',
  'cdn.jsdelivr.net',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

// 1. Install Event: Pre-cache local assets & skip waiting immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
});

// 2. Activate Event: Clean up outdated caches & claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event:
// - Navigation requests (HTML) and local app scripts/styles: Network-First with Cache Fallback
//   This guarantees users immediately receive the newest deployment without needing Shift+Cmd+R.
// - Third-party CDN libraries: Stale-While-Revalidate with Cache Fallback
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Do not intercept Supabase API database calls or chrome-extension URLs
  if (url.origin.includes('supabase.co') || url.protocol === 'chrome-extension:') {
    return;
  }

  const isLocal = url.origin === self.location.origin;
  const isCdn = CDN_HOSTS.some((host) => url.hostname.includes(host));
  const isNavigation = request.mode === 'navigate';

  // Strategy A: Local files and navigation requests -> Network-First
  // Ensures updates are picked up as soon as user opens or refreshes the page when online.
  if (isNavigation || isLocal) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, copy);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If network is offline or fails, serve from offline cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            if (isNavigation) {
              return caches.match('./index.html');
            }
            return new Response('Offline and resource not in cache', { status: 503, statusText: 'Offline' });
          });
        })
    );
    return;
  }

  // Strategy B: CDN Host assets -> Cache-First with background update
  if (isCdn) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          fetch(request).then((networkResponse) => {
            if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, networkResponse);
              });
            }
          }).catch(() => {});
          return cachedResponse;
        }

        return fetch(request).then((networkResponse) => {
          if (!networkResponse || (networkResponse.status !== 200 && networkResponse.type !== 'opaque')) {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return networkResponse;
        });
      })
    );
  }
});
