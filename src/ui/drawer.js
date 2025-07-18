// File: src/ui/drawer.js
import { handleNav } from '../app/handleNav.js'; // Ensure this import path is correct and present

export function setupDrawerNav() {
    const mainNav = document.getElementById('mainNav');
    const drawerOpenBtn = document.getElementById('drawerOpenBtn');
    const drawerCloseBtn = document.getElementById('drawerCloseBtn');
    const overlay = document.getElementById('overlay');

    if (!mainNav || !drawerOpenBtn || !drawerCloseBtn || !overlay) {
        console.error("Drawer elements not found. Cannot set up drawer navigation.");
        return;
    }

    // Event listener for opening the drawer
    drawerOpenBtn.addEventListener('click', () => {
        mainNav.classList.add('open');
        overlay.classList.add('visible');
        overlay.classList.remove('hidden'); // Ensure 'hidden' class is removed
        document.body.classList.add('no-scroll'); // Prevent body scrolling when drawer is open
    });

    // Event listener for closing the drawer using the close button inside it
    drawerCloseBtn.addEventListener('click', () => {
        mainNav.classList.remove('open');
        overlay.classList.remove('visible');
        overlay.classList.add('hidden');
        document.body.classList.remove('no-scroll');
    });

    // Event listener for closing the drawer by clicking the overlay
    overlay.addEventListener('click', () => {
        mainNav.classList.remove('open');
        overlay.classList.remove('visible');
        overlay.classList.add('hidden');
        document.body.classList.remove('no-scroll');
    });

    // Add click handlers to nav links inside the drawer to close it after selection
    const navLinks = mainNav.querySelectorAll('.nav-list .nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            // Prevent default button behavior, especially if it's a link or form submission
            event.preventDefault();

            // Call handleNav if this button has a data-section attribute
            if (link.dataset.section) {
                console.log("Drawer: Nav link clicked for section:", link.dataset.section);
                handleNav(link.dataset.section); // This is line 43 in the provided drawer.js structure
            }

            // Close the drawer immediately after a link is clicked
            mainNav.classList.remove('open');
            overlay.classList.remove('visible');
            overlay.classList.add('hidden');
            document.body.classList.remove('no-scroll');
        });
    });

    // Handle window resize to close drawer if it's open and screen becomes desktop size
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 768) { // Assuming 768px is your desktop breakpoint from responsive.css
            if (mainNav.classList.contains('open')) {
                mainNav.classList.remove('open');
                overlay.classList.remove('visible');
                overlay.classList.add('hidden');
                document.body.classList.remove('no-scroll');
            }
        }
    });
}