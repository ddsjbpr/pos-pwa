import { renderSection } from '../app/renderSection.js';
import { appState } from '../state/appState.js';
import { findMenuItemDetails } from './voiceUtils.js';

export function startVoiceOrder() {
  console.log("🎙️ startVoiceOrder called");

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    console.error("❌ SpeechRecognition not supported in this browser.");
    alert("यह ब्राउज़र वॉइस सपोर्ट नहीं करता।");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'hi-IN'; // for Hindi; can fall back to 'en-IN' if needed
  recognition.interimResults = false;
  recognition.continuous = false;

  recognition.onstart = () => {
    console.log("🎤 Voice recognition started");
    alert("🎤 सुन रहा हूँ, अपना ऑर्डर बताइए...");
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript.trim();
    console.log("📥 Voice input received:", transcript);
    alert("🔊 आपने कहा: " + transcript);

    processVoiceCommand(transcript.toLowerCase());
  };

  recognition.onerror = (event) => {
    console.error("⚠️ Voice recognition error:", event.error);
    alert("Voice error: " + event.error);
  };

  recognition.onend = () => {
    console.log("🛑 Voice recognition ended");
    // Optional: restart
    // recognition.start();
  };

  recognition.start();
}

// ✅ Process command and push item to cart
function processVoiceCommand(transcript) {
  console.log("🧠 Processing voice command:", transcript);

  // ✅ Cancel order
  if (transcript.includes("cancel") || transcript.includes("रद्द")) {
    appState.cart = [];
    alert("❌ ऑर्डर रद्द किया गया");
    renderSection("order");
    return;
  }

  // ✅ Checkout
  if (
    transcript.includes("checkout") || transcript.includes("place") ||
    transcript.includes("complete") || transcript.includes("पूरा") ||
    transcript.includes("ख़त्म") || transcript.includes("ऑर्डर कर दो")
  ) {
    document.getElementById("placeOrderBtn")?.click();
    return;
  }

  // ✅ Add item from menu
  findMenuItemDetails(transcript).then(item => {
    if (!item) {
      alert("❌ कोई आइटम नहीं मिला");
      return;
    }

    appState.cart.push({ ...item, qty: 1 });
    alert(`➕ ${item.name} जोड़ा गया${item.variant ? " (" + item.variant.name + ")" : ""}${item.modifiers?.length ? " with " + item.modifiers.map(m => m.name).join(", ") : ""}`);
    renderSection("order");
  });
}
