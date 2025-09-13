// File: src/ui/drawer.js

import { handleNav } from '../app/handleNav.js';

/**
 * Toggles the drawer's open/close state.
 * @param {HTMLElement} mainNav - The main navigation element (the drawer).
 * @param {HTMLElement} overlay - The overlay element.
 * @param {boolean} open - True to open the drawer, false to close it.
 */
function toggleDrawer(mainNav, overlay, open) {
  mainNav.classList.toggle('open', open);
  overlay.classList.toggle('visible', open);
  document.body.classList.toggle('no-scroll', open);
}

/**
 * Sets up all event listeners for the mobile drawer navigation.
 * This includes opening, closing, and handling navigation clicks.
 */
export function setupDrawerNav() {
  const mainNav = document.getElementById('mainNav');
  const drawerOpenBtn = document.getElementById('drawerOpenBtn');
  const drawerCloseBtn = document.getElementById('drawerCloseBtn');
  const overlay = document.getElementById('overlay');
  const mainContent = document.getElementById('mainContent');

  if (!mainNav || !drawerOpenBtn || !drawerCloseBtn || !overlay || !mainContent) {
    console.error("Drawer elements not found. Cannot set up drawer navigation.");
    return;
  }

  // Event listener for opening the drawer
  drawerOpenBtn.addEventListener('click', () => {
    toggleDrawer(mainNav, overlay, true);
  });

  // Event listener for closing the drawer using the close button or overlay
  const closeDrawer = () => {
    toggleDrawer(mainNav, overlay, false);
  };

  drawerCloseBtn.addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);

  // Add click handlers to nav links using event delegation for better performance
  mainNav.addEventListener("click", (e) => {
    const target = e.target.closest('.nav-link');
    if (target) {
      const section = target.dataset.section;
      if (section) {
        handleNav(section);
      }
      // Auto-close drawer on mobile
      closeDrawer();
    }
  });

  // NEW: Add a click listener to the main content area to close the drawer
  mainContent.addEventListener('click', () => {
    if (mainNav.classList.contains('open')) {
      closeDrawer();
    }
  });

  // Handle window resize to close drawer if it becomes a desktop screen
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 768 && mainNav.classList.contains('open')) {
      closeDrawer();
    }
  });
}