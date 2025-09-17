// sw.js (The MAIN service worker in your root directory)

const CACHE_NAME = 'kabaleonline-cache-v8'; // Incremented cache version
const IMAGE_CACHE = 'kabaleonline-images-v1';

// --- File Manifest ---
// This object lists all the files that belong to each section.
const fileManifest = {
  www: [
    '/', '/index.html', '/offline.html', '/styles.css', '/main.js',
    '/auth.js', '/firebase.js', '/nav.js', '/ui.js', '/manifest.json',
    '/favicon.webp', '/icons/192.png', '/icons/512.png',
    '/about.html', '/product.html', '/profile.html',
    '/stories.html', '/submit-story.html', '/terms.html',
    '/displayStories.js', '/postStory.js', '/profile.js', '/shared.js',
    '/auth.html', '/chat.html', '/chat.js', '/inbox.html',
    '/inbox.js', '/product.js', '/style.css', '/wishlist.html', '/wishlist.js'
  ],
  blog: [
    '/index.html', '/how-to-sell-fast.html', '/how-to-spot-a-scam.html',
    '/manifest.json', '/icons/192.png', '/icons/512.png'
  ],
  events: [
    '/index.html', /* Add all your events files here */
    '/manifest.json', '/icons/192.png', '/icons/512.png'
  ],
  'lost-and-found': [
    '/index.html', '/post.html', '/main.js', '/post.js',
    '/manifest.json', '/icons/192.png', '/icons/512.png'
  ],
  rentals: [
    '/index.html', '/detail.html', '/post.html',
    '/main.js', '/detail.js', '/post.js',
    '/manifest.json', '/icons/192.png', '/icons/512.png'
  ],
  requests: [
    '/index.html', '/view.html', '/requests.js', '/view.js',
    '/manifest.json', '/icons/192.png', '/icons/512.png'
  ],
  sell: [
    '/index.html', '/sell.js', '/styles.css',
    '/manifest.json', '/icons/192.png', '/icons/512.png'
  ]
};

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Determine the current subdomain
      const hostname = self.location.hostname;
      let subdomain = 'www'; // Default
      if (hostname.includes('blog.')) subdomain = 'blog';
      else if (hostname.includes('events.')) subdomain = 'events';
      else if (hostname.includes('lost-and-found.')) subdomain = 'lost-and-found';
      else if (hostname.includes('rentals.')) subdomain = 'rentals';
      else if (hostname.includes('requests.')) subdomain = 'requests';
      else if (hostname.includes('sell.')) subdomain = 'sell';

      // Get the correct list of files to cache from the manifest
      const filesToCache = fileManifest[subdomain] || [];
      console.log(`Installing SW for ${subdomain}. Caching ${filesToCache.length} files.`);

      return Promise.all(
        filesToCache.map(url =>
          cache.add(url).catch(err => console.warn(`Skipped caching: ${url}`, err))
        )
      );
    })
  );
  self.skipWaiting();
});

// Activate event remains the same
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.map(name => {
          if (name !== CACHE_NAME && name !== IMAGE_CACHE) {
            return caches.delete(name);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch event can remain mostly the same, as it handles general cases
self.addEventListener('fetch', event => {
  const req = event.request;

  // Handle HTML pages with a network-first strategy
  if (req.headers.get('accept')?.includes('text/html')) {
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

  // Handle images with a cache-first strategy
  if (req.destination === 'image') {
    event.respondWith(
      caches.match(req).then(cacheRes => {
        return cacheRes || fetch(req).then(networkRes => {
          const cacheClone = networkRes.clone();
          caches.open(IMAGE_CACHE).then(cache => {
            cache.put(req, cacheClone);
            limitCacheSize(IMAGE_CACHE, 50);
          });
          return networkRes;
        });
      }).catch(() => caches.match('/icons/192.png'))
    );
    return;
  }

  // Handle other assets (CSS, JS) with a cache-first strategy
  event.respondWith(
    caches.match(req).then(cacheRes => {
      return cacheRes || fetch(req).then(networkRes => {
        // Optional: you could add a check here to only cache files from the manifest
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
