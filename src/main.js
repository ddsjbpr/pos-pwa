// src/main.js

console.log("✅ main.js loaded!");

const root = document.getElementById("mainContent");
if (root) {
  root.innerHTML = "<h1>Welcome to POS App</h1><p>Start building your UI here.</p>";
} else {
  console.error("❌ #mainContent not found!");
}
