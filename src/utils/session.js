// src/utils/session.js
import { logout } from '../auth/logout.js';
import { appState } from '../state/appState.js';

let sessionTimer = null;

/**
 * Restores a user session from localStorage if it exists and is still valid.
 * @returns {object|null} The session object if valid, otherwise null.
 */
export function restoreSession() {
  const saved = localStorage.getItem('currentSession');
  if (!saved) return null;

  try {
    const session = JSON.parse(saved);
    if (session.sessionExpiry > Date.now()) {
      return session;
    } else {
      // Session has expired, clear it
      localStorage.removeItem('currentSession');
      return null;
    }
  } catch (e) {
    console.warn("Invalid session data in localStorage. Clearing it.", e);
    localStorage.removeItem('currentSession');
    return null;
  }
}

/**
 * Starts the session timeout timer for inactivity.
 */
export function startSessionTimer() {
  clearTimeout(sessionTimer);

  sessionTimer = setTimeout(() => {
    if (appState.currentUser) {
      // Use a non-blocking method instead of `alert()`
      console.warn("Your session has expired due to inactivity. Logging out.");
      logout();
    }
  }, 30 * 60 * 1000); // 30 minutes
}

/**
 * Cancels the session timeout timer.
 */
export function clearSessionTimer() {
  clearTimeout(sessionTimer);
}

/**
 * Sets up listeners for user activity to keep the session alive.
 */
export function setupActivityListeners() {
  const events = ['click', 'mousemove', 'keypress', 'scroll'];

  events.forEach(event => {
    document.addEventListener(event, () => {
      const user = appState.currentUser;
      if (!user) return;

      // Check absolute expiry
      if (Date.now() > user.sessionExpiry) {
        // Use a non-blocking method instead of `alert()`
        console.warn("Your session has expired due to absolute time. Logging out.");
        logout();
        return;
      }

      // Update last activity and extend the session timer
      user.lastActivity = Date.now();
      localStorage.setItem('currentSession', JSON.stringify(user));
      startSessionTimer(); // Reset the inactivity timer
    }, { passive: true });
  });
}
