import DBHelper from './dbhelper';

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  initMap();
  const reviewFormRating = document.querySelector('.review-form-rating');
  const btnSubmitReview = document.querySelector('.btn-submit-review');

  reviewFormRating.addEventListener('change', validateRating);
  reviewFormRating.addEventListener('keyup', validateRating);
  btnSubmitReview.addEventListener('click', addReview);
});

/**
 * Initialize leaflet map
 */
const initMap = () => {
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
        mapboxToken: 'pk.eyJ1IjoiYW51cmFnLW1hanVtZGFyIiwiYSI6ImNqaXhkaGNpOTBmZ2kzcXBkZmtiemtqcGIifQ.-tKg88uRBbmhD74sr6boKw',
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
          '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
          'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox.streets'
      }).addTo(self.newMap);
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
    }
  });
}

/**
 * Get current restaurant from page URL.
 */
const fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
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
}

/**
 * Create restaurant HTML and add it to the webpage
 */
const fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const picture = document.getElementById('restaurant-picture');
  const webPsource = document.createElement('source');
  const jpegSource = document.createElement('source');

  webPsource.srcset = DBHelper.webPImageUrlForRestaurant(restaurant);
  webPsource.type = 'image/webp';

  jpegSource.srcset = DBHelper.jpegImageUrlForRestaurant(restaurant);
  jpegSource.type = 'image/jpeg';

  const image = document.createElement('img');
  image.id = 'restaurant-img';
  image.className = 'restaurant-img'
  image.src = DBHelper.jpegImageUrlForRestaurant(restaurant);
  // Add alt-text for image according to restaurant name.
  image.alt = `Name of the restaurant: ${restaurant.name}`;

  picture.appendChild(webPsource);
  picture.appendChild(jpegSource);
  picture.appendChild(image);

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
const fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
};

/**
 * Create all reviews HTML and add them to the webpage.
 */
const fillReviewsHTML = () => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h2');
  title.innerHTML = 'Reviews';
  container.insertAdjacentElement('afterbegin', title);

  const reviewForm = document.querySelector('.review-input');
  const restaurantId = self.restaurant.id;
  DBHelper.fetchRestaurantReviewsById(restaurantId)
    .then(reviews => {
      if (!reviews || (reviews && reviews.length === 0)) {
        const noReviews = document.createElement('p');
        noReviews.innerHTML = 'No reviews yet!';
        container.insertBefore(noReviews, reviewForm);
        return;
      }
      const ul = document.getElementById('reviews-list');
      reviews.forEach(review => {
        ul.appendChild(createReviewHTML(review));
      });
    })
    .catch(_ => {
      const noReviews = document.createElement('p');
      noReviews.innerHTML = 'No reviews yet!';
      container.insertBefore(noReviews, reviewForm);
    });
}

/**
 * Create review HTML and add it to the webpage.
 */
const createReviewHTML = (review) => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.className = 'review-name';
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement('p');
  date.className = 'review-date';
  const updatedCommentDate = new Date(review.updatedAt);
  date.innerHTML = updatedCommentDate.toLocaleDateString();
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.className = 'review-rating';
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.className = 'review-comments';
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}

/**
 * Validate rating entered by user.
 */
const validateRating = (event) => {
  const rating = event.target.value;
  if (rating < 0) {
    event.target.value = 1;
  } else if (rating > 5) {
    event.target.value = 5;
  }
};

/**
 * Add review entered by user.
 */
const addReview = () => {
  const name = document.querySelector('.review-form-name');
  const rating = document.querySelector('.review-form-rating');
  const comments = document.querySelector('.review-form-comments');

  const review = {
    "restaurant_id": self.restaurant.id,
    "name": name.value,
    "rating": rating.value,
    "comments": comments.textContent
  };

  DBHelper.postReview(review);

};

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
const fillBreadcrumb = (restaurant = self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
const getParameterByName = (name, url) => {
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
}