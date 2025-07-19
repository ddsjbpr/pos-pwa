import { renderSection } from '../app/renderSection.js';
import { POSDatabase } from '../db/posDatabase.js';
import { appState } from '../state/appState.js';

export async function startVoiceOrder() {
  console.log("🎙️ Voice Order Listening Started...");

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("⚠️ Voice recognition not supported on this device.");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'hi-IN'; // Hindi primary, fallback to en-US if needed
  recognition.interimResults = false;
  recognition.continuous = false;

  recognition.onstart = () => {
    console.log("🎤 Voice recognition active");
    alert("🎤 सुनना शुरू...");
  };

  recognition.onresult = async (event) => {
    const transcript = event.results[0][0].transcript.trim().toLowerCase();
    console.log("🎧 Voice input:", transcript);
    alert("आपने कहा: " + transcript);
    await processVoiceCommand(transcript);
  };

  recognition.onerror = (event) => {
    console.error("❌ Voice recognition error:", event.error);
    alert("Voice error: " + event.error);
  };

  recognition.onend = () => {
    console.log("🛑 Voice recognition ended");
    // You can auto-restart listening if needed:
    // recognition.start();
  };

  recognition.start();
}

async function processVoiceCommand(transcript) {
  const lower = transcript.toLowerCase();

  // ✅ Step 1: Trigger order section
  if (
    lower.includes("start order") || lower.includes("order शुरू") ||
    lower.includes("order chalu") || lower.includes("ऑर्डर शुरू") ||
    lower.includes("menu") || lower.includes("order page")
  ) {
    alert("🛒 ऑर्डर पेज खोल रहे हैं...");
    renderSection("order");
    setTimeout(() => startVoiceOrder(), 1500); // Keep listening
    return;
  }

  // ✅ Step 2: Fetch menu
  const menuItems = await POSDatabase.getAll("menuItems");

  // ✅ Step 3: Parse item name
  const item = menuItems.find(i =>
    lower.includes(i.name.toLowerCase()) ||
    (i.voiceAliases && i.voiceAliases.some(a => lower.includes(a.toLowerCase())))
  );

  if (!item) {
    alert("🔍 कोई आइटम नहीं मिला।");
    return;
  }

  // ✅ Step 4: Parse variant
  let selectedVariant = null;
  if (item.variants?.length) {
    selectedVariant =
      item.variants.find(v =>
        lower.includes(v.name.toLowerCase()) ||
        (v.voiceAliases && v.voiceAliases.some(a => lower.includes(a.toLowerCase())))
      ) || null;
  }

  // ✅ Step 5: Parse modifiers
  let selectedModifiers = [];
  if (item.modifiers?.length) {
    selectedModifiers = item.modifiers.filter(m =>
      lower.includes(m.name.toLowerCase()) ||
      (m.voiceAliases && m.voiceAliases.some(a => lower.includes(a.toLowerCase())))
    );
  }

  // ✅ Step 6: Add to cart
  const finalPrice =
    (selectedVariant?.price || item.price) +
    selectedModifiers.reduce((sum, m) => sum + m.price, 0);

  const cartItem = {
    id: item.id,
    name: item.name,
    variant: selectedVariant,
    modifiers: selectedModifiers,
    qty: 1,
    finalPrice,
  };

  appState.cart.push(cartItem);
  alert(`✅ ${item.name} ${selectedVariant ? "(" + selectedVariant.name + ")" : ""} जोड़ा गया`);

  // ✅ Step 7: Check for checkout
  if (lower.includes("checkout") || lower.includes("order complete") || lower.includes("ऑर्डर पूरा")) {
    alert("🧾 ऑर्डर पूरा किया जा रहा है...");
    document.getElementById("placeOrderBtn")?.click();
    return;
  }

  // ✅ Step 8: Keep listening
  setTimeout(() => startVoiceOrder(), 1500);
}
