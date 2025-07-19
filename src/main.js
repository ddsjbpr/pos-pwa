// File: src/main.js

import { initApp } from './app/initApp.js';
import { startVoiceOrder } from './voice/voiceOrder.js';
import { setupInstallPrompt } from './voice/installPrompt.js'; // ✅ New for install prompt

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(console.error);
}

// Setup install button if eligible
setupInstallPrompt(); // ✅ Triggers custom "Install" button on eligible browsers

// Initialize app after DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  initApp().catch(err => {
    console.error("App failed to initialize:", err);
    alert("Failed to load the app. Please try again.");
  });

  // Check for voice mode activation via URL
  const params = new URLSearchParams(location.search);
  if (params.get('voice') === 'true') {
    console.log("🎙️ Voice mode activated");
    startVoiceOrder();
  }
});
