// sw.js (CLEANED UP - ONLY FOR CACHING)

const CACHE_NAME = 'kabaleonline-cache-v7';
const IMAGE_CACHE = 'kabaleonline-images-v1';

const CORE_FILES = [
  '/', '/index.html', '/offline.html',
  '/styles.css', '/main.js',
  '/auth.js', '/firebase.js',
  '/nav.js', '/ui.js',
  '/manifest.json', '/favicon.webp',
  '/icons/192.png', '/icons/512.png'
];

const OPTIONAL_FILES = [
  '/about.html', '/product.html', '/profile.html',
  '/stories.html', '/submit-story.html', '/terms.html',
  '/displayStories.js', '/postStory.js', '/profile.js', '/shared.js',
  '/auth.html',
  '/chat.html',
  '/chat.js',
  '/inbox.html',
  '/inbox.js',
  '/product.js',
  '/style.css',
  '/wishlist.html',
  '/wishlist.js',
  '/blog/', '/blog/index.html',
  '/blog/how-to-sell-fast.html',
  '/blog/how-to-spot-a-scam.html',
  '/lost-and-found/', '/lost-and-found/index.html',
  '/lost-and-found/post.html',
  '/lost-and-found/main.js', '/lost-and-found/post.js',
  '/rentals/', '/rentals/index.html',
  '/rentals/detail.html', '/rentals/post.html',
  '/rentals/main.js', '/rentals/detail.js', '/rentals/post.js',
  '/requests/', '/requests/index.html',
  '/requests/view.html',
  '/requests/requests.js', '/requests/view.js',
  '/sell/', '/sell/index.html',
  '/sell/sell.js', '/sell/styles.css'
];


self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.all(
        CORE_FILES.map(url =>
          cache.add(url).catch(err => console.warn('Skipped', url, err))
        )
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
  const url = new URL(req.url);

  if (req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then(networkRes =>
          caches.open(CACHE_NAME).then(cache => {
            cache.put(req, networkRes.clone());
            return networkRes;
          })
        )
        .catch(() =>
          caches.match(req).then(cacheRes => cacheRes || caches.match('/offline.html'))
        )
    );
    return;
  }

  if (req.destination === 'image') {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async cache => {
        const cached = await cache.match(req);
        if (cached) return cached;

        try {
          const networkRes = await fetch(req);
          cache.put(req, networkRes.clone());
          limitCacheSize(IMAGE_CACHE, 50);
          return networkRes;
        } catch (err) {
          return caches.match('/icons/192.png');
        }
      })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cacheRes => {
      return (
        cacheRes ||
        fetch(req).then(networkRes => {
          if (OPTIONAL_FILES.includes(url.pathname)) {
            caches.open(CACHE_NAME).then(cache => cache.put(req, networkRes.clone()));
          }
          return networkRes;
        })
      );
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
