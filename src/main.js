console.log("✅ main.js loaded!");

const root = document.getElementById("mainContent");
if (root) {
  root.innerHTML = "<h1 style='color:green;'>✅ POS App Loaded</h1>";
} else {
  console.error("❌ mainContent div not found!");
}
