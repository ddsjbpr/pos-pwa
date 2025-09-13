// File: src/auth/login.js
import { verifyPassword } from '../utils/crypto.js';
import { showError } from '../utils/dom.js';
import { showPasswordChangeModal } from '../ui/passwordModal.js';
import { startSessionTimer, setupActivityListeners } from '../utils/session.js';
import { appState } from '../state/appState.js';
import { renderAppLayout } from '../app/renderAppLayout.js';

// 💡 Import the new dataService
import { dataService } from '../services/dataService.js';

// 💡 Remove the direct import of POSDatabase, as it's no longer needed here
// import { POSDatabase } from '../db/posDatabase.js';

export async function renderLogin() {
  appState.currentSection = "order";

  document.getElementById("app").innerHTML = `
    <div id="loginContainer">
      <h2>Login</h2>
      <form id="loginForm">
        <input id="loginUser" placeholder="Username" autocomplete="username" required>
        <input id="loginPass" type="password" placeholder="Password" autocomplete="current-password" required>
        <button type="submit">Login</button>
      </form>
      <div id="loginError" class="hidden" style="color:red"></div>
    </div>
  `;

  document.getElementById("loginForm").onsubmit = async (e) => {
    e.preventDefault();

    const username = document.getElementById("loginUser").value.trim();
    const password = document.getElementById("loginPass").value;

    showError("loginError", "");

    try {
      // Small delay for timing attack mitigation. This is good practice.
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 100));
    } catch (delayErr) {
      console.error("Timing delay failed:", delayErr);
    }

    let user;
    try {
      // 💡 Replace the direct database call with a call to the data service's cache
      const users = await dataService.get("users");
      user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    } catch (dbErr) {
      console.error("User lookup failed:", dbErr);
      showError("loginError", "Database error. Please reload.");
      return;
    }

    if (!user || !user.passwordHash) {
      showError("loginError", "Invalid username or password");
      return;
    }

    let isMatch = false;
    try {
      isMatch = await verifyPassword(user.passwordHash, password);
    } catch (verifyErr) {
      console.error("Password verification error:", verifyErr);
      showError("loginError", "Error verifying password.");
      return;
    }

    if (!isMatch) {
      showError("loginError", "Invalid username or password");
      return;
    }

    // --- START OF AMENDED LOGIN LOGIC ---
    const sessionData = {
      id: user.id,
      username: user.username,
      role: user.role,
      cashRegisterId: user.cashRegisterId,
      sessionExpiry: Date.now() + 8 * 60 * 60 * 1000,
      lastActivity: Date.now(),
      sessionId: crypto.randomUUID()
    };

    try {
      appState.currentUser = sessionData;
      localStorage.setItem('currentSession', JSON.stringify(sessionData));
    } catch (sessionErr) {
      console.error("Session storage failed:", sessionErr);
      showError("loginError", "Login succeeded, but session could not be saved.");
      return;
    }

    startSessionTimer();
    setupActivityListeners();
    if (user.needsPasswordReset) {
      showPasswordChangeModal(appState.currentUser);
      return;
    }

    renderAppLayout();
  };
}