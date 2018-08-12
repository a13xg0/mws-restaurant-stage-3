/**
 * Common picture formatting helper functions.
 */
class PictureHelper {


    /**
     * Create picture element with predefined image types and
     * appropriate media queries for resolutions
     * @param {Element} pictureElement
     * @param {Object} restaurantInfo
     */
    static constructPictureTag(pictureElement, restaurantInfo) {
        // These two sources works well on both pages pig and small, because on both of them we fall on two-columns
        // layout after 700px  we didn't add third source because it is usable for desktop devices, where bandwidth are
        // not limited and third condition of switching would add redundant complexity

        const sourceSmall = document.createElement('source');
        sourceSmall.setAttribute('data-srcset', `img/${restaurantInfo.photograph}-400_1x.jpg 1x, img/${restaurantInfo.photograph}-800_2x.jpg 2x`);
        sourceSmall.srcset = `img/${restaurantInfo.photograph}-low.jpg 1x, img/${restaurantInfo.photograph}-low.jpg 2x`;
        sourceSmall.media = '(max-width: 500px), (min-width:701px) and (max-width:900px)';

        pictureElement.appendChild(sourceSmall);

        const sourceBig = document.createElement('source');
        sourceBig.setAttribute('data-srcset',`img/${restaurantInfo.photograph}-800_1x.jpg 1x, img/${restaurantInfo.photograph}-1600_2x.jpg 2x`);
        sourceBig.srcset = `img/${restaurantInfo.photograph}-low.jpg 1x, img/${restaurantInfo.photograph}-low.jpg 2x`;
        sourceBig.media = '(min-width: 501px) and (max-width: 700px), (min-width:901px)';

        pictureElement.appendChild(sourceBig);

        // create fallback image
        const image = document.createElement('img');
        image.className = 'restaurant-img photo';
        image.setAttribute('data-src',DBHelper.imageUrlForRestaurant(restaurantInfo));
        image.src = DBHelper.imageLQUrlForRestaurant(restaurantInfo);
        image.alt = restaurantInfo.photo_alt;
        image.title = restaurantInfo.name;
        image.onload = PictureHelper.lazyLoadImage;

        pictureElement.appendChild(image);

    }

    /**
     * Event handler for first variant loaded images. It switch to full quality content after blurred loading is done
     * @param event
     */
    static lazyLoadImage(event) {
        let el = event.srcElement;

        el.setAttribute('src', el.getAttribute('data-src'));
        el.onload = function() {
            el.removeAttribute('data-src');
        };
        [].forEach.call(el.parentElement.querySelectorAll('source[data-srcset]'), function(srcset) {
            srcset.setAttribute('srcset', srcset.getAttribute('data-srcset'));
            srcset.onload = function() {
                srcset.removeAttribute('data-srcset');
            };
        });
    }

    /**
     * Prefetch images after first load
     * @param restaurants
     */
    static forwardCacheImages(restaurants) {
        const contentImgsCache = 'rest1-content-imgs';

        let imagesToCache = [];

        restaurants.forEach((item) => {
            imagesToCache.push(DBHelper.imageLQUrlForRestaurant(item));
            imagesToCache.push(`img/${item.photograph}-400_1x.jpg`);
            imagesToCache.push(`img/${item.photograph}-800_1x.jpg`);
            imagesToCache.push(`img/${item.photograph}-800_2x.jpg`);
            imagesToCache.push(`img/${item.photograph}-1600_2x.jpg`);
        });

        caches.open(contentImgsCache).then((cache) => {

            imagesToCache.forEach((url) => {
                const storageUrl = url.replace(/-\d*_\dx\.jpg$/, '');


                return cache.match(storageUrl).then(function (response) {
                    if (response) return response;

                    return fetch(url).then(function (networkResponse) {
                        cache.put(storageUrl, networkResponse.clone());
                        return networkResponse;
                    });
                })
            });

        }, (msg) => {
            console.log(msg);
        })

    }
}
