// sw.js (Corrected Version)

const CACHE_NAME = 'kabaleonline-cache-v17'; // Version bumped to trigger update
const IMAGE_CACHE = 'kabaleonline-images-v1'; // This remains the same

const APP_SHELL_FILES = [
  // Core App Shell
  '/', 
  '/index.html', 
  '/offline.html',
  '/manifest.json',
  '/favicon.webp',
  '/icons/192.png', 
  '/icons/512.png',

  // Core Scripts & Styles
  '/styles.css', 
  '/firebase.js',
  '/auth.js',
  '/shared.js',
  '/ui.js',

  // Dashboard Pages & Scripts
  '/dashboard/', '/profile/', '/referrals/', '/products/', '/upload/', '/settings/', '/login/', '/signup/', '/admin/'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Service Worker: Caching App Shell');
      return Promise.all(
        APP_SHELL_FILES.map(url => {
          return cache.add(url).catch(err => console.warn(`Failed to cache ${url}:`, err));
        })
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.map(name => {
          if (name !== CACHE_NAME && name !== IMAGE_CACHE) {
            console.log('Service Worker: Deleting old cache:', name);
            return caches.delete(name);
          }
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Strategy 1: Network First for HTML pages.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(networkRes => {
          const cacheClone = networkRes.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, cacheClone));
          return networkRes;
        })
        .catch(() => caches.match(request).then(cacheRes => cacheRes || caches.match('/offline.html')))
    );
    return;
  }

  // Strategy 2: Cache First for images.
  if (request.destination === 'image') {
    event.respondWith(
        caches.match(request, { cacheName: IMAGE_CACHE }).then(cacheRes => {
            if (cacheRes) return cacheRes;
            return fetch(request).then(networkRes => {
                const cacheClone = networkRes.clone();
                caches.open(IMAGE_CACHE).then(cache => {
                    cache.put(request, cacheClone);
                    limitCacheSize(IMAGE_CACHE, 50);
                });
                return networkRes;
            }).catch(() => caches.match('/icons/192.png'));
        })
    );
    return;
  }

  // --- THIS IS THE FIX ---
  // Strategy 3: Network First for dynamic data (API/Firestore calls).
  // This ensures your product data is always fresh.
  if (url.href.includes('firestore.googleapis.com') || url.href.includes('/.netlify/functions/')) {
    event.respondWith(
      fetch(request)
        .then(networkResponse => {
          // If we get a good response, update the cache for offline use
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
          return networkResponse;
        })
        .catch(() => {
          // If the network fails (user is offline), serve the last saved version from the cache
          return caches.match(request);
        })
    );
    return;
  }

  // Strategy 4: Cache First for all other assets (CSS, JS, fonts).
  event.respondWith(
    caches.match(request).then(cacheRes => {
      return cacheRes || fetch(request).then(networkRes => {
        const cacheClone = networkRes.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, cacheClone));
        return networkRes;
      });
    })
  );
});

function limitCacheSize(cacheName, maxItems) {
  caches.open(cacheName).then(cache => {
    cache.keys().then(keys => {
      if (keys.length > maxItems) {
        cache.delete(keys[0]).then(() => limitCacheSize(cacheName, maxItems));
      }
    });
  });
}
