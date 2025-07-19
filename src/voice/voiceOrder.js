// File: src/voice/voiceOrder.js

import { POSDatabase } from '../db/posDatabase.js';
import { appState } from '../state/appState.js';
import { renderSection } from '../app/renderSection.js';

export async function startVoiceOrder() {
  console.log("🎙️ startVoiceOrder called");

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.error("❌ SpeechRecognition not supported in this browser.");
    alert("यह डिवाइस वॉयस रिकग्निशन को सपोर्ट नहीं करता।");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'hi-IN'; // Hindi locale
  recognition.interimResults = false;
  recognition.continuous = false;

  recognition.onstart = () => {
    console.log("🎤 Voice recognition started (Hindi)");
    alert("🎤 ऑर्डर बोलें (उदाहरण: 'एक समोसा देना')");
  };

  recognition.onresult = async (event) => {
    const transcript = event.results[0][0].transcript;
    console.log("📥 Voice input:", transcript);
    alert("आपने कहा: " + transcript);

    await processVoiceCommand(transcript);
  };

  recognition.onerror = (event) => {
    console.error("⚠️ Voice recognition error:", event.error);
    alert("वॉयस एरर: " + event.error);
  };

  recognition.onend = () => {
    console.log("🛑 Voice recognition ended");
    // Optionally restart listening
    // recognition.start();
  };

  recognition.start();
}

async function processVoiceCommand(transcript) {
  const lower = transcript.toLowerCase();

  // Check for checkout phrases
  if (
    lower.includes("बिल") || lower.includes("checkout") ||
    lower.includes("पेमेन्ट") || lower.includes("payment")
  ) {
    alert("✅ चेकआउट शुरू किया जा रहा है...");
    document.querySelector('[data-voice-checkout]')?.click();
    return;
  }

  // Get menu items
  const menuItems = await POSDatabase.getAll("menuItems");
  const menuNames = menuItems.map(i => i.name.toLowerCase());

  // Try matching any item name in transcript
  const found = menuItems.find(i => lower.includes(i.name.toLowerCase()));
  if (found) {
    alert(`🛒 '${found.name}' को ऑर्डर में जोड़ा जाएगा`);
    document.querySelector(`[data-voice-item="${found.name.toLowerCase()}"]`)?.click();
  } else {
    alert("❓ यह आइटम नहीं मिला: " + transcript);
  }
}
