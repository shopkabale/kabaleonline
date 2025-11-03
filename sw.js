// sw.js (Fully Corrected)

const CACHE_NAME = 'kabaleonline-cache-v21.9';
const IMAGE_CACHE = 'kabaleonline-images-v2.4';

const APP_SHELL_FILES = [
  '/', '/index.html', '/offline.html', '/manifest.json', '/favicon.webp',
  '/icons/192.png', '/icons/512.png', '/styles.css', '/firebase.js',
  '/auth.js', '/shared.js', '/ui.js', '/dashboard/', '/profile/', 
  '/referrals/', '/products/', '/upload/', '/settings/', '/login/', 
  '/signup/', '/admin/', '/cart.html', '/checkout.html', '/shop/',
  '/order-success.html','/ai/' , '/my-orders.html', '/dashboard/orders/'
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

  // Strategy 1: Network First for HTML pages (No change needed here)
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

  // Strategy 2: Cache First for images (No change needed here)
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

  // Strategy 3: Network First for dynamic data (API/Firestore calls)
  if (url.href.includes('firestore.googleapis.com') || url.href.includes('/.netlify/functions/')) {
    event.respondWith(
        fetch(request).then(networkResponse => {
            if (request.method === 'GET') { // FIX APPLIED HERE
                const responseClone = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(request, responseClone);
                });
            }
            return networkResponse;
        }).catch(() => {
            if (request.method === 'GET') {
                return caches.match(request);
            }
        })
    );
    return;
  }

  // Strategy 4: Cache First for all other assets (CSS, JS, fonts)
  event.respondWith(
    caches.match(request).then(cacheRes => {
      return cacheRes || fetch(request).then(networkRes => {
        // FIX APPLIED HERE AS WELL
        if (request.method === 'GET') {
            const cacheClone = networkRes.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, cacheClone));
        }
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
