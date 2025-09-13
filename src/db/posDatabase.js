// src/db/posDatabase.js


import { db } from './firebase-config.js';
import { collection, getDocs, getDoc, doc, setDoc, addDoc, deleteDoc, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

/**
 * Performs a one-time fetch of all documents in a collection.
 * This is useful for non-realtime operations but can cause a delay if offline.
 * For real-time updates, use `listenAll`.
 * @param {string} collectionName The name of the collection to get documents from.
 * @returns {Promise<Array>} A promise that resolves with an array of documents.
 */
function getAll(collectionName) {
  return getDocs(collection(db, collectionName))
    .then((querySnapshot) => {
      const data = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      return data;
    });
}

/**
 * Sets up a real-time listener for all documents in a collection.
 * This is the recommended method for an offline-first experience, as it
 * immediately returns cached data and then listens for live updates.
 * @param {string} collectionName The name of the collection to listen to.
 * @param {function(Array): void} callback The function to call with the updated data.
 * @returns {function(): void} An unsubscribe function to stop listening.
 */
function listenAll(collectionName, callback) {
  const q = collection(db, collectionName);
  return onSnapshot(q, (querySnapshot) => {
    const data = [];
    querySnapshot.forEach((doc) => {
      data.push({ id: doc.id, ...doc.data() });
    });
    callback(data);
  });
}

/**
 * Performs a one-time fetch for a single document by its ID.
 * @param {string} collectionName The name of the collection.
 * @param {string} id The ID of the document to get.
 * @returns {Promise<object|null>} A promise that resolves with the document data or null.
 */
function get(collectionName, id) {
  return getDoc(doc(db, collectionName, id))
    .then((doc) => {
      if (doc.exists()) {
        return { id: doc.id, ...doc.data() };
      }
      return null;
    });
}

/**
 * Adds or updates a document. If the document has an `id` field, it will update the existing document.
 * Otherwise, it will add a new document with a generated ID.
 * @param {string} collectionName The name of the collection.
 * @param {object} value The document data to add or update.
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 */
function put(collectionName, value) {
  if (value.id) {
    return setDoc(doc(db, collectionName, value.id), value);
  } else {
    return addDoc(collection(db, collectionName), value);
  }
}

/**
 * Deletes a document from a collection.
 * @param {string} collectionName The name of the collection.
 * @param {string} id The ID of the document to delete.
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 */
function del(collectionName, id) {
  return deleteDoc(doc(db, collectionName, id));
}

/**
 * Performs a one-time fetch of documents that match a specific field value.
 * This is useful for non-realtime operations but can cause a delay if offline.
 * For real-time updates, use `listenByIndex`.
 * @param {string} collectionName The name of the collection.
 * @param {string} fieldName The name of the field to query.
 * @param {any} value The value to match.
 * @returns {Promise<Array>} A promise that resolves with an array of documents.
 */
function getByIndex(collectionName, fieldName, value) {
  const q = query(collection(db, collectionName), where(fieldName, "==", value));
  return getDocs(q)
    .then((querySnapshot) => {
      const data = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      return data;
    });
}

/**
 * Sets up a real-time listener for documents that match a specific field value.
 * This is the recommended method for an offline-first experience, as it
 * immediately returns cached data and then listens for live updates.
 * @param {string} collectionName The name of the collection.
 * @param {string} fieldName The name of the field to query.
 * @param {any} value The value to match.
 * @param {function(Array): void} callback The function to call with the updated data.
 * @returns {function(): void} An unsubscribe function to stop listening.
 */
function listenByIndex(collectionName, fieldName, value, callback) {
  const q = query(collection(db, collectionName), where(fieldName, "==", value));
  return onSnapshot(q, (querySnapshot) => {
    const data = [];
    querySnapshot.forEach((doc) => {
      data.push({ id: doc.id, ...doc.data() });
    });
    callback(data);
  });
}

export const POSDatabase = {
  getAll,
  get,
  put,
  delete: del,
  getByIndex,
  listenAll,
  listenByIndex,
};
