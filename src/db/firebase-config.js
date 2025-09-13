// src/db/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getFirestore, enableMultiTabIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { getAuth, signInAnonymously, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

// Ensure the secure configuration is always used in this environment.
let firebaseConfig;
if (typeof __firebase_config !== 'undefined') {
  firebaseConfig = JSON.parse(__firebase_config);
} else {
  // Use a hardcoded configuration with a valid authDomain for local testing.
  // This prevents the "configuration-not-found" error when running locally.
  firebaseConfig = {
    apiKey: "AIzaSyDeNW-VHqkqJeubDIkCYStrJgDfa-kI1tc",
    authDomain: "pwa-jdl.firebaseapp.com",
    projectId: "pwa-jdl",
    storageBucket: "pwa-jdl.firebasestorage.app",
    messagingSenderId: "191449445657",
    appId: "1:191449445657:web:12c81bef6b7352b437c188"
  };
}

// Initialize Firebase and its services.
let app;
let db;
let auth;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
} catch (error) {
  console.error("Firebase failed to initialize:", error);
}

// Enable offline persistence for multiple tabs
// This is an asynchronous operation that must be awaited.
const setupFirestorePersistence = async () => {
  try {
    // Only attempt to enable persistence if db is defined
    if (db) {
      await enableMultiTabIndexedDbPersistence(db);
      console.log("Firestore persistence enabled for multi-tab access.");
    }
  } catch (err) {
    if (err.code === 'failed-precondition') {
      console.warn("Multiple tabs open, persistence can't be enabled.");
    } else if (err.code === 'unimplemented') {
      console.warn("The current browser does not support all of the features required to enable persistence.");
    } else {
      console.error("Failed to enable Firestore persistence:", err);
    }
  }
};

// Sign in with the custom auth token provided by the canvas environment.
async function authenticateUser() {
  if (!auth) {
    console.error("Authentication failed: Auth service is not initialized.");
    return;
  }
  if (typeof __initial_auth_token !== 'undefined') {
    try {
      await signInWithCustomToken(auth, __initial_auth_token);
      console.log("Signed in with custom token.");
    } catch (error) {
      console.error("Error signing in with custom token:", error);
      // Fallback to anonymous sign-in if custom token fails
      await signInAnonymously(auth);
    }
  } else {
    // If no custom token is available, sign in anonymously.
    await signInAnonymously(auth);
    console.log("Signed in anonymously.");
  }
}

// We'll export `db`, `auth`, `setupFirestorePersistence`, and the `authenticateUser` function.
export { db, auth, setupFirestorePersistence, authenticateUser };
