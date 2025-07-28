import { appState } from '../state/appState.js';
import { renderOrderSection } from '../sections/order.js';
import { renderSalesSection } from '../sections/sales.js';
import { renderUserManagementSection } from '../sections/users.js';
import { renderMenuManagement } from '../sections/menu.js';

export function renderSection(section) {
  const main = document.getElementById("mainContent");
  if (!main) return;

  const isAdminOnly = ["users", "menu"];
  if (isAdminOnly.includes(section) && appState.currentUser?.role !== "admin") {
    main.innerHTML = "<h2>🚫 Access denied</h2>";
    return;
  }

  switch (section) {
    case "order": return renderOrderSection(main);
    case "sales": return renderSalesSection(main);
    case "users": return renderUserManagementSection(main);
    case "menu": return renderMenuManagement();
    default: main.innerHTML = "<h2>Unknown Section</h2>";
  }
}
