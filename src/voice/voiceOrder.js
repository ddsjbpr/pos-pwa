export function startVoiceOrder() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Your browser doesn't support voice recognition.");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    console.log("🎤 Listening for order...");
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    console.log("🗣️ Voice command received:", transcript);
    alert(`Heard: "${transcript}"`);
    // TODO: Parse transcript and map to product/menu items
  };

  recognition.onerror = (err) => {
    console.error("🎙️ Voice error:", err);
    alert("Voice recognition failed: " + err.error);
  };

  recognition.start();
}
