// File: src/main.js
import { initApp } from './app/initApp.js';

window.addEventListener('DOMContentLoaded', () => {
  initApp().catch(err => {
    console.error("App failed to initialize:", err);
    alert("Failed to load the app. Please try again.");
  });
});
const params = new URLSearchParams(location.search);
if (params.get('voice') === 'true') {
  console.log("🎙️ Voice mode activated");
  startVoiceOrder(); // You’ll implement this
}
