// File: src/ui/Modals.js

/**
 * Opens the order modal by changing its display style and adding a class to the body.
 * This function should be called when a user action requires displaying the modal.
 */
 export function openOrderModal() {
  const modal = document.getElementById('orderModal');
  if (!modal) {
    console.error("openOrderModal: 'orderModal' element not found.");
    return;
  }
  modal.style.display = 'flex';
  document.body.classList.add('modal-open');
}

/**
 * Closes the order modal, hides it, and removes its contents for cleanup.
 * This ensures the modal is clean and ready for new content the next time it's opened.
 */
export function closeOrderModal() {
  const modal = document.getElementById('orderModal');
  if (!modal) {
    console.error("closeOrderModal: 'orderModal' element not found.");
    return;
  }
  modal.style.display = 'none';
  document.body.classList.remove('modal-open');
  modal.innerHTML = '';
}
