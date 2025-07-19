// File: src/app/renderLayout.js
import { appState } from '../state/appState.js';
import { renderLogin } from '../auth/login.js';
import { renderSection } from './renderSection.js';
import { updateNavVisibility } from '../ui/navVisibility.js';
import { setupDrawerNav } from '../ui/drawer.js';
import { handleNav } from './handleNav.js';

export async function renderAppLayout() {
  const { currentUser } = appState;

  // 1. Check session validity
  if (!currentUser) {
    console.error("renderAppLayout called without a logged-in user.");
    alert("Session expired. Please log in again.");
    return renderLogin();
  }

  if (currentUser.sessionExpiry && currentUser.sessionExpiry < Date.now()) {
    alert("Session expired. Please log in again.");
    localStorage.removeItem("currentSession");
    appState.currentUser = null;
    return renderLogin();
  }

  // 2. Get #app container
  const app = document.getElementById("app");
  if (!app) {
    console.error("#app container not found.");
    return;
  }

  // 3. Build navigation links
  const navLinksHtml = `
    <li><button class="nav-link" data-section="order"><i class="fas fa-cash-register"></i> Order</button></li>
    <li><button class="nav-link" data-section="sales"><i class="fas fa-chart-line"></i> Sales</button></li>
    <li><button class="nav-link" data-section="menu"><i class="fas fa-utensils"></i> Menu</button></li>
    ${currentUser.role === 'admin' ? `
      <li class="nav-divider"></li>
      <li><button class="nav-link" data-section="users"><i class="fas fa-users-cog"></i> Users</button></li>
    ` : ''}
    <li class="nav-divider"></li>
    <li><button class="nav-link" data-section="change-password"><i class="fas fa-key"></i> Change Password</button></li>
    <li><button class="nav-link" data-section="logout"><i class="fas fa-sign-out-alt"></i> Logout (${currentUser.username})</button></li>
  `;

  // 4. Construct layout HTML
  const layoutHtml = `
    <header id="appHeader">
      <button id="drawerOpenBtn" title="Open Menu" class="nav-toggle-btn">
        <i class="fas fa-bars"></i>
      </button>
      <div class="app-logo">POS System</div>
    </header>

    <nav id="mainNav">
      <button id="drawerCloseBtn" class="nav-toggle-btn" title="Close Menu">
        <i class="fas fa-times"></i>
      </button>
      <ul class="nav-list">
        ${navLinksHtml}
      </ul>
    </nav>

    <main id="mainContent"></main>

    <div id="overlay" class="hidden"></div>
  `;

  // 5. Inject layout
  app.innerHTML = layoutHtml;

  // 6. Set up drawer open button (hamburger)
  const drawerOpenBtn = document.getElementById('drawerOpenBtn');
  drawerOpenBtn?.addEventListener('click', () => {
    document.getElementById('mainNav')?.classList.add('open');
    document.getElementById('overlay')?.classList.add('visible');
    document.getElementById('overlay')?.classList.remove('hidden');
    document.body.classList.add('no-scroll');
  });

  // 7. Set up drawer close button and overlay
  try {
    setupDrawerNav();
  } catch (err) {
    console.error("Failed to set up drawer navigation:", err);
  }

  // 8. Assign handlers to nav links
  try {
    const navButtons = document.querySelectorAll('#mainNav .nav-link');

    navButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const section = btn.dataset.section;
        if (section) {
          console.log("Navigating to section:", section);
          handleNav(section);
        }

        // Auto-close drawer on mobile
        if (window.innerWidth < 768) {
          document.getElementById('mainNav')?.classList.remove('open');
          document.getElementById('overlay')?.classList.remove('visible');
          document.getElementById('overlay')?.classList.add('hidden');
          document.body.classList.remove('no-scroll');
        }
      });
    });
  } catch (err) {
    console.error("Failed to assign nav button handlers:", err);
  }

  // 9. Render the selected section
  try {
    renderSection(appState.currentSection);
  } catch (err) {
    console.error("Failed to render section:", appState.currentSection, err);
    alert("Could not load content.");
  }

  // 10. Highlight current section in nav
  updateNavVisibility();
}
