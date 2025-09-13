// File: src/ui/passwordModal.js

import { validatePassword } from '../utils/validation.js';
import { handlePasswordChange } from './changePassword.js';
import { closeOrderModal, openOrderModal } from './modals.js';
import { showError, hideError } from '../utils/dom.js'; // Assuming you have these utilities

export function showPasswordChangeModal(currentUser) {
  if (!currentUser?.username) {
    console.error("Access denied - no active session");
    showError("passwordChangeError", "Please login to change your password.");
    return;
  }

  const modal = document.getElementById("orderModal");
  if (!modal) {
    console.error("Modal container not found");
    // Since the modal isn't found, we can't show a message in it. A log is sufficient.
    console.error("System error: Cannot open password change modal");
    return;
  }

  modal.innerHTML = getPasswordModalHTML();
  openOrderModal();

  setupLiveValidation();
  setupFormHandler(currentUser);
  setupModalEvents();
}

function getPasswordModalHTML() {
  return `
    <div class="modal-content">
      <h3>Change Password</h3>
      <form id="passwordChangeForm">
        <input type="password" id="currentPassword" placeholder="Current Password" required autocomplete="current-password">
        <input type="password" id="newPassword" placeholder="New Password" required autocomplete="new-password">
        <div class="password-requirements">
          <p>Password must contain:</p>
          <ul>
            <li id="req-length">≥ 8 characters</li>
            <li id="req-upper">1 uppercase letter</li>
            <li id="req-lower">1 lowercase letter</li>
            <li id="req-number">1 number</li>
            <li id="req-special">1 special character (!@#$%^&*)</li>
            <li id="req-no-spaces">No blank spaces</li>
          </ul>
        </div>
        <input type="password" id="confirmPassword" placeholder="Confirm Password" required autocomplete="new-password">
        <div class="modal-actions">
          <button type="submit" class="btn-primary">Update Password</button>
          <button type="button" id="cancelPasswordChange" class="btn btn-secondary">Cancel</button>
        </div>
      </form>
      <div id="passwordChangeError" class="error-message hidden"></div>
      <div id="passwordChangeSuccess" class="success-message hidden"></div>
    </div>
  `;
}

function setupLiveValidation() {
  let validationTimer;
  document.getElementById("newPassword").addEventListener('input', (e) => {
    clearTimeout(validationTimer);
    validationTimer = setTimeout(() => {
      const validation = validatePassword(e.target.value);
      updateRequirementIndicators(validation.requirements);
    }, 300);
  });

  document.getElementById("confirmPassword").addEventListener('input', () => {
    const newPass = document.getElementById("newPassword").value;
    const confirm = document.getElementById("confirmPassword").value;
    const errorEl = document.getElementById("passwordChangeError");

    if (newPass && confirm && newPass !== confirm) {
      showError("passwordChangeError", "Passwords don't match");
    } else {
      hideError("passwordChangeError");
    }
  });
}

function updateRequirementIndicators(reqs) {
  document.getElementById("req-length").style.color = reqs.minLength ? 'green' : 'red';
  document.getElementById("req-upper").style.color = reqs.hasUpper ? 'green' : 'red';
  document.getElementById("req-lower").style.color = reqs.hasLower ? 'green' : 'red';
  document.getElementById("req-number").style.color = reqs.hasNumber ? 'green' : 'red';
  document.getElementById("req-special").style.color = reqs.hasSpecial ? 'green' : 'red';
  document.getElementById("req-no-spaces").style.color = reqs.hasNoSpaces ? 'green' : 'red';
}

function setupFormHandler(currentUser) {
  document.getElementById("passwordChangeForm").addEventListener('submit', async function (e) {
    e.preventDefault();
    const form = e.target;
    const errorEl = document.getElementById("passwordChangeError");
    const successEl = document.getElementById("passwordChangeSuccess");
    const submitBtn = form.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    submitBtn.textContent = "Updating...";
    hideError("passwordChangeError");
    hideError("passwordChangeSuccess");

    const result = await handlePasswordChange(form, currentUser);

    if (result.success) {
      successEl.textContent = "Password updated successfully!";
      successEl.classList.remove('hidden');
      form.reset();
      setTimeout(closeOrderModal, 2000); // Close after a delay to show the message
    } else {
      showError("passwordChangeError", result.message);
    }

    submitBtn.disabled = false;
    submitBtn.textContent = "Update Password";
  });
}

function setupModalEvents() {
  const modal = document.getElementById("orderModal");
  document.getElementById("cancelPasswordChange").addEventListener("click", closeOrderModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeOrderModal();
  });
  setTimeout(() => document.getElementById("currentPassword")?.focus(), 100);
}
