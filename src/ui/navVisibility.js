export function updateNavVisibility() {
  const isMobile = window.innerWidth < 768;
  const desktopButtons = document.querySelectorAll("nav#mainNav .desktop-only-nav-btn");
  const toggleButton = document.querySelector("nav#mainNav .menu-toggle-btn");

  desktopButtons.forEach(btn => {
    btn.style.display = isMobile ? "none" : "block";
    btn.classList.toggle("hidden", isMobile);
    console.log("Mobile Check:", isMobile, "Button:", btn.textContent, "Display:", btn.style.display);
  });

  if (toggleButton) {
    toggleButton.style.display = isMobile ? "flex" : "none";
    toggleButton.classList.toggle("hidden", !isMobile);
  }
}

export function setupNavVisibilityListener() {
  window.addEventListener("resize", updateNavVisibility);
  updateNavVisibility(); // run once on load
}
