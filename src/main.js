// File: src/main.js
import { initApp } from './app/initApp.js';
import { startVoiceOrder } from './voice/voiceOrder.js'; // 🧠 Add this import (create this file)

window.addEventListener('DOMContentLoaded', () => {
  initApp().catch(err => {
    console.error("App failed to initialize:", err);
    alert("Failed to load the app. Please try again.");
  });

  const params = new URLSearchParams(location.search);
  if (params.get('voice') === 'true') {
    console.log("🎙️ Voice mode activated");
    startVoiceOrder(); // ✅ Safely called after import
  }
});
