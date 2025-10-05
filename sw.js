// sw.js (Corrected Version)

const CACHE_NAME = 'kabaleonline-cache-v16'; // Or v12 if you've made other changes
const IMAGE_CACHE = 'kabaleonline-images-v1';

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

  // New Dashboard Pages & Scripts
  '/dashboard/', '/profile/', '/referrals/', '/products/', '/upload/', '/settings/', '/login/', '/signup/', '/admin/'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Service Worker: Caching App Shell');
      // Use addAll for atomic caching, but catch errors for individual files if needed
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
  const req = event.request;

  // --- THIS IS THE FIX ---
  // Only handle GET requests and requests from our own origin.
  // This ignores all other requests, like POSTs to Firestore's API.
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) {
    return;
  }

  // Strategy 1: Network First for HTML pages.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(networkRes => {
          const cacheClone = networkRes.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, cacheClone));
          return networkRes;
        })
        .catch(() => caches.match(req).then(cacheRes => cacheRes || caches.match('/offline.html')))
    );
    return;
  }

  // Strategy 2: Cache First for images.
  if (req.destination === 'image') {
    event.respondWith(
        caches.match(req, { cacheName: IMAGE_CACHE }).then(cacheRes => {
            if (cacheRes) return cacheRes;
            return fetch(req).then(networkRes => {
                const cacheClone = networkRes.clone();
                caches.open(IMAGE_CACHE).then(cache => {
                    cache.put(req, cacheClone);
                    limitCacheSize(IMAGE_CACHE, 50);
                });
                return networkRes;
            }).catch(() => caches.match('/icons/192.png'));
        })
    );
    return;
  }

  // Strategy 3: Cache First for all other assets (CSS, JS, fonts).
  event.respondWith(
    caches.match(req).then(cacheRes => {
      return cacheRes || fetch(req).then(networkRes => {
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