// File: src/app/handleNav.js

import { appState } from '../state/appState.js';
import { renderLogin } from '../auth/login.js';
import { showPasswordChangeModal } from '../ui/passwordModal.js';
import { logout } from '../auth/logout.js'; // <-- Correctly import the centralized logout function

import { renderOrderSection } from '../sections/order.js';
import { renderSalesSection } from '../sections/sales.js';
import { renderUserManagementSection } from '../sections/users.js';
import { renderMenuManagement } from '../sections/menu.js';

// --- Section-to-renderer map for easy extensibility ---
const sectionRenderers = {
  order: renderOrderSection,
  sales: renderSalesSection,
  users: renderUserManagementSection,
  menu: renderMenuManagement
};

/**
 * Checks if the current user has permission to view a section.
 * @param {string} section - The name of the section.
 * @param {object} user - The current user object.
 * @returns {boolean} - True if access is allowed, otherwise false.
 */
function isAccessAllowed(section, user) {
  const adminOnlySections = ['users', 'menu'];
  const isDenied = adminOnlySections.includes(section) && user?.role !== 'admin';
  
  if (isDenied) {
    // Instead of a blocking `alert`, log a warning or show a custom modal.
    console.warn("❌ Access denied: Admins only. Attempted to access:", section);
    return false;
  }
  
  return true;
}

export function handleNav(section) {
  console.log("handleNav: Called for section:", section);

  const mainContent = document.getElementById('mainContent');

  // Safe exit if layout not loaded yet
  if (!mainContent) {
    console.warn("handleNav: #mainContent not found. Skipping render until layout is ready.");
    return;
  }

  // Handle logout
  if (section === "logout") {
    // Use the centralized logout function
    logout();
    return;
  }

  // Handle password change
  if (section === "change-password") {
    if (appState.currentUser) {
      showPasswordChangeModal(appState.currentUser);
    } else {
      // Use a non-blocking console warning instead of `alert()`
      console.warn("Please log in to change your password.");
    }
    return;
  }

  // Enforce access restrictions
  if (!isAccessAllowed(section, appState.currentUser)) {
    return; // isAccessAllowed now handles the warning internally
  }

  appState.currentSection = section;

  // Highlight active nav buttons
  document.querySelectorAll('nav#mainNav .navBtn, #drawerLinks .drawerLinkBtn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === section);
  });

  // Render section via mapping
  const renderer = sectionRenderers[section];
  if (renderer) {
    renderer(mainContent);
  } else {
    console.warn("handleNav: Unknown section or rendering function not defined for:", section);
    mainContent.innerHTML = `
      <h2>Oops!</h2>
      <p>The section "${section}" could not be loaded or is not yet implemented.</p>
    `;
  }
}
