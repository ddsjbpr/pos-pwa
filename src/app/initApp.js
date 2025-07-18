// File: src/app/initApp.js
console.log("✅ initApp started");
import { POSDatabase } from '../db/posDatabase.js';
import { renderLogin } from '../auth/login.js';
import { renderRegister } from '../auth/register.js';
import { renderAppLayout } from './renderLayout.js';
import { appState } from '../state/appState.js';
// ADD THIS LINE:
import { startSessionTimer, setupActivityListeners } from '../utils/session.js'; // <--- THIS WAS MISSING!

export async function initApp() {
  await POSDatabase.openDB();
  const users = await POSDatabase.getAll('users');

  if (!users.length) {
    return renderRegister();
  }

  const session = JSON.parse(localStorage.getItem('currentSession'));

  if (session && session.sessionExpiry > Date.now()) {
    const userExists = users.some(u => u.username === session.username);
    if (userExists) {
        appState.currentUser = session;
        // These calls are now correctly imported and will work:
        startSessionTimer(); // Start timer immediately on session restore
        setupActivityListeners(); // Set up activity tracking
        return renderAppLayout(); // ✅ Proper entry point
    }
  }

  localStorage.removeItem('currentSession');
  appState.currentUser = null;
  return renderLogin();
}
