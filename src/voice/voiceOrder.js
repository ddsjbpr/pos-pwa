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

  if (
    lower.includes("बिल") || lower.includes("checkout") ||
    lower.includes("payment") || lower.includes("पेमेन्ट")
  ) {
    alert("✅ चेकआउट शुरू किया जा रहा है...");
    document.querySelector('[data-voice-checkout]')?.click();
    return;
  }

  const menuItems = await POSDatabase.getAll("menuItems");
  const found = menuItems.find(i => lower.includes(i.name.toLowerCase()));

  if (found) {
    appState.cart.push({
      id: found.id,
      name: found.name,
      qty: 1,
      finalPrice: found.price,
      variant: null,
      modifiers: []
    });

    alert(`✅ '${found.name}' को 1 qty के साथ कार्ट में जोड़ा गया`);
    renderSection('order');
  } else {
    alert("❓ यह आइटम नहीं मिला: " + transcript);
  }
}
