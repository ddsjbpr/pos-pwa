// File: src/utils/networkStatus.js



/**
 * A simple utility to check if the browser is currently online.
 * This is a crucial part of an offline-first strategy.
 */

/**
 * Returns the current online status.
 * @returns {boolean} True if online, false otherwise.
 */
 export function isOnline() {
    return navigator.onLine;
  }
  
  /**
   * Sets up listeners for the browser's online/offline events.
   * This is useful for UI feedback but not directly used by the data service sync logic.
   */
  function setupNetworkStatusListeners() {
    window.addEventListener('online', () => {
      console.log('App is now online.');
      // You could trigger a sync here, but dataService.js already handles this.
    });
    
    window.addEventListener('offline', () => {
      console.warn('App is now offline.');
    });
  }
  
  // Set up listeners on script load
  setupNetworkStatusListeners();
  