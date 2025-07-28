import { logout } from '../auth/logout.js';
import { appState } from '../state/appState.js';

let sessionTimer = null;

// Restore session from localStorage
export function restoreSession() {
  const saved = localStorage.getItem('currentSession');
  if (!saved) return null;

  try {
    const session = JSON.parse(saved);
    if (session.sessionExpiry > Date.now()) {
      return session;
    } else {
      localStorage.removeItem('currentSession');
      return null;
    }
  } catch (e) {
    console.warn("Invalid session data", e);
    localStorage.removeItem('currentSession');
    return null;
  }
}

// Start idle timeout countdown
export function startSessionTimer() {
  clearTimeout(sessionTimer);

  sessionTimer = setTimeout(() => {
    if (appState.currentUser) {
      alert("Your session has expired due to inactivity.");
      logout();
    }
  }, 30 * 60 * 1000); // 30 minutes
}

// Cancel the idle timer
export function clearSessionTimer() {
  clearTimeout(sessionTimer);
}

// Set up user activity tracking
export function setupActivityListeners() {
  const events = ['click', 'mousemove', 'keypress', 'scroll'];

  events.forEach(event => {
    document.addEventListener(event, () => {
      const user = appState.currentUser;
      if (!user) return;

      // Check absolute expiry
      if (Date.now() > user.sessionExpiry) {
        alert("Your session has expired.");
        logout();
        return;
      }

      // Update last activity + extend session timer
      user.lastActivity = Date.now();
      localStorage.setItem('currentSession', JSON.stringify(user));
      startSessionTimer();
    }, { passive: true });
  });
}
