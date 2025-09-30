// sw.js (Upgraded Version)

const CACHE_NAME = 'kabaleonline-cache-v11'; // IMPORTANT: Version bumped to trigger update
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
  '/shared.js', // Added essential shared script
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
  // Add any other important pages or scripts here
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Service Worker: Caching App Shell');
      // Precaching all essential files for offline functionality.
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
          // Delete all old caches except the current app shell and the image cache.
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

  // Strategy 1: Network First for HTML pages.
  // This ensures users get the latest page content if they are online.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(networkRes => {
          // If fetch is successful, update the cache with the new version.
          const cacheClone = networkRes.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, cacheClone));
          return networkRes;
        })
        .catch(() => {
          // If fetch fails (offline), serve the page from the cache.
          return caches.match(req).then(cacheRes => cacheRes || caches.match('/offline.html'));
        })
    );
    return;
  }

  // Strategy 2: Cache First for images, with size limit.
  // This serves images instantly from cache for speed.
  if (req.destination === 'image') {
    event.respondWith(
      caches.match(req, { cacheName: IMAGE_CACHE }).then(cacheRes => {
        if (cacheRes) return cacheRes;

        return fetch(req).then(networkRes => {
          const cacheClone = networkRes.clone();
          caches.open(IMAGE_CACHE).then(cache => {
            cache.put(req, cacheClone);
            limitCacheSize(IMAGE_CACHE, 50); // Keep only the 50 most recent images
          });
          return networkRes;
        }).catch(() => caches.match('/icons/192.png')); // Fallback placeholder
      })
    );
    return;
  }

  // Strategy 3: Cache First for all other assets (CSS, JS, fonts).
  // These files don't change often, so serving from cache is fast and reliable.
  event.respondWith(
    caches.match(req).then(cacheRes => {
      return cacheRes || fetch(req).then(networkRes => {
        // Dynamically cache other assets if they are fetched.
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