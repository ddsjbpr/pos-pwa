// File: src/app/handleNav.js

import { appState } from '../state/appState.js';
import { renderLogin } from '../auth/login.js';
import { showPasswordChangeModal } from '../ui/passwordModal.js';

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

// --- Admin-only section restriction ---
function isAccessAllowed(section, user) {
  const adminOnlySections = ['users', 'menu'];
  return !(adminOnlySections.includes(section) && user?.role !== 'admin');
}

// --- Optional helper to log out the user ---
function logout() {
  alert("Logging out...");
  localStorage.removeItem("currentSession");
  appState.currentUser = null;
  appState.cart = [];
  appState.currentSection = "order";
  renderLogin(); // Show login view without layout
}

export function handleNav(section) {
  console.log("handleNav: Called for section:", section);

  const mainContent = document.getElementById('mainContent');

  // ✅ Safe exit if layout not loaded yet
  if (!mainContent) {
    console.warn("handleNav: #mainContent not found. Skipping render until layout is ready.");
    return;
  }

  // Handle logout
  if (section === "logout") {
    logout();
    return;
  }

  // Handle password change
  if (section === "change-password") {
    if (appState.currentUser) {
      showPasswordChangeModal(appState.currentUser);
    } else {
      alert("Please log in to change password.");
    }
    return;
  }

  // Enforce access restrictions
  if (!isAccessAllowed(section, appState.currentUser)) {
    alert("❌ Access denied: Admins only");
    return;
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
