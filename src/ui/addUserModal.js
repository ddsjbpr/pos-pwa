// File: src/ui/addUserModal.js
import { validatePassword } from '../utils/validation.js';
import { hashPassword } from '../utils/crypto.js';
import { genId } from '../utils/id.js';
import { showError } from '../utils/dom.js';
import { closeOrderModal, openOrderModal } from './modals.js';
import { handleNav } from '../app/handleNav.js';

// 💡 Import the new dataService
import { dataService } from '../services/dataService.js';

// 💡 Keep the original POSDatabase for 'put' operations, but remove 'getAll'
import { POSDatabase } from '../db/posDatabase.js';

/**
 * Helper function to generate a random 4-character alphanumeric suffix.
 * @param {number} length - The desired length of the string.
 * @returns {string} - A random alphanumeric string.
 */
export function generateRandomAlphanumeric(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

/**
 * Displays the modal for adding a new user.
 */
export function showAddUserModal() {
  const modal = document.getElementById("orderModal");
  if (!modal) {
    console.error("Modal container (orderModal) not found");
    const app = document.getElementById('app');
    if (app) showError(app, "System error: Cannot open add user modal");
    return;
  }

  modal.innerHTML = getAddUserModalHTML();
  openOrderModal();

  setupAddUserFormHandler();
  setupAddUserLiveValidation();
  setupAddUserModalEvents();
}

/**
 * Generates the HTML content for the add user modal form.
 * @returns {string} - The HTML string for the form.
 */
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
        <div id="addUserSuccess" class="success-message hidden" style="color:green; text-align:center; margin-bottom:1em;"></div>

        <div class="modal-actions">
          <button type="submit" class="btn btn-primary">Add User</button>
          <button type="button" class="btn btn-secondary" id="cancelAddUser">Cancel</button>
        </div>
      </form>
    </div>
  `;
}

/**
 * Sets up live validation for the password field as the user types.
 */
function setupAddUserLiveValidation() {
  const newPassInput = document.getElementById("newPassword");
  if (newPassInput) {
    newPassInput.addEventListener('input', () => {
      const password = newPassInput.value;
      const validationResult = validatePassword(password);
      document.getElementById("add-user-req-length").style.color = validationResult.requirements.minLength ? 'green' : 'red';
      document.getElementById("add-user-req-upper").style.color = validationResult.requirements.hasUpper ? 'green' : 'red';
      document.getElementById("add-user-req-lower").style.color = validationResult.requirements.hasLower ? 'green' : 'red';
      document.getElementById("add-user-req-number").style.color = validationResult.requirements.hasNumber ? 'green' : 'red';
      document.getElementById("add-user-req-special").style.color = validationResult.requirements.hasSpecial ? 'green' : 'red';
      document.getElementById("add-user-req-no-spaces").style.color = validationResult.requirements.hasNoSpaces ? 'green' : 'red';
    });
  }
}

/**
 * Sets up the event handler for the add user form submission.
 */
function setupAddUserFormHandler() {
  const form = document.getElementById("addUserForm");
  const errorEl = document.getElementById("addUserError");
  const successEl = document.getElementById("addUserSuccess");
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = "Adding...";
    errorEl.textContent = '';
    errorEl.classList.add('hidden');
    successEl.textContent = '';
    successEl.classList.add('hidden');

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

    // 💡 OPTIMIZATION: Use a specific query instead of fetching all users
    try {
      const existingUser = await POSDatabase.getByIndex("users", "username", username.toLowerCase());
      if (existingUser.length > 0) {
        showError("addUserError", "Username already exists.");
        submitBtn.disabled = false;
        submitBtn.textContent = "Add User";
        return;
      }
    } catch (err) {
      console.error("Failed to check existing users:", err);
      showError("addUserError", "Could not check existing users. Try again.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Add User";
      return;
    }

    // 💡 OPTIMIZATION: Check for cashRegisterId uniqueness against the cached data
    const allUsers = await dataService.get("users");
    let cashRegisterId;
    let isUniqueLocally = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 10;

    while (!isUniqueLocally && attempts < MAX_ATTEMPTS) {
      const uniqueSuffix = generateRandomAlphanumeric(4);
      const generatedId = `EPOS-${uniqueSuffix}`;

      if (!allUsers.some(u => u.cashRegisterId === generatedId)) {
        cashRegisterId = generatedId;
        isUniqueLocally = true;
      }
      attempts++;
    }

    if (!isUniqueLocally) {
      showError("addUserError", "Could not generate a unique Cash Register ID. Please try again.");
      submitBtn.disabled = false;
      submitBtn.textContent = "Add User";
      return;
    }

    try {
      const passwordHash = await hashPassword(password);
      const newUserId = genId("user");

      await POSDatabase.put("users", {
        id: newUserId,
        username,
        passwordHash,
        role,
        cashRegisterId
      });

      // 💡 OPTIMIZATION: Update the local cache after a successful write
      const newlyCreatedUser = { id: newUserId, username, role, cashRegisterId };
      const usersArray = await dataService.get("users");
      usersArray.push(newlyCreatedUser);

      successEl.textContent = `User "${username}" added successfully with Cash Register ID: ${cashRegisterId}.`;
      successEl.classList.remove('hidden');

      setTimeout(() => {
        closeOrderModal();
        handleNav('users');
      }, 2000);

    } catch (error) {
      showError("addUserError", "Failed to add user. Please try again.");
      console.error("User creation error:", error);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Add User";
    }
  });
}

/**
 * Sets up event listeners for the modal, such as the cancel button and overlay click.
 */
function setupAddUserModalEvents() {
  const modal = document.getElementById("orderModal");
  document.getElementById("cancelAddUser").addEventListener("click", closeOrderModal);

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeOrderModal();
    }
  });
}