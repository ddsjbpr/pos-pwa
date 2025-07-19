import { appState } from '../state/appState.js';
import { renderSection } from '../app/renderSection.js';

function processVoiceCommand(transcript) {
  const lower = transcript.toLowerCase();
  console.log("🧠 Processing voice command:", lower);

  // ✅ 1. PLACE ORDER
  if (
    lower.includes("place order") ||
    lower.includes("checkout") ||
    lower.includes("बिल") ||
    lower.includes("ऑर्डर पूरा") ||
    lower.includes("चेकआउट")
  ) {
    const placeBtn = document.getElementById("placeOrderBtn");
    if (placeBtn && !placeBtn.disabled) {
      placeBtn.click();
      alert("🧾 ऑर्डर प्लेस किया गया");
    } else {
      alert("🛒 कार्ट खाली है। पहले कुछ जोड़ें।");
    }
    return;
  }

  // ✅ 2. CLEAR CART
  if (
    lower.includes("clear cart") ||
    lower.includes("empty cart") ||
    lower.includes("cancel order") ||
    lower.includes("ऑर्डर कैंसिल") ||
    lower.includes("cart साफ")
  ) {
    appState.cart = [];
    alert("🧹 कार्ट साफ किया गया");
    renderSection("order");
    return;
  }

  // ✅ 3. ADD MORE OF LAST ITEM
  if (
    lower.includes("one more") ||
    lower.includes("एक और") ||
    lower.includes("same again") ||
    lower.includes("repeat item")
  ) {
    const lastItem = appState.cart[appState.cart.length - 1];
    if (lastItem) {
      const repeatItem = { ...lastItem, qty: 1 };
      appState.cart.push(repeatItem);
      alert(`🔁 एक और ${lastItem.name} जोड़ा गया`);
      renderSection("order");
    } else {
      alert("❌ कोई पिछला आइटम नहीं मिला");
    }
    return;
  }

  // ✅ 4. Add items (Lassi, Vada Pav)
  const itemNames = ["lassi", "लस्सी", "vada pav", "वड़ा पाव"];
  const modifiersList = ["kesar", "mango", "dryfruit", "pineapple", "strawberry", "litchi"];
  const modifiersHindi = {
    "केसर": "kesar",
    "मैंगो": "mango",
    "ड्रायफ्रूट": "dryfruit",
    "अनानास": "pineapple",
    "स्ट्रॉबेरी": "strawberry",
    "लीची": "litchi"
  };

  const isLassi = lower.includes("lassi") || lower.includes("लस्सी");
  const isVadaPav = lower.includes("vada pav") || lower.includes("वड़ा पाव");

  if (isLassi || isVadaPav) {
    const name = isLassi ? "Lassi" : "Vada Pav";

    // Variant detection
    let variant = null;
    if (lower.includes("full") || lower.includes("बड़ा")) variant = { name: "Full", price: 0 };
    if (lower.includes("half") || lower.includes("छोटा") || lower.includes("small")) variant = { name: "Half", price: 0 };

    // Modifier detection
    const modifiers = [];
    for (const m of modifiersList) {
      if (lower.includes(m)) {
        modifiers.push({ name: m, price: 0 });
      }
    }
    for (const [hindi, eng] of Object.entries(modifiersHindi)) {
      if (lower.includes(hindi)) {
        modifiers.push({ name: eng, price: 0 });
      }
    }

    const cartItem = {
      id: `voice-${Date.now()}`,
      name,
      variant,
      modifiers,
      finalPrice: 30, // You can calculate actual price from DB if needed
      qty: 1,
    };

    appState.cart.push(cartItem);
    alert(`➕ ${name} जोड़ा गया${variant ? " (" + variant.name + ")" : ""}${modifiers.length ? " with " + modifiers.map(m => m.name).join(", ") : ""}`);
    renderSection("order");
    return;
  }

  alert("❓ कमांड समझ नहीं आया");
}
