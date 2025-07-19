// File: src/app/handleNav.js

import { appState } from '../state/appState.js';
import { renderLogin } from '../auth/login.js';
import { showPasswordChangeModal } from '../ui/passwordModal.js'; // This path is correct (src/ui/)

// --- IMPORTS FOR SECTION RENDERING FUNCTIONS ---
// These paths are now definitively correct, assuming handleNav.js is in src/app/
// and your section files are in src/sections/
import { renderOrderSection } from '../sections/order.js'; // Confirmed in src/sections/
import { renderSalesSection } from '../sections/sales.js';   // Confirmed in src/sections/
import { renderUserManagementSection } from '../sections/users.js'; // Confirmed in src/sections/
import { renderMenuManagement } from '../sections/menu.js';       // Confirmed in src/sections/
// If you create a dashboard.js in src/sections/, uncomment the line below:
// import { renderDashboardSection } from '../sections/dashboard.js';
// --- END IMPORTS ---


export function handleNav(section) {
    console.log("handleNav: Called for section:", section);

    const mainContent = document.getElementById('mainContent');
    if (!mainContent) {
        console.error("handleNav: #mainContent element not found. Cannot render section.");
        alert("System error: Main content area not found.");
        return;
    }

    // Handle Logout
    if (section === "logout") {
        alert("Logging out...");
        localStorage.removeItem("currentSession");
        appState.currentUser = null;
        appState.cart = []; // Clear cart on logout
        appState.currentSection = "order"; // Set default section after logout
        renderLogin(); // Redirect to login page/view
        return;
    }

    // Handle password change (uses a modal, doesn't replace main content)
    if (section === "change-password") {
        if (appState.currentUser) {
            showPasswordChangeModal(appState.currentUser);
        } else {
            console.error("handleNav: Cannot show password change modal, no current user.");
            alert("Please log in to change password.");
        }
        return; // Return immediately as modal is displayed, not a new section
    }

    // Admin-only sections check
    const adminOnlySections = ["users", "menu"];
    if (adminOnlySections.includes(section) && appState.currentUser?.role !== "admin") {
        alert("❌ Access denied: Admins only");
        // Optionally, redirect to a default non-admin section like 'order' or 'dashboard'
        // handleNav('order'); // Careful with recursive calls if it's the current active section
        return;
    }

    // Update the global app state for the current section
    appState.currentSection = section;

    // Highlight the active navigation button (applies to desktop nav and drawer)
    document.querySelectorAll('nav#mainNav .navBtn, #drawerLinks .drawerLinkBtn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.section === section);
    });

    // --- RENDER THE SPECIFIC SECTION CONTENT INTO #mainContent ---
    switch (section) {
        case 'order':
            renderOrderSection(mainContent);
            break;
        case 'sales':
            renderSalesSection(mainContent);
            break;
        case 'users':
            renderUserManagementSection(mainContent);
            break;
        case 'menu':
            renderMenuManagement(mainContent); // This will now correctly render your Menu Management section
            break;
        // case 'dashboard': // Uncomment if you create src/sections/dashboard.js
        //     renderDashboardSection(mainContent);
        //     break;
        default:
            console.warn("handleNav: Unknown section or rendering function not defined for:", section);
            // Fallback content or redirect to a default section if necessary
            mainContent.innerHTML = `
                <h2>Oops!</h2>
                <p>The requested section "${section}" could not be loaded or is not yet implemented.</p>
                <p>Please check your navigation and ensure all sections have a corresponding rendering function.</p>
            `;
            break;
    }
}