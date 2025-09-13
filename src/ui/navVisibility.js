// File: src/ui/navVisibility.js

/**
 * Updates the visibility of navigation elements based on the window's width.
 * This function assumes a CSS class `.hidden { display: none !important; }` exists.
 */
 export function updateNavVisibility() {
  // Check if the window is in a mobile state (less than 768px)
  const isMobile = window.innerWidth < 768;
  
  // Select all desktop-only navigation buttons and toggle the 'hidden' class.
  // This is a cleaner and more standard way to handle visibility.
  const desktopButtons = document.querySelectorAll("nav#mainNav .desktop-only-nav-btn");
  desktopButtons.forEach(btn => {
    btn.classList.toggle("hidden", isMobile);
  });

  // Select the menu toggle button and toggle its visibility.
  const toggleButton = document.querySelector("nav#mainNav .menu-toggle-btn");
  if (toggleButton) {
    toggleButton.classList.toggle("hidden", !isMobile);
  }
}

/**
 * Sets up a resize event listener to automatically update navigation visibility
 * whenever the window size changes. It also runs the update once on page load.
 */
export function setupNavVisibilityListener() {
  window.addEventListener("resize", updateNavVisibility);
  updateNavVisibility(); // Initial check on page load
}
