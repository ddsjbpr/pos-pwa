// File: src/app/initApp.js
import { renderLogin } from '../auth/login.js';
import { renderRegister } from '../auth/register.js';
import { renderAppLayout } from './renderAppLayout.js';
import { appState } from '../state/appState.js';
import { startSessionTimer, setupActivityListeners } from '../utils/session.js';
import { authenticateUser } from '../db/firebase-config.js'; // Removed setupFirestorePersistence

import { dataService } from '../services/dataService.js';

/**
 * The main entry point for the application.
 * Handles database initialization, session restoration, and determines the initial view to render.
 */
export async function initApp() {
  try {
    // Authenticate the user. Firestore persistence is handled by dataService now.
    await authenticateUser();
    
    // Initialize data service (opens local DB, sets listeners, syncs)
    await dataService.init();

    // Load users from local cache
    const users = await dataService.get('users');

    if (!users || users.length === 0) {
      return renderRegister();
    }

    const session = JSON.parse(localStorage.getItem('currentSession'));

    if (session && session.sessionExpiry > Date.now()) {
      const userExists = users.some(u => u.username === session.username);
      if (userExists) {
        appState.currentUser = session;
        startSessionTimer();
        setupActivityListeners();
        return renderAppLayout();
      }
    }

    localStorage.removeItem('currentSession');
    appState.currentUser = null;
    return renderLogin();

  } catch (err) {
    console.error("App failed to initialize:", err);
  }
}