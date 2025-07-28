// File: src/auth/logout.js

import { appState } from '../state/appState.js';
import { renderLogin } from './login.js';
import { clearSessionTimer } from '../utils/session.js';

export function logout() {
  console.log("Logout function called. Clearing session...");
  clearSessionTimer();
  localStorage.removeItem("currentSession");
  appState.currentUser = null;

  // ✅ Clear layout before rendering login
  const app = document.getElementById("app");
  if (app) app.innerHTML = "";

  renderLogin(); // Login screen without main layout
}
