// sw.js (Corrected Version)

const CACHE_NAME = 'kabaleonline-cache-v12'; // Or v12 if you've made other changes
const IMAGE_CACHE = 'kabaleonline-images-v1';

// A single, comprehensive list of all essential app files.
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
  '/dashboard/', '/dashboard/index.html', '/dashboard/script.js',
  '/login/', '/login/index.html', '/login/script.js',
  '/signup/', '/signup/index.html', '/signup/script.js',
  '/profile/', '/profile/index.html', '/profile/script.js',
  '/products/', '/products/index.html', '/products/script.js',
  '/upload/', '/upload/index.html', '/upload/script.js',
  '/referrals/', '/referrals/index.html', '/referrals/script.js',
  '/settings/', '/settings/index.html', '/settings/script.js',
  '/admin/', '/admin/index.html', '/admin/admin.js',
  
  // Other existing pages
  '/about.html', 
  '/product.html', '/product.js',
  '/terms.html',
  '/blog/', '/blog/index.html',
  '/rentals/', '/rentals/index.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Service Worker: Caching App Shell');
      return cache.addAll(APP_SHELL_FILES).catch(err => {
        console.error("Failed to cache a file during install:", err);
      });
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

  // --- FIX ---
  // Only handle GET requests. Ignore all others (like POST to Firestore).
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