import { validatePassword } from '../utils/validation.js';
import { showError } from '../utils/dom.js';
import { hashPassword } from '../utils/crypto.js';
import { genId } from '../utils/id.js'; // Make sure genId is correctly imported
import { POSDatabase } from '../db/posDatabase.js';
import { appState } from '../state/appState.js';
import { renderApp } from '../app/renderApp.js';

export async function renderRegister() {
  document.getElementById("app").innerHTML = `
    <div class="register-container">
      <h2>Create Admin Account</h2>
      <form id="registerForm">
        <div class="form-group">
          <label for="regUser">Username</label>
          <input id="regUser" placeholder="Enter username" required>
        </div>
        <div class="form-group">
          <label for="regPass">Password</label>
          <input id="regPass" type="password" placeholder="Create password" required>
          <div class="password-requirements">
            <p>Password must contain:</p>
            <ul>
              <li id="req-length">≥ 8 characters</li>
              <li id="req-upper">1 uppercase letter</li>
              <li id="req-lower">1 lowercase letter</li>
              <li id="req-number">1 number</li>
              <li id="req-special">1 special character (!@#$%^&*)</li>
            </ul>
          </div>
        </div>
        <div class="form-group">
          <label for="regPass2">Confirm Password</label>
          <input id="regPass2" type="password" placeholder="Re-enter password" required>
        </div>
        <button type="submit" class="btn-primary">Create Account</button>
      </form>
      <div id="regError" class="error-message hidden"></div>
    </div>
  `;

  // Live password validation
  document.getElementById("regPass").addEventListener('input', (e) => {
    const validation = validatePassword(e.target.value);
    document.getElementById("req-length").style.color = validation.requirements.minLength ? 'green' : 'gray';
    document.getElementById("req-upper").style.color = validation.requirements.hasUpper ? 'green' : 'gray';
    document.getElementById("req-lower").style.color = validation.requirements.hasLower ? 'green' : 'gray';
    document.getElementById("req-number").style.color = validation.requirements.hasNumber ? 'green' : 'gray';
    document.getElementById("req-special").style.color = validation.requirements.hasSpecial ? 'green' : 'gray';
  });

  document.getElementById("registerForm").onsubmit = async (e) => {
    e.preventDefault();

    const username = document.getElementById("regUser").value.trim();
    const password = document.getElementById("regPass").value.trim();
    const password2 = document.getElementById("regPass2").value.trim();
    showError("regError", "");

    if (!username) {
      showError("regError", "Username is required");
      document.getElementById("regUser").focus();
      return;
    }

    if (!password || !password2) {
      showError("regError", "Both password fields are required");
      return;
    }

    const validation = validatePassword(password);
    if (!validation.passed) {
      const missing = Object.entries(validation.requirements)
        .filter(([_, met]) => !met)
        .map(([key]) => {
          switch (key) {
            case 'minLength': return '8+ characters';
            case 'hasUpper': return 'uppercase letter';
            case 'hasLower': return 'lowercase letter';
            case 'hasNumber': return 'number';
            case 'hasSpecial': return 'special character';
            default: return '';
          }
        });

      showError("regError", `Password missing: ${missing.join(', ')}`);
      document.getElementById("regPass").focus();
      return;
    }

    if (password !== password2) {
      showError("regError", "Passwords don't match");
      document.getElementById("regPass2").focus();
      return;
    }

    try {
      const users = await POSDatabase.getAll("users");
      if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
        showError("regError", "Username already exists");
        document.getElementById("regUser").focus();
        return;
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
      showError("regError", "Could not check existing users. Try again.");
      return;
    }

    let passwordHash;
    try {
      passwordHash = await hashPassword(password);
    } catch (err) {
      console.error("Password hashing failed:", err);
      showError("regError", "Failed to secure password. Try again.");
      return;
    }

    // --- START OF CHANGE ---
    const newUserId = genId("user"); // Generate ID once

    try {
      await POSDatabase.put("users", {
        id: newUserId, // Use the generated ID as keyPath
        username,
        passwordHash,
        role: "admin",
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Failed to save user to DB:", err);
      showError("regError", "Failed to save user. Please refresh and try again.");
      return;
    }

    try {
      appState.currentUser = {
        id: newUserId, // Store the user's actual ID here
        username,
        role: "admin",
        sessionExpiry: Date.now() + 8 * 60 * 60 * 1000
      };
      localStorage.setItem('currentSession', JSON.stringify(appState.currentUser));
      renderApp();
    } catch (err) {
      console.error("Post-registration error:", err);
      showError("regError", "Account created but login failed. Please log in manually.");
    }
    // --- END OF CHANGE ---
  };
}