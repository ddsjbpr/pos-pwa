import { POSDatabase } from '../db/posDatabase.js';
import { appState } from '../state/appState.js';
import { renderSection } from '../app/renderSection.js';

async function processVoiceCommand(transcript) {
  const lower = transcript.toLowerCase();

  const menuItems = await POSDatabase.getAll("menuItems");
  const itemMatched = menuItems.find(i => lower.includes(i.name.toLowerCase()));

  if (!itemMatched) {
    alert("❓ कोई आइटम नहीं मिला। कृपया सही से बोलें।");
    return;
  }

  const cartItem = {
    id: itemMatched.id,
    name: itemMatched.name,
    variant: null,
    modifiers: [],
    qty: 1,
    finalPrice: itemMatched.price
  };

  // 🔸 Detect variant (if it's lassi)
  if (itemMatched.name.toLowerCase().includes("lassi") && itemMatched.variants?.length) {
    const variantMap = {
      "full": ["full", "बड़ा", "बडी", "बड़ी", "बड़ा गिलास"],
      "half": ["half", "हाफ", "छोटा", "चोटी", "छोटी", "small"]
    };

    for (const variant of itemMatched.variants) {
      const synonyms = variantMap[variant.name.toLowerCase()] || [];
      if (synonyms.some(word => lower.includes(word))) {
        cartItem.variant = variant;
        cartItem.finalPrice = variant.price;
        break;
      }
    }
  }

  // 🔸 Detect modifiers (for lassi)
  if (itemMatched.name.toLowerCase().includes("lassi") && itemMatched.modifiers?.length) {
    for (const modifier of itemMatched.modifiers) {
      const modName = modifier.name.toLowerCase();
      if (lower.includes(modName)) {
        cartItem.modifiers.push(modifier);
        cartItem.finalPrice += modifier.price;
      }
    }
  }

  // 🛒 Add to cart and update
  appState.cart.push(cartItem);
  renderSection("order");

  alert(`✅ ${cartItem.name} ${cartItem.variant?.name || ""} ${
    cartItem.modifiers.map(m => m.name).join(", ")
  } ऑर्डर में जोड़ दिया गया`);
}
