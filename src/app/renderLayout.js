// File: src/app/renderLayout.js
import { appState } from '../state/appState.js';
import { renderLogin } from '../auth/login.js';
import { renderSection } from './renderSection.js';
import { updateNavVisibility } from '../ui/navVisibility.js';
import { setupDrawerNav } from '../ui/drawer.js';
import { handleNav } from './handleNav.js';

export async function renderAppLayout() {
  const { currentUser } = appState;

  // 1. Session validation
  if (!currentUser || (currentUser.sessionExpiry && currentUser.sessionExpiry < Date.now())) {
    alert("Session expired. Please log in again.");
    localStorage.removeItem("currentSession");
    appState.currentUser = null;
    return renderLogin();
  }

  // 2. Inject layout
  const app = document.getElementById("app");
  if (!app) {
    console.error("#app container not found.");
    return;
  }

  const navLinks = [
    { section: "order", icon: "fas fa-cash-register", label: "Order" },
    { section: "sales", icon: "fas fa-chart-line", label: "Sales" },
    { section: "menu", icon: "fas fa-utensils", label: "Menu" },
    ...(currentUser.role === 'admin' ? [{ divider: true }, { section: "users", icon: "fas fa-users-cog", label: "Users" }] : []),
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
      <div class="app-logo">POS System</div>
    </header>

    <nav id="mainNav">
      <button id="drawerCloseBtn" class="nav-toggle-btn" title="Close Menu"><i class="fas fa-times"></i></button>
      <ul class="nav-list">${navLinksHtml}</ul>
    </nav>

    <main id="mainContent"></main>
    <div id="overlay" class="hidden"></div>
  `;

  // 3. Setup drawer toggle
  document.getElementById('drawerOpenBtn')?.addEventListener('click', () => {
    document.getElementById('mainNav')?.classList.add('open');
    document.getElementById('overlay')?.classList.replace('hidden', 'visible');
    document.body.classList.add('no-scroll');
  });

  try {
    setupDrawerNav();
  } catch (err) {
    console.error("Drawer setup failed:", err);
  }

  // 4. Nav handlers
  document.querySelectorAll('#mainNav .nav-link').forEach(btn => {
    btn.addEventListener("click", () => {
      const section = btn.dataset.section;
      if (section) {
        console.log("Navigating to section:", section);
        handleNav(section);
      }

      // Auto-close drawer on mobile
      if (window.innerWidth < 768) {
        document.getElementById('mainNav')?.classList.remove('open');
        document.getElementById('overlay')?.classList.replace('visible', 'hidden');
        document.body.classList.remove('no-scroll');
      }
    });
  });

  // 5. Initial section render
  requestAnimationFrame(() => {
    const main = document.getElementById("mainContent");
    if (!main) {
      console.warn("Main content not ready. Retrying...");
      return requestAnimationFrame(() => handleNav(appState.currentSection));
    }
    handleNav(appState.currentSection);
  });

  // 6. Highlight current section
  updateNavVisibility();
}
