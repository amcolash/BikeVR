// Update cache name to update service worker
var CACHE = 'cache-and-update-1';

// On install, cache some resources.
self.addEventListener('install', event => {
    console.log('The service worker is being installed.');

    // Wipe old caches
    event.waitUntil(
        caches.keys().then(cacheNames => {
          return Promise.all(
            cacheNames.filter(cacheName => {
                return cacheName !== CACHE;
            }).map(cacheName => {
                console.log("Deleting old service worker cache", cacheName);
                return caches.delete(cacheName);
            })
          );
        })
    );
});

// Try to open from cache, if missing fetch and then cache it
self.addEventListener('fetch', event => {
    const url = event.request.url;

    // If we are talking with google, cache things
    if (url.indexOf("maps.google") !== -1) {
        event.respondWith(
            caches.open(CACHE).then(cache => {
                return cache.match(event.request).then(response => {
                    return response || fetch(event.request).then(response => {
                        cache.put(event.request, response.clone());
                        return response;
                    });
                });
            })
        );
    } else {
        // Nothing else is fetched from cache
        event.respondWith(
            fetch(event.request).then(response => {
                return response;
            })
        );
    }
});