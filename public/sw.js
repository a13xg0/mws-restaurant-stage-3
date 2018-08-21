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
                '/css/fontello.css',
                '/webfonts/fontello.woff2'
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
                '/js/radiogroup.min.js',
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

/**
 * Manage sync event and according the tag it calls appropriate event handler
 *
 */
self.addEventListener('sync', function(event) {
    if (event.tag === 'sync-reviews') {
        event.waitUntil(processReviewSync());
    }

    if (event.tag === 'sync-favorites') {
        event.waitUntil(processRestaurantSync());
    }
});

// these IndexDB functions without promised idb library, because service worker works
// in the separate context
/**
 * Handle sync event for reviews
 *
 * @return {Promise<any>}
 */
function processReviewSync() {
    return new Promise((resolve, reject) => {
        let request = indexedDB.open('rest2', 1);

        request.onsuccess = function (event) {
            let db = event.target.result;
            let transaction = db.transaction(['reviews']);
            let store = transaction.objectStore('reviews');

            let idx = store.index('by-sync');
            let req = idx.getAll(IDBKeyRange.only(0));

            req.onsuccess = (event) => {
                let reviews = event.target.result;
                reviews.forEach((review) => {
                    return fetch(
                        `http://localhost:1337/reviews/`,
                        {
                            method: 'POST',
                            body: JSON.stringify(review)
                        }).then(() => {
                            review.sync = 1;
                            storeReviewData(review);
                        }).catch((e) => {
                           reject(e);
                        });
                });
                resolve();
            };

            req.onerror = () => {reject()};
        };
    });
}

/**
 * Save review data into indexeddb
 * @param review
 */
function  storeReviewData(review) {
    let request = indexedDB.open('rest2', 1);

    request.onsuccess = function (event) {
        let db = event.target.result;
        let transaction = db.transaction(['reviews'], 'readwrite');
        let store = transaction.objectStore('reviews');

        store.put(review);
    };
}

/**
 * Handle sync event. Fetch all non-synced restaurants and try to put it in remote server
 *
 * @return {Promise<any>}
 */
function processRestaurantSync() {
    return new Promise((resolve, reject) => {
        let request = indexedDB.open('rest2', 1);

        request.onsuccess = function (event) {
            let db = event.target.result;
            let transaction = db.transaction(['restaurants']);
            let store = transaction.objectStore('restaurants');

            let idx = store.index('by-sync');
            let req = idx.getAll(IDBKeyRange.only(0));

            req.onsuccess = (event) => {
                let restaurants = event.target.result;
                restaurants.forEach((restaurant) => {
                    return fetch(
                        `http://localhost:1337/restaurants/${restaurant.id}/?is_favorite=${restaurant.is_favorite}`,
                        {
                            method: 'PUT'
                        }).then(() => {
                            restaurant.sync = 1;
                            storeRestaurantData(restaurant);
                        }).catch((e) => {
                            reject(e);
                        });
                });
                resolve();
            };

            req.onerror = () => {reject()};
        };
    });
}

/**
 * Save restaurant data into indexeddb
 *
 * @param restaurant
 */
function  storeRestaurantData(restaurant) {
    let request = indexedDB.open('rest2', 1);

    request.onsuccess = function (event) {
        let db = event.target.result;
        let transaction = db.transaction(['restaurants'], 'readwrite');
        let store = transaction.objectStore('restaurants');

        store.put(restaurant);
    };
}
