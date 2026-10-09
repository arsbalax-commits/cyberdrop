const CACHE = 'cyberdrop-v8';
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
            .filter(function(key) { return key !== CACHE; })
            .map(function(key) { return caches.delete(key); })
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
      url.origin === self.location.origin && (
        /\/index\.html$/i.test(url.pathname) ||
        /\/supabase-config\.js$/i.test(url.pathname) ||
        /\/manifest\.json$/i.test(url.pathname)
      )
    );
  } catch (e) {
    return false;
  }
}

function isCloudRequest(req) {
  try {
    var url = new URL(req.url);
    // Supabase REST/Auth responses must NEVER be cached by the PWA.
    // Otherwise a GET can return an old profile balance after reload.
    return /(^|\.)supabase\.co$/i.test(url.hostname) || /(^|\.)supabase\.in$/i.test(url.hostname);
  } catch (e) {
    return false;
  }
}

self.addEventListener('fetch', function(event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  // Cloud API calls are always network-only. This is critical for credits,
  // inventory and auth state: never serve stale Supabase data from the SW cache.
  if (isCloudRequest(req)) {
    event.respondWith(fetch(req, { cache: 'no-store' }));
    return;
  }

  // Always prefer the current deployed application shell.
  if (isLiveAppRequest(req)) {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(function(res) {
          var copy = res.clone();
          caches.open(CACHE)
            .then(function(cache) { return cache.put(req, copy); })
            .catch(function() {});
          return res;
        })
        .catch(function() {
          return caches.match(req).then(function(cached) {
            if (cached) return cached;
            if (req.mode === 'navigate') return caches.match('./index.html');
            return new Response('', { status: 503, statusText: 'Offline' });
          });
        })
    );
    return;
  }

  // Same-origin static assets can use cache-first for fast/offline startup.
  // Other cross-origin GETs are network-only and are not stored in our cache.
  var sameOrigin = false;
  try { sameOrigin = new URL(req.url).origin === self.location.origin; } catch (e) {}
  if (!sameOrigin) {
    event.respondWith(fetch(req, { cache: 'no-store' }));
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
              .then(function(cache) { return cache.put(req, copy); })
              .catch(function() {});
            return res;
          })
          .catch(function() {
            return new Response('', { status: 503, statusText: 'Offline' });
          });
      })
  );
});
