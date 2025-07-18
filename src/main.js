console.log("main.js loaded!");

function initApp() {
  const root = document.getElementById("app"); // Use #app instead of #mainContent
  if (!root) {
    console.error("❌ #app not found");
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
