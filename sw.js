const CACHE = 'cyberdrop-v3';
const CORE = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE)
      .then(function(cache) {
        return cache.addAll(CORE);
      })
      .then(function() {
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys()
      .then(function(keys) {
        return Promise.all(
          keys
            .filter(function(key) {
              return key !== CACHE;
            })
            .map(function(key) {
              return caches.delete(key);
            })
        );
      })
      .then(function() {
        return self.clients.claim();
      })
  );
});

function isLiveAppRequest(req) {
  if (req.mode === 'navigate') return true;

  try {
    var url = new URL(req.url);

    return (
      /\/index\.html$/i.test(url.pathname) ||
      /\/supabase-config\.js$/i.test(url.pathname) ||
      /\/manifest\.json$/i.test(url.pathname)
    );
  } catch (e) {
    return false;
  }
}

self.addEventListener('fetch', function(event) {
  var req = event.request;

  if (req.method !== 'GET') return;

  if (isLiveAppRequest(req)) {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(function(res) {
          var copy = res.clone();

          caches.open(CACHE)
            .then(function(cache) {
              cache.put(req, copy);
            })
            .catch(function() {});

          return res;
        })
        .catch(function() {
          return caches.match(req).then(function(cached) {
            if (cached) return cached;

            if (req.mode === 'navigate') {
              return caches.match('./index.html');
            }

            return new Response('', {
              status: 503,
              statusText: 'Offline'
            });
          });
        })
    );

    return;
  }

  event.respondWith(
    caches.match(req)
      .then(function(cached) {
        if (cached) return cached;

        return fetch(req)
          .then(function(res) {
            var copy = res.clone();

            caches.open(CACHE)
              .then(function(cache) {
                cache.put(req, copy);
              })
              .catch(function() {});

            return res;
          })
          .catch(function() {
            return new Response('', {
              status: 503,
              statusText: 'Offline'
            });
          });
      })
  );
});
