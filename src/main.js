// File: src/main.js
import { initApp } from './app/initApp.js';

/**
 * Initializes the application and registers the Service Worker once the DOM is fully loaded.
 * Handles any potential errors during the initialization process.
 */
window.addEventListener('DOMContentLoaded', () => {
  // Check for Service Worker support and register it.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Worker registered with scope:', registration.scope);
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  }

  // Initialize the main application.
  initApp().catch(err => {
    // Log the error to the console for debugging
    console.error("App failed to initialize:", err);
    
    // In a full application, you would display a custom modal or message box here.
    console.warn("Failed to load the app. Please check the console for details.");
  });
});
