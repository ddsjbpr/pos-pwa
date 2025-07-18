// File: src/ui/addUserModal.js

import { validatePassword } from '../utils/validation.js';
import { hashPassword } from '../utils/crypto.js';
import { genId } from '../utils/id.js';
import { showError } from '../utils/dom.js';
import { POSDatabase } from '../db/posDatabase.js';
import { renderUserManagementSection } from '../sections/users.js';
import { closeOrderModal, openOrderModal } from './modals.js';

export function showAddUserModal() {
  const modal = document.getElementById("orderModal");
  if (!modal) {
    console.error("Modal container (orderModal) not found");
    alert("System error: Cannot open add user modal");
    return;
  }

  modal.innerHTML = getAddUserModalHTML();
  openOrderModal();

  setupAddUserFormHandler();
  setupAddUserLiveValidation();
  setupAddUserModalEvents();
}

function getAddUserModalHTML() {
  return `
    <div class="modal-content">
      <h3>Add New User</h3>
      <form id="addUserForm">
        <div class="form-group">
          <label for="newUsername">Username:</label>
          <input type="text" id="newUsername" name="newUsername" placeholder="Enter username" required>
        </div>

        <div class="form-group">
          <label for="newPassword">Password:</label>
          <input type="password" id="newPassword" name="newPassword" placeholder="Create password" required autocomplete="new-password">
          <div class="password-requirements">
            <p>Password must contain:</p>
            <ul>
              <li id="add-user-req-length">≥ 8 characters</li>
              <li id="add-user-req-upper">1 uppercase letter</li>
              <li id="add-user-req-lower">1 lowercase letter</li>
              <li id="add-user-req-number">1 number</li>
              <li id="add-user-req-special">1 symbol</li>
              <li id="add-user-req-no-spaces">No spaces</li>
            </ul>
          </div>
        </div>

        <div class="form-group">
          <label for="confirmNewPassword">Confirm Password:</label>
          <input type="password" id="confirmNewPassword" name="confirmNewPassword" placeholder="Confirm password" required autocomplete="new-password">
        </div>

        <div class="form-group">
          <label for="newUserRole">Role:</label>
          <select id="newUserRole" name="newUserRole" class="form-control">
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div id="addUserError" class="error-message hidden" style="color:red; text-align:center; margin-bottom:1em;"></div>

        <div class="modal-actions">
          <button type="submit" class="btn btn-primary">Add User</button>
          <button type="button" class="btn btn-secondary" id="cancelAddUser">Cancel</button>
        </div>
      </form>
    </div>
  `;
}

function setupAddUserLiveValidation() {
  const newPassInput = document.getElementById("newPassword");
  if (newPassInput) {
    newPassInput.addEventListener('input', () => {
      const password = newPassInput.value;
      const validationResult = validatePassword(password); // Renamed reqs to validationResult for clarity

      // console.log('Password typed:', password); // Debugging line, can remove later
      // console.log('Validation results (validationResult):', validationResult); // Debugging line, can remove later

      // --- START OF FIX for conditions not turning green ---
      // Access properties from validationResult.requirements
      document.getElementById("add-user-req-length").style.color = validationResult.requirements.minLength ? 'green' : 'red';
      document.getElementById("add-user-req-upper").style.color = validationResult.requirements.hasUpper ? 'green' : 'red';
      document.getElementById("add-user-req-lower").style.color = validationResult.requirements.hasLower ? 'green' : 'red';
      document.getElementById("add-user-req-number").style.color = validationResult.requirements.hasNumber ? 'green' : 'red';
      document.getElementById("add-user-req-special").style.color = validationResult.requirements.hasSpecial ? 'green' : 'red';
      document.getElementById("add-user-req-no-spaces").style.color = validationResult.requirements.hasNoSpaces ? 'green' : 'red';
      // --- END OF FIX ---
    });
  }
}

function setupAddUserFormHandler() {
  const form = document.getElementById("addUserForm");
  const errorEl = document.getElementById("addUserError");
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = "Adding...";
    errorEl.textContent = '';
    errorEl.classList.add('hidden');

    const username = document.getElementById("newUsername").value.trim();
    const password = document.getElementById("newPassword").value;
    const confirmPassword = document.getElementById("confirmNewPassword").value;
    const role = document.getElementById("newUserRole").value;

    if (!username || !password || !confirmPassword) {
      showError("addUserError", "All fields are required.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Add User";
      return;
    }

    if (password !== confirmPassword) {
      showError("addUserError", "Passwords do not match.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Add User";
      return;
    }

    const validation = validatePassword(password);
    if (!validation.passed) {
      showError("addUserError", "Password does not meet requirements.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Add User";
      return;
    }

    try {
      const allUsers = await POSDatabase.getAll("users");
      if (allUsers.some(u => u.username.toLowerCase() === username.toLowerCase())) {
        showError("addUserError", "Username already exists.");
        submitBtn.disabled = false;
        submitBtn.textContent = "Add User";
        return;
      }

      const passwordHash = await hashPassword(password);
      await POSDatabase.put("users", {
        id: genId("user"),
        username,
        passwordHash,
        role
      });

      alert(`User "${username}" added successfully!`);
      closeOrderModal();

      // --- START OF FIX for re-rendering ---
      // Target the #app div instead of a <main> element
      const mainElement = document.getElementById('app'); 
      // console.log('Main element found for re-render:', mainElement); // Debugging line, can remove later
      if (mainElement) {
        renderUserManagementSection(mainElement);
      } else {
        console.error("Main content area (#app) not found for re-render.");
      }
      // --- END OF FIX ---
    } catch (error) {
      showError("addUserError", "Failed to add user. Please try again.");
      console.error("User creation error:", error);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Add User";
    }
  });
}

function setupAddUserModalEvents() {
  const modal = document.getElementById("orderModal");
  document.getElementById("cancelAddUser").addEventListener("click", closeOrderModal);

  modal.addEventListener("click", (event) => {
      if (event.target === modal) {
          closeOrderModal();
      }
  });
}