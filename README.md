# Mobile Web Specialist Certification Course

## Project Stage 3

### The project has been built using the following features:

* The application uses **Responsive Web Design** using **Flexbox**, **CSS Grid** and **Media Queries**.
* **Accessibility** techniques such as use of **semantic HTML**, roles, **ARIA** attributes, managing focus have been carried out throughout the application.
* **Service Worker** has been used extensively to cache different types of files such as HTML, CSS, mapbox files, images and places them accordingly into static or dynamic caches.
* **IndexedDB** is used with the help of Jake Archibald's **idb** library.
* Review form with background sync.
* Favorite a restaurant with background sync.
* The **Gulp** build tasks have been written from scratch with custom requirements kept in mind. Minification, bundling, support for latest ES6 syntax including import and export, css browser compatibility, webP image generation from JPG images, gzipping, serving cached files with max-age set to 1 year via gulp serve, all have been carried out to bring out optimal performance of the application.

## Installation Guide

This application uses **Gulp** as its default task runner. Run the following commands in order to launch the application.

```
npm install
gulp build
gulp serve
```

The application will be running on http://localhost:9000/