import {
  DBHelper,
  Toast,
  restaurantsToBeSynced
} from './dbhelper';

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  initMap(); // added
  fetchNeighborhoods();
  fetchCuisines();
  registerServiceWorker(); // Register service worker

  const neighborhoodsSelect = document.getElementById('neighborhoods-select');
  neighborhoodsSelect.addEventListener('change', updateRestaurants);

  const cuisinesSelect = document.getElementById('cuisines-select');
  cuisinesSelect.addEventListener('change', updateRestaurants);

  window.addEventListener('online', isOnline);
  window.addEventListener('offline', isOffline);
});

/**
 * Lazy load pictures and image content
 */
const lazyLoadImages = () => {
  const lazyPictures = [].slice.call(document.querySelectorAll('picture.lazy'));

  if ('IntersectionObserver' in window) {
    const lazyPictureObserver = new IntersectionObserver((pictures) => {
      pictures.forEach((picture) => {
        if (picture.isIntersecting) {
          const lazyPicture = picture.target;
          lazyPicture.childNodes[0].srcset = lazyPicture.childNodes[0].dataset.srcset;
          lazyPicture.childNodes[1].srcset = lazyPicture.childNodes[1].dataset.srcset;
          lazyPicture.childNodes[2].src = lazyPicture.childNodes[2].dataset.src;
          lazyPicture.classList.remove('lazy');
          lazyPictureObserver.unobserve(lazyPicture);
        }
      });
    });

    lazyPictures.forEach((lazyPicture) => {
      lazyPictureObserver.observe(lazyPicture);
    });
  }
};

/**
 * Register a service worker for caching static and dynamic assets.
 */
const registerServiceWorker = () => {
  if (!navigator.serviceWorker) {
    return;
  }
  navigator.serviceWorker.register('../service-worker.js').then(() => {
    console.log('Service worker registered successfully!');
  }).catch((error) => {
    console.log('Error while registering service worker:', error);
  });
}

/**
 * Fetch all neighborhoods and set their HTML.
 */
const fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}

/**
 * Set neighborhoods HTML.
 */
const fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
const fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
}

/**
 * Set cuisines HTML.
 */
const fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/**
 * Initialize leaflet map, called from HTML.
 */
const initMap = () => {
  self.newMap = L.map('map', {
    center: [40.722216, -73.987501],
    zoom: 12,
    scrollWheelZoom: false
  });
  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
    mapboxToken: 'pk.eyJ1IjoiYW51cmFnLW1hanVtZGFyIiwiYSI6ImNqaXhkaGNpOTBmZ2kzcXBkZmtiemtqcGIifQ.-tKg88uRBbmhD74sr6boKw',
    maxZoom: 18,
    attribution: `Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, +
        <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>,  +
        Imagery © <a href="https://www.mapbox.com/">Mapbox</a>`,
    id: 'mapbox.streets'
  }).addTo(self.newMap);

  updateRestaurants();
}

/**
 * Update page and map for current restaurants.
 */
const updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  });
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
const resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  if (self.markers) {
    self.markers.forEach(marker => marker.remove());
  }
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
const fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
  lazyLoadImages();
}

/**
 * Create restaurant HTML.
 */
const createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');
  li.className = 'card';

  const picture = document.createElement('picture');
  const webPsource = document.createElement('source');
  const jpegSource = document.createElement('source');

  picture.className = 'lazy';
  webPsource.dataset.srcset = DBHelper.webPImageUrlForRestaurant(restaurant);
  webPsource.type = 'image/webp';

  jpegSource.dataset.srcset = DBHelper.jpegImageUrlForRestaurant(restaurant);
  jpegSource.type = 'image/jpeg';

  const image = document.createElement('img');
  image.className = 'restaurant-img';
  image.dataset.src = DBHelper.jpegImageUrlForRestaurant(restaurant);
  // Add alt-text for restaurant images according to restaurant names.
  image.alt = `Name of the restaurant: ${restaurant.name}`;

  picture.appendChild(webPsource);
  picture.appendChild(jpegSource);
  picture.appendChild(image);
  li.append(picture);

  const name = document.createElement('h3');
  name.className = 'card-header';
  name.innerHTML = restaurant.name;
  li.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;

  const addressDetail = document.createElement('p');
  addressDetail.className = 'card-detail';
  addressDetail.appendChild(neighborhood);
  addressDetail.appendChild(address);

  li.append(addressDetail);

  const more = document.createElement('a');
  more.className = 'card-action-view';
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  // Make link have role of button with better label for improved accessibility and user experience.
  more.setAttribute('role', 'button');
  more.setAttribute('aria-label', `view details of ${restaurant.name} restaurant`);

  const favorite = document.createElement('button');
  favorite.className = 'card-action-favorite';
  favorite.dataset.id = restaurant.id;
  favorite.dataset.favorite = (restaurant.is_favorite == undefined || restaurant.is_favorite == 'undefined' || restaurant.is_favorite === false || restaurant.is_favorite === 'false') ? false : true;
  favorite.setAttribute('aria-label', `mark ${restaurant.name} restaurant as favorite`);
  if (favorite.dataset.favorite === 'true') {
    favorite.innerHTML = '&#10084;';
  } else if (favorite.dataset.favorite === 'false') {
    favorite.innerHTML = '&#9825;';
  }
  favorite.addEventListener('click', toggleFavoriteRestaurant);

  const actionButtonList = document.createElement('section');
  actionButtonList.className = 'card-action';
  actionButtonList.append(more);
  actionButtonList.append(favorite);

  li.append(actionButtonList);

  return li
}

/**
 * Toggle restaurant as favorite.
 */
const toggleFavoriteRestaurant = (event) => {
  const restaurantId = event.target.dataset.id;
  let isFavorite = event.target.dataset.favorite;

  if (isFavorite === 'false') {
    isFavorite = 'true';
    event.target.innerHTML = '&#10084;';
  } else if (isFavorite === 'true') {
    isFavorite = 'false';
    event.target.innerHTML = '&#9825;';
  }
  event.target.dataset.favorite = isFavorite;

  const restaurant = {
    restaurantId: restaurantId,
    isFavorite: isFavorite
  };
  DBHelper.updateFavoriteToDB(restaurant);
};

/**
 * Synce favorite restaurants with server.
 */
const syncFavoriteRestaurantsWithServer = () => {
  Promise.all(restaurantsToBeSynced.map(restaurant => {
    DBHelper.updateFavoriteToServer(restaurant);
  })).then(_ => {
    Toast.showToast('Background Sync For Favorites Has Been Completed Successfully!');
    restaurantsToBeSynced.length = 0;
  }).catch(_ => {
    restaurantsToBeSynced.length = 0;
  });
};

/**
 * Trigger notification when restaurant reviews page is online.
 */
const isOnline = (event) => {
  Toast.showToast('Application Is Now Online, Sync Will Continue.');
  syncFavoriteRestaurantsWithServer();
};

/**
 * Trigger notification when restaurant reviews page is offline.
 */
const isOffline = (event) => {
  Toast.showToast('Application Is Offline, Your Data Has Been Saved For Background Sync.');
};

/**
 * Add markers for current restaurants to the map.
 */
const addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.newMap);
    marker.on("click", onClick);

    function onClick() {
      window.location.href = marker.options.url;
    }
    self.markers.push(marker);
  });

}