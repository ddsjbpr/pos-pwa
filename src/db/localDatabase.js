// src/db/localDatabase.js

// --- IndexedDB Setup ---
let db;
let dbPromise;

function openDB() {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open('POSDatabase', 2);

    request.onupgradeneeded = (event) => {
      db = event.target.result;

      if (!db.objectStoreNames.contains('categories')) {
        db.createObjectStore('categories', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('menuItems')) {
        const itemStore = db.createObjectStore('menuItems', { keyPath: 'id' });
        itemStore.createIndex('name', 'name', { unique: false });
        itemStore.createIndex('nameHindi', 'nameHindi', { unique: false });
        itemStore.createIndex('categoryId', 'categoryId', { unique: false });
        itemStore.createIndex('variantKeywordsHindi', 'variantKeywordsHindi', { unique: false });
        itemStore.createIndex('modifierKeywordsHindi', 'modifierKeywordsHindi', { unique: false });
      }
      if (!db.objectStoreNames.contains('orders')) {
        db.createObjectStore('orders', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('variants')) {
        const variantStore = db.createObjectStore('variants', { keyPath: 'id' });
        variantStore.createIndex('itemId', 'itemId', { unique: false });
        variantStore.createIndex('name', 'name', { unique: false });
        variantStore.createIndex('nameHindi', 'nameHindi', { unique: false });
      }

      if (!db.objectStoreNames.contains('modifiers')) {
        const modifierStore = db.createObjectStore('modifiers', { keyPath: 'id' });
        modifierStore.createIndex('itemId', 'itemId', { unique: false });
        modifierStore.createIndex('name', 'name', { unique: false });
        modifierStore.createIndex('nameHindi', 'nameHindi', { unique: false });
      }

      if (!db.objectStoreNames.contains('offlineQueue')) {
        db.createObjectStore('offlineQueue', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

// All functions now use a unified `getDB` pattern
async function getDB() {
  if (!db) {
    await openDB();
  }
  return db;
}

async function getAll(storeName) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([storeName], 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function get(storeName, id) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([storeName], 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function put(storeName, value) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([storeName], 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(value);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function del(storeName, id) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([storeName], 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getByIndex(storeName, indexName, indexValue) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([storeName], 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(indexValue);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putOfflineQueue(item) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['offlineQueue'], 'readwrite');
    const store = tx.objectStore('offlineQueue');
    const request = store.put(item);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getOfflineQueue() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['offlineQueue'], 'readonly');
    const store = tx.objectStore('offlineQueue');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function deleteOfflineQueue(id) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['offlineQueue'], 'readwrite');
    const store = tx.objectStore('offlineQueue');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export const POSDatabase = {
  openDB,
  getAll,
  get,
  put,
  delete: del,
  getByIndex,
  putOfflineQueue,
  getOfflineQueue,
  deleteOfflineQueue
};