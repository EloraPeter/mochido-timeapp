// public/sw.js

const CACHE_NAME = 'mochido-v1';

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

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
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