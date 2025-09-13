// File: src/state/appState.js

export const appState = {
  currentUser: null,
  cart: [],
  currentSection: 'order',
  // 💡 Add a cache object to store data retrieved from the database
    dataCache: {},
};
