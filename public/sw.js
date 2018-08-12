/**
 * Service worker logic
 */

const staticCacheName = 'rest1-static-v1';
const contentImgsCache = 'rest1-content-imgs';
const mapTilesCache = 'rest1-map-tiles';
const allCaches = [
    staticCacheName,
    contentImgsCache,
    mapTilesCache
];

self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(staticCacheName).then(function (cache) {
            // cache big resources
            cache.addAll([
                'https://unpkg.com/leaflet@1.3.1/dist/leaflet.css',
                'https://unpkg.com/leaflet@1.3.1/dist/leaflet.js',
                'https://unpkg.com/leaflet@1.3.1/dist/images/marker-icon.png',
                'https://unpkg.com/leaflet@1.3.1/dist/images/marker-shadow.png',
                '/img/icons-512.png',
                '/img/icons-192.png',
                'https://use.fontawesome.com/releases/v5.2.0/css/solid.css',
                'https://use.fontawesome.com/releases/v5.2.0/css/regular.css',
                'https://use.fontawesome.com/releases/v5.2.0/css/fontawesome.css'
            ]);

            // cache critical resources
            return cache.addAll([
                '/',
                '/manifest.json',
                '/index.html',
                '/restaurant.html',
                '/js/idb.min.js',
                '/js/main.min.js',
                '/js/dbhelper.min.js',
                '/js/picturehelper.min.js',
                '/js/restaurant_info.min.js',
                '/css/styles.min.css'
            ]);
        }, function (msg) {
            console.log(msg);
        })
    );
});

self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(function (cacheNames) {
            return Promise.all(
                cacheNames.filter(function (cacheName) {
                    return cacheName.startsWith('rest1-') && !allCaches.includes(cacheName);
                }).map(function (cacheName) {
                    return caches.delete(cacheName);
                })
            );
        })
    );
});

self.addEventListener('fetch', function (event) {
    var requestUrl = new URL(event.request.url);

    if (requestUrl.origin === location.origin) {

        if (requestUrl.pathname.startsWith('/restaurant.html')) {
            event.respondWith(
                caches.match('/restaurant.html').then(function (response) {
                    return response || fetch(event.request);
                })
            );
            return;
        }

        if (requestUrl.pathname.startsWith('/img/')) {
            event.respondWith(servePhoto(event.request));
            return;
        }
    }
    if (requestUrl.origin === 'https://api.tiles.mapbox.com') {
        event.respondWith(serveMapTiles(event.request));
        return;
    }

    event.respondWith(
        caches.match(event.request).then(function (response) {
            return response || fetch(event.request);
        })
    );


});

/**
 * Serve map tiles from mapbox
 * @param request
 * @return {Promise<Response | never | never>}
 */
function serveMapTiles(request) {
    return caches.open(mapTilesCache).then(function (cache) {
        return cache.match(request.url).then(function (response) {
            if (response) {
                try {
                    fetch(request).then(function (networkResponse) {
                        cache.put(request.url, networkResponse);

                    })
                }
                finally {
                    return response;
                }
            }

            return fetch(request).then(function (networkResponse) {
                cache.put(request.url, networkResponse.clone());
                return networkResponse;
            });
        });
    });
}

/**
 * Serve map photos, it stores the first fetched photo as a cached image despite any other image sizes
 *
 * @param request
 * @return {Promise<Response | never | never>}
 */
function servePhoto(request) {
    const storageUrl = request.url.replace(/-\d*_\dx\.jpg$/, '');

    return caches.open(contentImgsCache).then(function (cache) {
        return cache.match(storageUrl).then(function (response) {
            if (response) return response;

            return fetch(request).then(function (networkResponse) {
                cache.put(storageUrl, networkResponse.clone());
                return networkResponse;
            });
        });
    });
}

self.addEventListener('message', function (event) {
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});
