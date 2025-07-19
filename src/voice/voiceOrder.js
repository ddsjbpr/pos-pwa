// File: src/voice/voiceOrder.js

export function startVoiceOrder() {
  console.log("🎙️ startVoiceOrder called");

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    console.error("❌ SpeechRecognition not supported in this browser.");
    alert("Voice recognition is not supported on this device.");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.continuous = false;

  recognition.onstart = () => {
    console.log("🎤 Voice recognition started");
    alert("🎤 Voice listening started. Speak your order.");
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    console.log("📥 Voice input received:", transcript);
    alert("You said: " + transcript);

    // Future: parse and act on command
    processVoiceCommand(transcript);
  };

  recognition.onerror = (event) => {
    console.error("⚠️ Voice recognition error:", event.error);
    alert("Voice error: " + event.error);
  };

  recognition.onend = () => {
    console.log("🛑 Voice recognition ended");
    // Optional: Restart listening automatically
    // recognition.start();
  };

  recognition.start();
}

// Placeholder for actual voice command handling
function processVoiceCommand(transcript) {
  const lower = transcript.toLowerCase();
  console.log("🧠 Processing voice command:", lower);

  // Example logic:
  if (lower.includes("order") && lower.includes("burger")) {
    alert("🍔 Ordering a burger!");
    // triggerOrder('burger');
  } else if (lower.includes("cancel order")) {
    alert("❌ Cancelling order!");
    // cancelOrder();
  } else {
    alert("❓ Command not recognized.");
  }
}
