/* =====================================================================
   Service Worker for 24-Hour Time Blocking Weekly Planner
   Caches local files and external CDN dependencies for offline use
   ===================================================================== */

const CACHE_NAME = 'time-planner-v2';

// Core static assets necessary for offline execution
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './weekly_time_blocking_planner_iran_time.html',
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

// 1. Install Event: Pre-cache local assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event: Clean up outdated caches
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

// 3. Fetch Event: Cache-first with network fallback for local and CDN assets
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Do not cache Supabase API database calls or chrome-extension URLs
  if (url.origin.includes('supabase.co') || url.protocol === 'chrome-extension:') {
    return;
  }

  const isLocal = url.origin === self.location.origin;
  const isCdn = CDN_HOSTS.some((host) => url.hostname.includes(host));

  if (isLocal || isCdn) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        // Return cached version if found
        if (cachedResponse) {
          // Fetch updated version in background (Stale-While-Revalidate)
          fetch(request).then((networkResponse) => {
            if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, networkResponse);
              });
            }
          }).catch(() => {
            // Network failure is expected when offline; ignored
          });
          return cachedResponse;
        }

        // Otherwise fetch from network and cache for next time
        return fetch(request).then((networkResponse) => {
          if (!networkResponse || (networkResponse.status !== 200 && networkResponse.type !== 'opaque')) {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });

          return networkResponse;
        }).catch((err) => {
          // Fallback for navigation requests if offline and not in cache
          if (request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          throw err;
        });
      })
    );
  }
});
