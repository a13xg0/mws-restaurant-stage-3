/**
 * Common database helper functions.
 */
class DBHelper {

    /**
     * Database URL.
     * Change this to restaurants.json file location on your server.
     */
    static get DATABASE_URL() {
        const port = 1337; // Change this to your server port
        return `http://localhost:${port}`;
    }

    /**
     *  Open IndexDB database connection
     *
     * @return {*}
     */
    static openDatabase() {
        // If the browser doesn't support service worker,
        // we don't care about having a database
        if (!navigator.serviceWorker) {
            return Promise.resolve();
        }

        return idb.open('rest2', 1, function(upgradeDb) {
            let store = upgradeDb.createObjectStore('restaurants', {
                keyPath: 'id'
            });
            store.createIndex('by-sync', 'sync');

            let review = upgradeDb.createObjectStore('reviews', {
                keyPath: 'id', autoIncrement: true
            });
            review.createIndex('by-restaurant', 'restaurant_id');
            review.createIndex('by-sync', 'sync');
        });
    }

    /**
     * Fetch all restaurants.
     */
    static fetchRestaurants(callback) {
        fetch(`${DBHelper.DATABASE_URL}/restaurants`)
            .then((resp) => {
                return resp.json();
             })
            .then((restaurants) => {
                // cache images
                PictureHelper.forwardCacheImages(restaurants);

                // cache restaurants
                restaurants.forEach((restaurant) => {
                    restaurant.sync = 1;
                    DBHelper.storeRestaurantData(restaurant);
                });

                callback(null, restaurants);
            })
            .catch((msg) => {
                // probably network failure, let's try to fetch data from IndexDB
                DBHelper.openDatabase().then((db) => {
                    let tx = db.transaction('restaurants');
                    let store = tx.objectStore('restaurants');

                    store.getAll().then((restaurants) => {
                        // successful IndexDB response
                        callback(null, restaurants);
                    }).catch((msg) => {
                        const error = (`Request failed. Returned status of ${msg}`);
                        callback(error, null);
                    });
                });
            })
    }

    /**
     * Fetch a restaurant by its ID.
     */
    static fetchRestaurantById(id, callback) {
        fetch(`${DBHelper.DATABASE_URL}/restaurants?id=${id}`)
            .then((resp) => {
                if (resp.status === 404) {
                    callback('Restaurant does not exist', null);
                }
                else {
                    return resp.json();
                }
            })
            .then((restaurant) => {
                restaurant.sync = 1;
                DBHelper.storeRestaurantData(restaurant);
                callback(null, restaurant);
            })
            .catch((msg) => {
                // probably network failure, let's try to fetch data from IndexDB
                DBHelper.openDatabase().then((db) => {
                    let tx = db.transaction('restaurants');
                    let store = tx.objectStore('restaurants');
                    store.get(parseInt(id)).then((restaurant) => {
                        // successful IndexDB response
                        callback(null, restaurant);
                    }).catch((msg) => {
                        const error = (`Request failed. Returned status of ${msg}`);
                        callback(error, null);
                    });
                });
            })
    }

    static storeRestaurantData(restaurant) {
        // save restaurant in DB
        return DBHelper.openDatabase().then(function(db) {
            if (!db) return;

            let tx = db.transaction('restaurants', 'readwrite');
            let store = tx.objectStore('restaurants');
            store.put(restaurant);
        })
    }

    /**
     * Fetch restaurants by a cuisine type with proper error handling.
     */
    static fetchRestaurantByCuisine(cuisine, callback) {
        // Fetch all restaurants  with proper error handling
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                // Filter restaurants to have only given cuisine type
                const results = restaurants.filter(r => r.cuisine_type === cuisine);
                callback(null, results);
            }
        });
    }

    /**
     * Fetch restaurants by a neighborhood with proper error handling.
     */
    static fetchRestaurantByNeighborhood(neighborhood, callback) {
        // Fetch all restaurants
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                // Filter restaurants to have only given neighborhood
                const results = restaurants.filter(r => r.neighborhood === neighborhood);
                callback(null, results);
            }
        });
    }

    /**
     * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
     */
    static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
        // Fetch all restaurants
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                let results = restaurants;
                if (cuisine !== 'all') { // filter by cuisine
                    results = results.filter(r => r.cuisine_type === cuisine);
                }
                if (neighborhood !== 'all') { // filter by neighborhood
                    results = results.filter(r => r.neighborhood === neighborhood);
                }
                callback(null, results);
            }
        });
    }

    /**
     * Fetch all neighborhoods with proper error handling.
     */
    static fetchNeighborhoods(callback) {
        // Fetch all restaurants
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                // Get all neighborhoods from all restaurants
                const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood);
                // Remove duplicates from neighborhoods
                const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) === i);
                callback(null, uniqueNeighborhoods);
            }
        });
    }

    /**
     * Fetch all cuisines with proper error handling.
     */
    static fetchCuisines(callback) {
        // Fetch all restaurants
        DBHelper.fetchRestaurants((error, restaurants) => {
            if (error) {
                callback(error, null);
            } else {
                // Get all cuisines from all restaurants
                const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
                // Remove duplicates from cuisines
                const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) === i);
                callback(null, uniqueCuisines);
            }
        });
    }

    /**
     * Restaurant page URL.
     */
    static urlForRestaurant(restaurant) {
        return (`./restaurant.html?id=${restaurant.id}`);
    }

    /**
     * Restaurant image fallback URL.
     */
    static imageUrlForRestaurant(restaurant) {
        return (`/img/${restaurant.photograph}-800_1x.jpg`);
    }

    /**
     * Restaurant loq quality image fallback URL.
     */
    static imageLQUrlForRestaurant(restaurant) {
        return (`/img/${restaurant.photograph}-low.jpg`);
    }


    /**
     * Restaurant image srcset
     */

    /**
     * Map marker for a restaurant.
     */
    static mapMarkerForRestaurant(restaurant, map) {
        // https://leafletjs.com/reference-1.3.0.html#marker
        const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
            {
                title: restaurant.name,
                alt: restaurant.name,
                url: DBHelper.urlForRestaurant(restaurant)
            });
        marker.addTo(newMap);
        return marker;
    }

    /**
     * Set marker value and save in to DB
     *
     * @param restaurant
     * @param marker
     */
    static setFavoriteMark(restaurant, marker) {
        let isFavorite = JSON.parse(marker.getAttribute('aria-checked'));

        isFavorite = !isFavorite;

        DBHelper.constructFavoriteMark(marker, isFavorite);
        DBHelper.saveFavoriteMark(restaurant, isFavorite);
    }

    static saveFavoriteMark(restaurant, isFavorite) {
        // todo: register service worker event sync with tag: "restaurant update"

        restaurant.sync = 0;
        restaurant.is_favorite = isFavorite;

        DBHelper.storeRestaurantData(restaurant).then(() => {
            navigator.serviceWorker.ready.then(function(swRegistration) {
                return swRegistration.sync.register('sync-favorites');
            });
        });
    }

    /**
     * Set attributes for favorite marker based on passed value
     *
     * @param marker
     * @param isFavorite
     */
    static constructFavoriteMark(marker, isFavorite) {
        isFavorite = JSON.parse(isFavorite);
        marker.setAttribute('aria-checked', isFavorite);

        if (isFavorite === true) {
            marker.className = "fas fa-heart fav-btn";
        }
        else {
            marker.className = "far fa-heart fav-btn";
        }
    }

    /**
     * Load reviews form remote database and update local cache
     * @param restaurantId
     * @param restaurantName
     * @param container
     * @param reviewList
     */
    static loadReviews(restaurantId, restaurantName, container, reviewList) {
        fetch(
            `${DBHelper.DATABASE_URL}/reviews/?restaurant_id=${restaurantId}`
        )
        .then((response) => {
            return response.json();
            })
        .then((reviews) => {
            if (reviews && reviews.length > 0) {
                reviews.forEach(review => {
                    reviewList.appendChild(createReviewHTML(review, restaurantName));
                    review.sync = 1;
                    DBHelper.storeReviewData(review);
                });
                container.appendChild(reviewList);
            }
            else {
                const noReviews = document.createElement('p');
                noReviews.innerHTML = 'No reviews yet!';
                container.appendChild(noReviews);
            }
        })
        .catch((msg) => {
            // probably network failure, let's try to fetch data from IndexDB
            DBHelper.openDatabase().then((db) => {
                let tx = db.transaction('reviews');
                let store = tx.objectStore('reviews');
                let idx = store.index('by-restaurant');
                idx.getAll(parseInt(restaurantId)).then((reviews) => {
                    // successful IndexDB response
                    reviews.forEach(review => {
                        reviewList.appendChild(createReviewHTML(review, restaurantName));
                    });

                    container.appendChild(reviewList);

                }).catch((msg) => {
                    const error = (`Request failed. Returned status of ${msg}`);
                });
            });
        })
    }

    /**
     * Save review data into database
     * @param review
     * @return {PromiseLike<T | never> | Promise<T | never>}
     */
    static storeReviewData(review) {
        return DBHelper.openDatabase().then((db) => {
            let tx = db.transaction('reviews', 'readwrite');
            let store = tx.objectStore('reviews');
            store.put(review);
            return tx.complete;
        })
    }

    /**
     * Fill review structure and initiate saving
     *
     * @param restaurantId
     * @param rating
     * @param userName
     * @param comments
     * @return {PromiseLike<T | never> | Promise<T | never>}
     */
    static sendReview(restaurantId, rating, userName, comments) {
        let dt = new Date();
        const review = {
            restaurant_id: restaurantId,
            name: userName,
            rating: rating,
            comments: comments,
            sync: 0,
            updatedAt: dt.getTime(),
            createdAd: dt.getTime()
        };

        return DBHelper.storeReviewData(review).then(()=>{
            navigator.serviceWorker.ready.then(function(swRegistration) {
                return swRegistration.sync.register('sync-reviews');
            });
        });
    }
}

