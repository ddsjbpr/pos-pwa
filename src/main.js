// File: src/main.js
console.log('main.js is running');

import { initApp } from './app/initApp.js';

window.addEventListener('DOMContentLoaded', () => {
  initApp().catch(err => {
    console.error("App failed to initialize:", err);
    alert("Failed to load the app. Please try again.");
  });
});
