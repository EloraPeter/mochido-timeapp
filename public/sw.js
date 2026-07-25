// public/sw.js

const CACHE_NAME = 'mochido-v2'; // bumped - forces the old (never-updating) cache to be replaced on next deploy

// Use the files that ACTUALLY exist in your icons folder
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/mochi-192.png',   // Changed from mochi-happy-192.png
  '/icons/mochi-512.png'    // Changed from mochi-happy-512.png
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        // Cache each file individually to avoid one failure breaking everything
        for (const asset of STATIC_ASSETS) {
          try {
            const response = await fetch(asset);
            if (response.ok) {
              await cache.put(asset, response);
              console.log(`✅ Cached: ${asset}`);
            } else {
              console.warn(`⚠️ Failed to cache: ${asset} (${response.status})`);
            }
          } catch (err) {
            console.warn(`⚠️ Error caching ${asset}:`, err);
          }
        }
      } catch (err) {
        console.error('❌ Cache error:', err);
      }
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log(`🗑️ Deleting old cache: ${cache}`);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - stale-while-revalidate.
//
// STABILIZATION FIX (post-Milestone-1): the previous handler only ever
// checked `caches.match()` and fell back to `fetch()` - it never wrote a
// successful network response back into the cache. That meant dashboard
// routes and Next.js's per-route JS chunks were NEVER actually cached
// after the initial install-time precache, so a fully-offline app restart
// had no way to load anything beyond the 4 STATIC_ASSETS above - the app
// shell couldn't boot, so the (correct) offline-first auth logic never
// even got a chance to run. This fixes that by writing every successful
// same-origin GET response into the cache, then serving from cache first
// on future requests (instant, and offline-capable) while refreshing that
// cache entry in the background whenever the network is actually available.
//
// Note the practical implication: a route/asset only becomes available
// offline AFTER it's been visited at least once while online, since that's
// when it first gets written into the cache. This is expected,
// standard stale-while-revalidate behavior, not a partial fix.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only GET, same-origin, non-API requests go through this cache
  // strategy. POSTs (Supabase writes, etc.), cross-origin requests, and
  // this app's own /api/* routes (dynamic/server-rendered, never meant to
  // be cached) are left completely untouched - straight to the network,
  // exactly as before.
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(request);

      const networkFetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => undefined); // offline / network unreachable - no response available

      // Keep the service worker alive long enough for the background
      // cache write to actually finish, even though we don't wait for it
      // before responding when a cached copy is already available.
      event.waitUntil(networkFetchPromise);

      // Serve the cached copy instantly if we have one (this is what
      // makes offline reopen work); otherwise fall back to waiting on the
      // network (first-ever visit to this URL, while online).
      return cachedResponse || (await networkFetchPromise) || Response.error();
    })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'MochiDo', body: event.data.text() };
  }
  
  const options = {
    body: data.body,
    icon: data.icon || '/icons/mochi-192.png',
    badge: data.badge || '/icons/mochi-192.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    requireInteraction: data.requireInteraction || false
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'MochiDo', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});