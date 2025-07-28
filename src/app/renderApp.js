import { POSDatabase } from '../db/posDatabase.js';
import { renderRegister } from '../auth/register.js';
import { renderLogin } from '../auth/login.js';
import { renderAppLayout } from './renderLayout.js'; // hypothetical layout function
import { appState } from '../state/appState.js';

export async function renderApp() {
  try {
    await POSDatabase.openDB();
  } catch (err) {
    console.error("Failed to open database:", err);
    alert("Unable to access app data. Please refresh or try a different browser.");
    return;
  }

  let users = [];
  try {
    users = await POSDatabase.getAll("users");
  } catch (err) {
    console.error("Failed to fetch users:", err);
    alert("Could not load users. Please reload the app.");
    return;
  }

  const session = JSON.parse(localStorage.getItem('currentSession'));
  if (session && session.sessionExpiry > Date.now()) {
    appState.currentUser = session;

    const userExists = users.some(u => u.username === appState.currentUser.username);
    if (userExists) {
      return renderAppLayout();
    }
  }

  // Clear invalid session
  localStorage.removeItem('currentSession');
  appState.currentUser = null;

  if (!users.length) {
    return renderRegister();
  }

  if (!appState.currentUser) {
    appState.currentSection = "order"; // Clean state
    return renderLogin();
  }

  if (
    (appState.currentSection === "users" || appState.currentSection === "menu") &&
    appState.currentUser.role !== "admin"
  ) {
    appState.currentSection = "order";
  }

  return renderAppLayout();
}
