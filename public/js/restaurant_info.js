let restaurant;
var newMap;

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
    initMap();
});

/**
 * Initialize leaflet map
 */
initMap = () => {
    fetchRestaurantFromURL((error, restaurant) => {
        if (error) { // Got an error!
            console.error(error);
        } else {
            self.newMap = L.map('map', {
                center: [restaurant.latlng.lat, restaurant.latlng.lng],
                zoom: 16,
                scrollWheelZoom: false
            });
            L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
                mapboxToken: 'pk.eyJ1IjoiYTEzeGcwIiwiYSI6ImNqanA1dTgzYTE1ejczcW9uOTBjM2V1eGUifQ.TAPh1Fv_rYEfoWw5T79kNg',
                maxZoom: 18,
                attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
                    '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
                    'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
                id: 'mapbox.streets'
            }).addTo(newMap);
            fillBreadcrumb();
            DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
        }
    });
};

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
    if (self.restaurant) { // restaurant already fetched!
        callback(null, self.restaurant);
        return;
    }
    const id = getParameterByName('id');
    if (!id) { // no id found in URL
        let error = 'No restaurant id in URL';
        callback(error, null);
    } else {
        DBHelper.fetchRestaurantById(id, (error, restaurant) => {
            self.restaurant = restaurant;
            if (!restaurant) {
                console.error(error);
                return;
            }
            fillRestaurantHTML();
            callback(null, restaurant)
        });
    }
};

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
    const name = document.getElementById('restaurant-name');
    name.innerHTML = restaurant.name;

    const address = document.getElementById('restaurant-address');
    address.innerHTML = restaurant.address;

    const image = document.getElementById('restaurant-img');

    PictureHelper.constructPictureTag(image, restaurant);

    const cuisine = document.getElementById('restaurant-cuisine');
    cuisine.innerHTML = restaurant.cuisine_type;

    const cuisineDescr = document.getElementById('restaurant-cuisine-description');
    cuisineDescr.innerHTML = `This restaurant provides ${restaurant.cuisine_type} cuisine`;

    const favorite = document.getElementById('restaurant-favorite');
    favorite.onclick = favorite.onkeypress = function() { DBHelper.setFavoriteMark(restaurant, favorite); event.stopPropagation();};
    DBHelper.constructFavoriteMark(favorite, restaurant.is_favorite);

    // fill operating hours
    if (restaurant.operating_hours) {
        fillRestaurantHoursHTML();
    }
    // fill reviews
    fillReviewsHTML();
};

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
    const hoursTable = document.getElementById('restaurant-hours');
    for (let key in operatingHours) {
        if (operatingHours.hasOwnProperty(key)) {
            const row = document.createElement('tr');
            row.setAttribute('itemprop', 'openingHoursSpecification');
            row.setAttribute('itemscope', '');
            row.setAttribute('itemtype', 'http://schema.org/OpeningHoursSpecification');

            const day = document.createElement('td');
            day.innerHTML = key;
            day.setAttribute('itemprop', 'dayOfWeek');
            row.appendChild(day);

            const time = document.createElement('td');
            const periods = operatingHours[key].split(',');
            periods.map(e => e.trim());
            periods.forEach((e, i) => {
                const hours = e.split('-');
                hours.map(e => e.trim());

                const opens = document.createElement('time');
                opens.setAttribute('itemprop', 'opens');
                opens.innerHTML = hours[0];
                time.appendChild(opens);

                const separator = document.createElement('span');
                separator.innerHTML = ' - ';
                time.append(separator);

                const closes = document.createElement('time');
                closes.setAttribute('itemprop', 'closes');
                closes.innerHTML = hours[1];
                time.appendChild(closes);

                if (i < periods.length - 1) {
                    const period = document.createElement('span');
                    period.innerHTML = ', ';
                    time.append(period);
                }
            });

            row.appendChild(time);
            hoursTable.appendChild(row);
        }
    }
};

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.restaurant.reviews, restaurantName = self.restaurant.name) => {
    const container = document.getElementById('reviews-container');
    const title = document.createElement('h3');
    title.innerHTML = 'Reviews';
    container.appendChild(title);

    if (!reviews) {
        const noReviews = document.createElement('p');
        noReviews.innerHTML = 'No reviews yet!';
        container.appendChild(noReviews);
        return;
    }
    const ul = document.getElementById('reviews-list');
    reviews.forEach(review => {
        ul.appendChild(createReviewHTML(review, restaurantName));
    });
    container.appendChild(ul);
};

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review, restaurantName) => {
    const li = document.createElement('li');
    li.className = 'hreview';

    const header = document.createElement('header');
    header.className = 'user-review-header';
    const vcard = document.createElement('span');
    vcard.className = 'item-hidden item vcard';

    const restaurantNameContainer = document.createElement('span');
    restaurantNameContainer.className = 'item-hidden fn org';
    restaurantNameContainer.innerHTML = restaurantName;
    vcard.appendChild(restaurantNameContainer);

    const categoryName = document.createElement('span');
    categoryName.className = 'item-hidden category';
    categoryName.innerHTML = 'Restaurant';
    vcard.appendChild(categoryName);

    header.appendChild(vcard);

    const name = document.createElement('span');
    name.innerHTML = review.name;
    name.className = 'user-review-name reviewer vcard';
    header.appendChild(name);

    const date = document.createElement('time');
    date.innerHTML = review.date;
    date.className = 'user-review-date dtreviewed';
    header.appendChild(date);

    li.appendChild(header);

    const rating = document.createElement('p');
    rating.innerHTML = `Rating: ${review.rating}`;
    rating.className = 'user-review-rating rating';
    li.appendChild(rating);

    const comments = document.createElement('article');
    comments.innerHTML = review.comments;
    comments.className = 'user-review-comment summary';
    li.appendChild(comments);

    return li;
};

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant = self.restaurant) => {
    const breadcrumb = document.getElementById('breadcrumb');
    const li = document.createElement('li');
    li.innerHTML = restaurant.name;
    breadcrumb.appendChild(li);
};

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
    if (!url)
        url = window.location.href;
    name = name.replace(/[\[\]]/g, '\\$&');
    const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
        results = regex.exec(url);
    if (!results)
        return null;
    if (!results[2])
        return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
};
