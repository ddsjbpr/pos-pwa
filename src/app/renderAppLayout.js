import { appState } from '../state/appState.js';
import { handleNav } from './handleNav.js';
import { logout } from '../auth/logout.js'; // This is imported but not used, may want to remove if not needed elsewhere
import { loadCSS } from '../utils/cssLoader.js'; // This is imported but not used, may want to remove if not needed elsewhere
import { setupDrawerNav } from '../ui/drawer.js';

/**
 * Renders the main application layout, including the navigation bar and the main content area.
 * It also sets up event listeners for all navigation buttons.
 * This function should only be called after a user has successfully logged in or registered.
 */
export async function renderAppLayout() {
  const { currentUser } = appState;
  const app = document.getElementById("app");

  if (!app) {
    console.error("renderAppLayout: #app element not found. Cannot render layout.");
    return;
  }

  // Define nav links dynamically based on user role
  const navLinks = [
    { section: "order", icon: "fas fa-cash-register", label: "Order" },
    { section: "sales", icon: "fas fa-chart-line", label: "Sales" },
    { section: "menu", icon: "fas fa-utensils", label: "Menu" },
    ...(currentUser?.role === 'admin' ? [{ divider: true }, { section: "users", icon: "fas fa-users-cog", label: "Users" }] : []),
    { divider: true },
    { section: "change-password", icon: "fas fa-key", label: "Change Password" },
    { section: "logout", icon: "fas fa-sign-out-alt", label: `Logout (${currentUser.username})` }
  ];

  const navLinksHtml = navLinks.map(link => {
    if (link.divider) return `<li class="nav-divider"></li>`;
    const safeLabel = link.label.replace(/[<>&]/g, "");
    return `<li><button class="nav-link" data-section="${link.section}"><i class="${link.icon}"></i> ${safeLabel}</button></li>`;
  }).join("");

  app.innerHTML = `
    <header id="appHeader">
      <button id="drawerOpenBtn" title="Open Menu" class="nav-toggle-btn"><i class="fas fa-bars"></i></button>
      <div class="app-logo">
        <img src="icons/icon-72x72.png" alt="PWA Logo" class="header-logo"> <span id="outletNameDisplay">Jassi Di Lassi</span>
      </div>
    </header>

    <nav id="mainNav">
      <button id="drawerCloseBtn" class="nav-toggle-btn" title="Close Menu"><i class="fas fa-times"></i></button>
      <ul class="nav-list">${navLinksHtml}</ul>
    </nav>

    <main id="mainContent"></main>
    <div id="overlay" class="hidden"></div>
  `;

  // All drawer and nav link event handling is now managed by the centralized setupDrawerNav function.
  setupDrawerNav();

  // Render the initial section of the application
  handleNav(appState.currentSection || 'order');
}