// File: src/utils/dom.js

/**
 * Displays an error message in a specific DOM element for a short duration.
 * @param {string} elementId - The ID of the HTML element to display the error in.
 * @param {string} message - The error message to display.
 */
 export function showError(elementId, message) {
  const el = document.getElementById(elementId);
  if (!el) {
      console.error(`Error element with ID "${elementId}" not found.`);
      return;
  }
  el.textContent = message;
  el.classList.remove("hidden");

  // Clear any existing timeout to prevent conflicts if showError is called rapidly
  // A more robust solution might involve storing timeouts per elementId.
  // For now, let's just make sure we re-apply the auto-hide.
  if (el._errorTimeout) {
      clearTimeout(el._errorTimeout);
  }

  el._errorTimeout = setTimeout(() => {
      el.classList.add("hidden");
      el.textContent = ''; // Clear text after hiding
      delete el._errorTimeout; // Clean up the reference
  }, 4000);
}

/**
* Hides an error message in a specific DOM element.
* @param {string} elementId - The ID of the HTML element to hide the error from.
*/
export function hideError(elementId) {
  const el = document.getElementById(elementId);
  if (el) {
      if (el._errorTimeout) {
          clearTimeout(el._errorTimeout); // Clear any pending auto-hide timeout
          delete el._errorTimeout;
      }
      el.classList.add("hidden");
      el.textContent = ''; // Clear the message
  }
}


/**
* Displays a custom alert message as a floating notification.
* @param {string} message - The message to display in the alert.
* @param {string} [type='info'] - The type of alert ('info', 'success', 'error', 'warning'). Affects styling.
* @param {number} [duration=3000] - How long the alert should be visible in milliseconds.
*/
export function showCustomAlert(message, type = 'info', duration = 3000) {
  let alertContainer = document.getElementById('customAlertContainer');

  // Create container if it doesn't exist
  if (!alertContainer) {
      const newContainer = document.createElement('div');
      newContainer.id = 'customAlertContainer';
      // Basic styling for the container (you should move this to your CSS file)
      newContainer.style.position = 'fixed';
      newContainer.style.top = '20px';
      newContainer.style.right = '20px';
      newContainer.style.zIndex = '1000';
      newContainer.style.display = 'flex';
      newContainer.style.flexDirection = 'column';
      newContainer.style.alignItems = 'flex-end'; // Align alerts to the right
      document.body.appendChild(newContainer);
      alertContainer = newContainer;
  }

  const alertBox = document.createElement('div');
  alertBox.className = `custom-alert custom-alert-${type}`;
  alertBox.textContent = message;

  // Basic styling for the alert box (move to CSS for production)
  alertBox.style.padding = '10px 20px';
  alertBox.style.borderRadius = '5px';
  alertBox.style.color = 'white';
  alertBox.style.marginBottom = '10px';
  alertBox.style.opacity = '0';
  alertBox.style.transition = 'opacity 0.5s ease-in-out, transform 0.3s ease-out';
  alertBox.style.transform = 'translateX(100%)'; // Start off-screen

  // Set background color based on type
  if (type === 'info') {
      alertBox.style.backgroundColor = '#2196F3'; // Blue
  } else if (type === 'success') {
      alertBox.style.backgroundColor = '#4CAF50'; // Green
  } else if (type === 'error') {
      alertBox.style.backgroundColor = '#f44336'; // Red
  } else if (type === 'warning') {
      alertBox.style.backgroundColor = '#ff9800'; // Orange
  }

  alertContainer.appendChild(alertBox);

  // Animate in
  setTimeout(() => {
      alertBox.style.opacity = '1';
      alertBox.style.transform = 'translateX(0)';
  }, 10); // Small delay to allow CSS transition

  // Animate out and remove
  setTimeout(() => {
      alertBox.style.opacity = '0';
      alertBox.style.transform = 'translateX(100%)'; // Slide out
      setTimeout(() => {
          if (alertBox.parentNode === alertContainer) { // Check if still attached
              alertContainer.removeChild(alertBox);
          }
          // Optionally remove container if empty and no longer needed
          if (alertContainer.children.length === 0 && alertContainer.id === 'customAlertContainer' && alertContainer.parentNode) {
              alertContainer.parentNode.removeChild(alertContainer);
          }
      }, 500); // Duration of fade-out transition
  }, duration);
}

/**
* Displays a custom confirmation dialog.
* Returns a Promise that resolves to true if confirmed, false if cancelled.
* @param {string} message - The message to display in the confirmation dialog.
* @param {string} [confirmText='Confirm'] - Text for the confirm button.
* @param {string} [cancelText='Cancel'] - Text for the cancel button.
* @returns {Promise<boolean>} - Resolves with true if confirmed, false if cancelled.
*/
export function showCustomConfirm(message, confirmText = 'Confirm', cancelText = 'Cancel') {
  return new Promise((resolve) => {
      let confirmModal = document.getElementById('customConfirmModal');
      if (!confirmModal) {
          confirmModal = document.createElement('div');
          confirmModal.id = 'customConfirmModal';
          confirmModal.style.position = 'fixed';
          confirmModal.style.top = '0';
          confirmModal.style.left = '0';
          confirmModal.style.width = '100%';
          confirmModal.style.height = '100%';
          confirmModal.style.backgroundColor = 'rgba(0,0,0,0.6)';
          confirmModal.style.display = 'flex';
          confirmModal.style.justifyContent = 'center';
          confirmModal.style.alignItems = 'center';
          confirmModal.style.zIndex = '1001';
          confirmModal.style.opacity = '0'; // Start hidden for fade-in
          confirmModal.style.transition = 'opacity 0.3s ease-in-out';

          confirmModal.innerHTML = `
              <div class="confirm-content" style="background-color: #fff; padding: 25px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.2); max-width: 400px; text-align: center;">
                  <p id="confirmMessage" style="font-size: 1.1em; margin-bottom: 20px;"></p>
                  <div style="display: flex; justify-content: space-around; gap: 10px;">
                      <button id="confirmBtn" class="btn btn-primary">
                      <button id="cancelBtn" class="btn btn-secondary"></button>
                  </div>
              </div>
          `;
          document.body.appendChild(confirmModal);
      }

      const confirmMessageEl = confirmModal.querySelector('#confirmMessage');
      const confirmBtn = confirmModal.querySelector('#confirmBtn');
      const cancelBtn = confirmModal.querySelector('#cancelBtn');

      confirmMessageEl.textContent = message;
      confirmBtn.textContent = confirmText;
      cancelBtn.textContent = cancelText;

      // Ensure only one set of listeners is active
      const cloneConfirmBtn = confirmBtn.cloneNode(true);
      const cloneCancelBtn = cancelBtn.cloneNode(true);
      confirmBtn.parentNode.replaceChild(cloneConfirmBtn, confirmBtn);
      cancelBtn.parentNode.replaceChild(cloneCancelBtn, cancelBtn);

      const closeConfirm = (result) => {
          confirmModal.style.opacity = '0';
          setTimeout(() => {
              confirmModal.style.display = 'none';
              // Remove the modal from DOM if it was dynamically created and only for this purpose
              if (confirmModal.id === 'customConfirmModal' && confirmModal.parentNode) {
                  // We keep the modal in the DOM for re-use, just hide it
                  // confirmModal.parentNode.removeChild(confirmModal);
              }
              resolve(result);
          }, 300); // Match transition duration
      };

      cloneConfirmBtn.onclick = () => closeConfirm(true);
      cloneCancelBtn.onclick = () => closeConfirm(false);

      // Allow clicking outside to cancel
      confirmModal.onclick = (e) => {
          if (e.target === confirmModal) {
              closeConfirm(false);
          }
      };

      // Show the modal
      confirmModal.style.display = 'flex';
      setTimeout(() => { // Small delay for transition to work
          confirmModal.style.opacity = '1';
      }, 10);
  });
}