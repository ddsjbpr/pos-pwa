// File: src/app/renderSection.js
import { renderOrderSection } from '../sections/order.js';
import { renderSalesSection } from '../sections/sales.js';
import { renderUserManagementSection } from '../sections/users.js';
import { renderMenuManagement } from '../sections/menu.js';

/**
 * Renders a specific application section into the main content area.
 * This function is a central router for the application's different views.
 * @param {string} section - The name of the section to render.
 */
export function renderSection(section) {
  const main = document.getElementById("mainContent");
  if (!main) {
    console.error("renderSection: #mainContent not found.");
    return;
  }

  // Use a switch statement to render the correct section.
  // The access control check has been moved to handleNav.js to avoid duplication.
  switch (section) {
    case "order":
      renderOrderSection(main);
      break;
    case "sales":
      renderSalesSection(main);
      break;
    case "users":
      renderUserManagementSection(main);
      break;
    case "menu":
      // All rendering functions should receive the main content container.
      renderMenuManagement(main);
      break;
    default:
      main.innerHTML = `<h2>Unknown Section: ${section}</h2>`;
      console.warn("renderSection: Unknown section requested:", section);
  }
}
