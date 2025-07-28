// --- IndexedDB Setup ---
let db;

function openDB() {
  return new Promise((resolve, reject) => {
    // ✨ IMPORTANT: Increment the version number
    const request = indexedDB.open('POSDatabase', 3); // Changed from 2 to 3 (or whatever your next version is)

    request.onupgradeneeded = (event) => {
      db = event.target.result;

      // Existing object stores
      if (!db.objectStoreNames.contains('categories')) {
        db.createObjectStore('categories', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('menuItems')) {
        const itemStore = db.createObjectStore('menuItems', { keyPath: 'id' });
        itemStore.createIndex('name', 'name', { unique: false });
        itemStore.createIndex('nameHindi', 'nameHindi', { unique: false });
        itemStore.createIndex('categoryId', 'categoryId', { unique: false });
        // ❌ REMOVE THESE LINES for menuItem indexes:
        // itemStore.createIndex('variantKeywordsHindi', 'variantKeywordsHindi', { unique: false });
        // itemStore.createIndex('modifierKeywordsHindi', 'modifierKeywordsHindi', { unique: false });
      }
      if (!db.objectStoreNames.contains('orders')) {
        db.createObjectStore('orders', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'id' });
      }

      // Variants store with keyword indexes (already added in previous steps, ensure they are correct)
      if (!db.objectStoreNames.contains('variants')) {
        const variantStore = db.createObjectStore('variants', { keyPath: 'id' });
        variantStore.createIndex('itemId', 'itemId', { unique: false });
        variantStore.createIndex('variantKeywords', 'variantKeywords', { unique: false, multiEntry: true });
        variantStore.createIndex('variantKeywordsHindi', 'variantKeywordsHindi', { unique: false, multiEntry: true });
      } else {
          // Ensure these indexes are created if upgrading from an older version where they didn't exist
          const variantStore = request.transaction.objectStore('variants');
          if (!variantStore.indexNames.contains('variantKeywords')) {
              variantStore.createIndex('variantKeywords', 'variantKeywords', { unique: false, multiEntry: true });
          }
          if (!variantStore.indexNames.contains('variantKeywordsHindi')) {
              variantStore.createIndex('variantKeywordsHindi', 'variantKeywordsHindi', { unique: false , multiEntry: true});
          }
      }

      // Modifiers store with keyword indexes (already added in previous steps, ensure they are correct)
      if (!db.objectStoreNames.contains('modifiers')) {
        const modifierStore = db.createObjectStore('modifiers', { keyPath: 'id' });
        modifierStore.createIndex('itemId', 'itemId', { unique: false });
        modifierStore.createIndex('modifierKeywords', 'modifierKeywords', { unique: false, multiEntry: true });
        modifierStore.createIndex('modifierKeywordsHindi', 'modifierKeywordsHindi', { unique: false, multiEntry: true });
      } else {
          // Ensure these indexes are created if upgrading from an older version where they didn't exist
          const modifierStore = request.transaction.objectStore('modifiers');
          if (!modifierStore.indexNames.contains('modifierKeywords')) {
              modifierStore.createIndex('modifierKeywords', 'modifierKeywords', { unique: false, multiEntry: true });
          }
          if (!modifierStore.indexNames.contains('modifierKeywordsHindi')) {
              modifierStore.createIndex('modifierKeywordsHindi', 'modifierKeywordsHindi', { unique: false , multiEntry: true});
          }
      }
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve();
    };

    request.onerror = (event) => {
      console.error('Database error:', event.target.errorCode);
      reject(event.target.error);
    };
  });
}

function getAll(storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction([storeName], 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function get(storeName, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction([storeName], 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function put(storeName, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction([storeName], 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(value);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function del(storeName, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction([storeName], 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ✅ Helper to query by index
function getByIndex(storeName, indexName, indexValue) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction([storeName], 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(indexValue);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ✅ Export for usage across modules
export const POSDatabase = {
  openDB,
  getAll,
  get,
  put,
  delete: del,
  getByIndex
};
