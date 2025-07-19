// File: src/auth/logout.js
import { appState } from '../state/appState.js';
import { renderLogin } from './login.js'; // or renderApp if you want layout switching
import { clearSessionTimer } from '../utils/session.js';

export function logout() {
  console.log("Logout function called. Clearing session..."); // Added for debugging
  clearSessionTimer(); // stops idle/timeout tracking
  localStorage.removeItem("currentSession"); //
  appState.currentUser = null; //

  renderLogin(); // or renderApp();
}