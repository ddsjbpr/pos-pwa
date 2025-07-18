console.log("main.js loaded!");

function initApp() {
  const root = document.getElementById("mainContent");
  if (!root) {
    console.error("❌ #mainContent not found");
    return;
  }

  root.innerHTML += `
    <p style="color:green;">✅ initApp executed</p>
    <ul>
      <li>📦 App initialized</li>
      <li>🎯 Ready to load modules</li>
    </ul>
  `;
}

initApp();
