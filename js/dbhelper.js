/**
 * Common database helper functions.
 */
import idb from 'idb';

export let reviewsToBeSynced = [];
export let restaurantsToBeSynced = [];

/**
 * Generic toast message
 */
export class Toast {
  static showToast(message) {
    const toast = document.querySelector('section.toast');

    toast.textContent = message;
    Toast.makeToastVisible(toast);

    setTimeout(() => {
      Toast.makeToastHidden(toast);
    }, 5000);
  }

  static makeToastVisible(toast) {
    toast.classList.add('show');
    toast.classList.remove('hide');
  }

  static makeToastHidden(toast) {
    toast.classList.remove('show');
    toast.classList.add('hide');
  }

}

export class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get RESTAURANTS_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  /**
   * Initialize restaurant-db database in IndexedDB
   */
  static idbInit() {
    return idb.open('restaurant-db', 2, function (upgradeDb) {
      switch (upgradeDb.oldVersion) {
        case 0:
          upgradeDb.createObjectStore('restaurants');
        case 1:
          upgradeDb.createObjectStore('reviews');
      }
    });
  }

  /**
   * Fetch restaurants from restaurant-list.
   */
  static getRestaurantsFromDb(dbPromise) {
    return dbPromise.then((db) => {
      if (!db) return;
      let tx = db.transaction('restaurants');
      let restaurantsStore = tx.objectStore('restaurants');
      return restaurantsStore.get('restaurant-list');
    });
  }

  /**
   * Update restaurants to restaurant-list.
   */
  static updateRestaurantsToDB(dbPromise, restaurants) {
    return dbPromise.then((db) => {
      if (!db) return;
      let tx = db.transaction('restaurants', 'readwrite');
      let restaurantsStore = tx.objectStore('restaurants');
      restaurantsStore.put(restaurants, 'restaurant-list');
      tx.complete;
    });
  }

  /**
   * Fetch all restaurants using cache first or network first strategies with fallback.
   */
  static fetchRestaurants(callback) {
    const dbPromise = DBHelper.idbInit();

    // Network then cache strategy - restaurants.
    if (navigator.onLine) {
      fetch(DBHelper.RESTAURANTS_URL)
        .then(response => response.json())
        .then(restaurants => {
          if (!restaurants || (restaurants && restaurants.length === 0)) throw new Error('Restaurants not found');
          DBHelper.updateRestaurantsToDB(dbPromise, restaurants);
          callback(null, restaurants);
        }).catch(_ => {
          DBHelper.getRestaurantsFromDb(dbPromise)
            .then((restaurants) => {
              if (restaurants && restaurants.length > 0) {
                callback(null, restaurants);
              }
            });
        });
    } else {
      // Cache then network strategy - restaurants.
      DBHelper.getRestaurantsFromDb(dbPromise)
        .then((restaurants) => {
          if (restaurants && restaurants.length > 0) {
            callback(null, restaurants);
          } else {
            fetch(DBHelper.RESTAURANTS_URL)
              .then(response => {
                if (!response) throw new Error('No server response!');
                return response.json();
              }).then(restaurants => {
                if (!restaurants) return;
                DBHelper.updateRestaurantsToDB(dbPromise, restaurants);
                callback(null, restaurants);
              });
          }
        }).catch((error) => {
          // Oops!. Got an error from server or some error while operations!
          const errorMessage = (`Request failed. Error message: ${error}`);
          callback(errorMessage, null);
        });
    }

  }

  /**
   * Fetch reviews by restaurant ID using cache first or network first strategies with fallback.
   */
  static getReviewsByRestaurantFromDb(dbPromise, restaurantId) {
    return dbPromise.then((db) => {
      if (!db) return;
      let tx = db.transaction('reviews');
      let reviewsStore = tx.objectStore('reviews');
      return reviewsStore.get(restaurantId);
    });
  }

  /**
   * Update reviews to reviews db.
   */
  static updateReviewsByRestaurantInDb(dbPromise, restaurantId, reviews) {
    return dbPromise.then((db) => {
      if (!db) return;
      let tx = db.transaction('reviews', 'readwrite');
      let reviewsStore = tx.objectStore('reviews');
      reviewsStore.put(reviews, restaurantId);
      tx.complete;
    });
  }

  /**
   * Fetch all reviews of a particular restaurant.
   */
  static fetchRestaurantReviewsById(restaurantId) {
    const reviewsUrl = `http://localhost:1337/reviews/?restaurant_id=${restaurantId}`;
    const dbPromise = DBHelper.idbInit();

    // Network then cache strategy - reviews.
    if (navigator.onLine) {
      return fetch(reviewsUrl)
        .then(response => response.json())
        .then(reviews => {
          if (!reviews || (reviews && reviews.length === 0)) throw new Error('Reviews not found');
          DBHelper.updateReviewsByRestaurantInDb(dbPromise, restaurantId, reviews);
          return reviews;
        }).catch(_ => {
          return DBHelper.getReviewsByRestaurantFromDb(dbPromise, restaurantId)
            .then(reviews => {
              if (reviews && reviews.length > 0) {
                // Fetched reviews from reviews IDB.
                return reviews;
              };
            });
        });
    } else {
      // Cache then network strategy - reviews.
      return DBHelper.getReviewsByRestaurantFromDb(dbPromise, restaurantId)
        .then(reviews => {
          if (reviews && reviews.length > 0) {
            // Fetched reviews from reviews IDB.
            return reviews;
          } else {
            // Fetch reviews from network.
            return fetch(reviewsUrl)
              .then(response => response.json())
              .then(reviews => {
                if (!reviews || (reviews && reviews.length === 0)) return;
                DBHelper.updateReviewsByRestaurantInDb(dbPromise, restaurantId, reviews);
                return reviews;
              });
          }
        }).catch((error) => {
          // Oops!. Got an error from server or some error while operations!
          console.log(`Request failed with error: ${error}`);
        });
    }

  }

  /**
   * Update IndexedDB with latest restaurant favorite before going online.
   */
  static updateFavoriteToDB(restaurant) {
    const dbPromise = DBHelper.idbInit();

    DBHelper.getRestaurantsFromDb(dbPromise)
      .then(restaurants => {
        if (!restaurants || (restaurants && restaurants.length === 0)) return;
        const updatedRestaurants = restaurants.map(restaurantFromDB => {
          if (restaurantFromDB.id == restaurant.restaurantId) {
            restaurantFromDB.is_favorite = restaurant.isFavorite;
          }
          return restaurantFromDB;
        });
        DBHelper.updateRestaurantsToDB(dbPromise, updatedRestaurants);

        if (navigator.onLine) {
          DBHelper.updateFavoriteToServer(restaurant);
        } else {
          restaurantsToBeSynced.push(restaurant);
        }
      });
  }

  /**
   * Update server with latest favorite.
   */
  static updateFavoriteToServer(restaurant) {
    const updateFavoriteUrl = `http://localhost:1337/restaurants/${restaurant.restaurantId}/?is_favorite=${restaurant.isFavorite}`;

    return fetch(updateFavoriteUrl, {
      method: 'PUT'
    });
  }

  /**
   * Update IndexedDB with latest review before going online.
   */
  static postReviewToDB(review) {
    const dbPromise = DBHelper.idbInit();

    DBHelper.getReviewsByRestaurantFromDb(dbPromise, review.restaurant_id)
      .then(reviews => {
        if (!reviews) return;
        reviews.push(review);
        DBHelper.updateReviewsByRestaurantInDb(dbPromise, review.restaurant_id, reviews);

        if (navigator.onLine) {
          DBHelper.postReviewToServer(review);
        } else {
          reviewsToBeSynced.push(review);
        }

      });
  }

  /**
   * Update server with latest review.
   */
  static postReviewToServer(review) {
    const postReviewsUrl = `http://localhost:1337/reviews`;

    const postReview = {
      "restaurant_id": review.restaurant_id,
      "name": review.name,
      "rating": review.rating,
      "comments": review.comments
    };

    return fetch(postReviewsUrl, {
      method: 'POST',
      body: JSON.stringify(postReview),
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
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
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
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
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
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
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
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
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
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
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
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
   * Restaurant image URL.
   */
  static webPImageUrlForRestaurant(restaurant) {
    return (`dist/img/webp/${restaurant.photograph}.webp`);
  }

  static jpegImageUrlForRestaurant(restaurant) {
    return (`dist/img/${restaurant.photograph}.jpg`);
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng], {
      title: restaurant.name,
      alt: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant)
    })
    marker.addTo(newMap);
    return marker;
  }
}

// export default DBHelper;