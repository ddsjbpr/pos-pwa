// File: src/services/dataService.js

// --- Local Database (IndexedDB) Imports ---
import { POSDatabase as localDB } from '../db/localDatabase.js';

// --- Remote Database (Firebase) Imports ---
import { POSDatabase as remoteDB } from '../db/posDatabase.js';

// --- App State & UI Imports ---
import { appState } from '../state/appState.js';
import { showCustomAlert } from '../utils/dom.js';
import { isOnline } from '../utils/networkStatus.js';

/**
 * A central service to manage all data operations, ensuring an offline-first experience.
 * It uses IndexedDB as the primary source of truth and syncs with Firebase in the background.
 */
export const dataService = {
  inMemoryCache: {},

  async init() {
    try {
      await localDB.openDB();
      console.log("Local IndexedDB opened successfully.");
    } catch (error) {
      console.error("Failed to open local database:", error);
    }
    
    const collectionsToListen = ['menuItems', 'users', 'categories', 'modifiers', 'variants','orders'];
    collectionsToListen.forEach(collectionName => {
      remoteDB.listenAll(collectionName, async (data) => {
        console.log(`Received real-time update from Firebase for ${collectionName}.`);
        for (const doc of data) {
          await localDB.put(collectionName, doc);
        }
        this.inMemoryCache[collectionName] = data;
        console.log(`Local IndexedDB and cache updated for: ${collectionName}`);
        // Dispatch an event for Firestore-initiated updates
        const event = new CustomEvent('data-updated', {
          detail: { collection: collectionName }
        });
        window.dispatchEvent(event);
      });
    });

    await this.refreshCacheFromLocalDB();

    // Listen for messages from the service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', async (event) => {
        if (event.data.type === 'do-sync') {
          console.log('Received message from SW to start sync.');
          await this.syncAllOfflineChanges();
        }
      });
    }

    this.syncAllOfflineChanges();
  },

  async refreshCacheFromLocalDB() {
    const collections = ['menuItems', 'users', 'categories', 'modifiers', 'variants', 'orders'];
    for (const collectionName of collections) {
      try {
        const data = await localDB.getAll(collectionName);
        this.inMemoryCache[collectionName] = data;
      } catch (error) {
        console.error(`Failed to load ${collectionName} from local DB:`, error);
      }
    }
    console.log("In-memory cache refreshed from local database.");
  },

  async get(collectionName) {
    if (this.inMemoryCache[collectionName]) {
      console.log(`Using in-memory cache for ${collectionName}`);
      return this.inMemoryCache[collectionName];
    }
    
    console.log(`Cache miss. Retrieving from local IndexedDB for ${collectionName}`);
    try {
      const data = await localDB.getAll(collectionName);
      this.inMemoryCache[collectionName] = data;
      return data;
    } catch (error) {
      console.error(`Failed to get data from local DB for ${collectionName}`, error);
      return [];
    }
  },

  async put(collectionName, value) {
    try {
      // 1. Write to local DB
      await localDB.put(collectionName, value);
      console.log(`Document written to local DB for ${collectionName}.`);

      // 2. Update the in-memory cache immediately
      const existingData = this.inMemoryCache[collectionName] || [];
      const index = existingData.findIndex(item => item.id === value.id);
      if (index !== -1) {
        existingData[index] = value;
      } else {
        existingData.push(value);
      }
      this.inMemoryCache[collectionName] = existingData;
      console.log(`In-memory cache for ${collectionName} updated.`);

      // 3. Dispatch a custom event to notify the UI
      const event = new CustomEvent('data-updated', {
        detail: { collection: collectionName }
      });
      window.dispatchEvent(event);
      console.log(`Dispatched 'data-updated' event for ${collectionName}.`);

      // 4. Add to offline queue
      const queuedItem = {
        id: crypto.randomUUID(),
        collectionName,
        value,
        operationType: 'put', // Mark as a put operation
        ts: Date.now(),
      };
      await localDB.putOfflineQueue(queuedItem);
      console.log(`Change added to offline queue.`);

      // 5. Register Background Sync
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready.then(registration => {
          registration.sync.register('sync-offline-queue').then(() => {
            console.log('Background sync registered for offline queue');
          }).catch(err => {
            console.warn('Background sync registration failed:', err);
          });
        });
      }

      // 6. Trigger sync immediately if online
      this.syncAllOfflineChanges();

    } catch (error) {
      console.error(`Failed to write to local DB for ${collectionName}`, error);
      showCustomAlert("Error placing order. Please try again.", "danger");
    }
  },

  async delete(collectionName, id) {
    try {
      // 1. Delete from local DB
      await localDB.delete(collectionName, id);
      console.log(`Document with id ${id} deleted from local DB for ${collectionName}.`);

      // 2. Update the in-memory cache immediately
      const existingData = this.inMemoryCache[collectionName] || [];
      this.inMemoryCache[collectionName] = existingData.filter(item => item.id !== id);
      console.log(`In-memory cache for ${collectionName} updated after deletion.`);

      // 3. Dispatch a custom event to notify the UI
      const event = new CustomEvent('data-updated', {
        detail: { collection: collectionName }
      });
      window.dispatchEvent(event);
      console.log(`Dispatched 'data-updated' event for ${collectionName}.`);

      // 4. Add the delete operation to the offline queue
      const queuedItem = {
        id: crypto.randomUUID(),
        collectionName,
        value: { id },
        operationType: 'delete', // <--- IMPORTANT: Mark as a delete operation
        ts: Date.now(),
      };
      await localDB.putOfflineQueue(queuedItem);
      console.log(`Delete operation for id ${id} added to offline queue.`);

      // 5. Trigger sync immediately if online
      this.syncAllOfflineChanges();

    } catch (error) {
      console.error(`Failed to delete document with id ${id} from local DB.`, error);
      showCustomAlert("Error deleting item. Please try again.", "danger");
    }
  },

  /**
   * Recursively sanitizes a document by replacing 'undefined' values with 'null'.
   * This is a critical step to prevent Firebase write errors.
   */
  sanitizeDocument(doc) {
      if (doc === null || typeof doc !== 'object') {
          return doc;
      }

      if (Array.isArray(doc)) {
          return doc.map(item => this.sanitizeDocument(item));
      }

      const newDoc = {};
      for (const key in doc) {
          if (Object.prototype.hasOwnProperty.call(doc, key)) {
              const value = doc[key];
              if (value === undefined) {
                  newDoc[key] = null;
              } else if (value && typeof value === 'object') {
                  newDoc[key] = this.sanitizeDocument(value);
              } else {
                  newDoc[key] = value;
              }
          }
      }
      return newDoc;
  },

  async syncAllOfflineChanges() {
    if (!isOnline()) {
      console.log("App is offline. Sync will proceed when connection is restored.");
      return;
    }

    try {
      const offlineChanges = await localDB.getOfflineQueue();
      if (!offlineChanges || offlineChanges.length === 0) {
        console.log("Offline queue is empty. Nothing to sync.");
        return;
      }

      console.log(`Found ${offlineChanges.length} pending changes. Starting sync...`);

      for (const item of offlineChanges) {
        try {
          const queueId = item.id;
          const remoteId = item.value?.id;
          if (item.operationType === 'delete') {
            await remoteDB.delete(item.collectionName, item.value.id);
            console.log(`Synced delete for ${item.collectionName} id=${remoteId || queueId}`);
          } else {
            const sanitizedValue = this.sanitizeDocument(item.value);
            await remoteDB.put(item.collectionName, sanitizedValue);
            console.log(`Synced put for ${item.collectionName} id=${remoteId || queueId}`);
          }
          await localDB.deleteOfflineQueue(item.id);
        } catch (err) {
          console.error(`Failed to sync queue item ${item.id} (${item.collectionName}). Will retry later.`, err);
          // continue with next item instead of throwing to allow other items to sync
        }
      }

      console.log("Offline sync process complete.");
    } catch (error) {
      console.error("Error during offline sync process:", error);
    }
  }

};
