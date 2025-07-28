import { validatePassword } from '../utils/validation.js';
import { showError } from '../utils/dom.js';
import { hashPassword } from '../utils/crypto.js';
import { genId } from '../utils/id.js';
import { POSDatabase } from '../db/posDatabase.js';
import { appState } from '../state/appState.js';
import { renderApp } from '../app/renderApp.js';
import {generateRandomAlphanumeric} from '../ui/addUserModal.js'; // Assuming this path is correct for this utility

export async function renderRegister() {
    document.getElementById("app").innerHTML = `
      <div class="register-container">
        <h2 style="text-align:center; margin-bottom: 1rem;">Create Admin Account</h2>
        <form id="registerForm">
          <div class="form-group">
            <label for="regUser">Username</label>
            <input id="regUser" placeholder="Enter username" required>
          </div>
          <div class="form-group">
            <label for="regPass">Password</label>
            <input id="regPass" type="password" placeholder="Create password" required>
            <div class="password-requirements">
              <p style="margin: 0 0 0.3rem;">Password must contain:</p>
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
          <button type="submit" class="btn-primary" style="width:100%; margin-top: 0.8rem;">Create Account</button>
        </form>
        <div id="regError" class="error-message hidden" style="margin-top: 0.8rem;"></div>
      </div>
    `;

    // Password validation feedback
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
      const submitBtn = document.querySelector('#registerForm button[type="submit"]'); // Get reference to the submit button
      showError("regError", ""); // Use the correct error element ID
      submitBtn.disabled = true; // Disable button immediately on submit
      submitBtn.textContent = "Creating..."; // Change button text

      if (!username) {
        showError("regError", "Username is required");
        submitBtn.disabled = false;
        submitBtn.textContent = "Create Account";
        document.getElementById("regUser").focus();
        return;
      }

      if (!password || !password2) {
        showError("regError", "Both password fields are required");
        submitBtn.disabled = false;
        submitBtn.textContent = "Create Account";
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
        submitBtn.disabled = false;
        submitBtn.textContent = "Create Account";
        document.getElementById("regPass").focus();
        return;
      }

      if (password !== password2) {
        showError("regError", "Passwords don't match");
        submitBtn.disabled = false;
        submitBtn.textContent = "Create Account";
        document.getElementById("regPass2").focus();
        return;
      }

      let users; // Declare 'users' here so it's accessible for cashRegisterId check
      try {
        users = await POSDatabase.getAll("users"); // First and only call to get all users
        if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
          showError("regError", "Username already exists");
          submitBtn.disabled = false;
          submitBtn.textContent = "Create Account";
          document.getElementById("regUser").focus();
          return;
        }

      } catch (err) {
        console.error("Failed to fetch users:", err);
        showError("regError", "Could not check existing users. Try again.");
        submitBtn.disabled = false;
        submitBtn.textContent = "Create Account";
        return;
      }

      // --- START: cashRegisterId generation for Admin ---
      let cashRegisterId;
      let isUniqueLocally = false;
      let attempts = 0;
      const MAX_ATTEMPTS = 10;

      while (!isUniqueLocally && attempts < MAX_ATTEMPTS) {
          const uniqueSuffix = generateRandomAlphanumeric(4);
          const generatedId = `EPOS-${uniqueSuffix}`;

          // Check against the 'users' array already fetched
          if (!users.some(u => u.cashRegisterId === generatedId)) {
              cashRegisterId = generatedId;
              isUniqueLocally = true;
          }
          attempts++;
      }

      if (!isUniqueLocally) {
          showError("regError", "Could not generate a unique Cash Register ID. Please try again.");
          submitBtn.disabled = false;
          submitBtn.textContent = "Create Account";
          return;
      }
      // --- END: cashRegisterId generation ---

      let passwordHash;
      try {
        passwordHash = await hashPassword(password);
      } catch (err) {
        console.error("Password hashing failed:", err);
        showError("regError", "Failed to secure password. Try again.");
        submitBtn.disabled = false;
        submitBtn.textContent = "Create Account";
        return;
      }

      const newUserId = genId("user");

      try {
        await POSDatabase.put("users", {
          id: newUserId,
          username,
          passwordHash,
          role: "admin",
          cashRegisterId, // <-- IMPORTANT: Add the generated cashRegisterId here
          createdAt: new Date().toISOString()
        });
      } catch (err) {
        console.error("Failed to save user to DB:", err);
        showError("regError", "Failed to save user. Please refresh and try again.");
        submitBtn.disabled = false;
        submitBtn.textContent = "Create Account";
        return;
      }

      try {
        appState.currentUser = {
          id: newUserId,
          username,
          role: "admin",
          cashRegisterId, // <-- IMPORTANT: Also set cashRegisterId in appState.currentUser
          sessionExpiry: Date.now() + 8 * 60 * 60 * 1000
        };
        localStorage.setItem('currentSession', JSON.stringify(appState.currentUser));
        renderApp();
      } catch (err) {
        console.error("Post-registration error:", err);
        showError("regError", "Account created but login failed. Please log in manually.");
        // Note: For post-registration errors, the button might remain disabled if not explicitly handled here
      } finally {
          // This finally block ensures the button state is reset on success or any unhandled error
          submitBtn.disabled = false;
          submitBtn.textContent = "Create Account";
      }
    };
}