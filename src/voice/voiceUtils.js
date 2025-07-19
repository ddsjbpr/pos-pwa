import { POSDatabase } from '../db/posDatabase.js';

// Get menu item with variant & modifiers
export async function findMenuItemDetails(transcript) {
  const menuItems = await POSDatabase.getAll("menuItems");
  const lower = transcript.toLowerCase();

  // Step 1: Match item name
  const match = menuItems.find(item =>
    lower.includes(item.name.toLowerCase()) ||
    lower.includes(item.name.replace(/\s/g, '').toLowerCase()) // handle "vada pav" as "vadapav"
  );
  if (!match) return null;

  let variant = null;
  if (match.variants?.length) {
    variant = match.variants.find(v =>
      lower.includes(v.name.toLowerCase()) ||
      (v.name.toLowerCase() === "full" && (lower.includes("बड़ा") || lower.includes("full"))) ||
      (v.name.toLowerCase() === "half" && (lower.includes("छोटा") || lower.includes("half") || lower.includes("small")))
    );
  }

  const modifiers = [];
  if (match.modifiers?.length) {
    for (const mod of match.modifiers) {
      if (lower.includes(mod.name.toLowerCase())) {
        modifiers.push(mod);
      }
    }
  }

  // Base + variant + modifiers
  const base = Number(match.price || 0);
  const variantPrice = Number(variant?.price || 0);
  const modPrice = modifiers.reduce((sum, m) => sum + Number(m.price || 0), 0);
  const finalPrice = base + variantPrice + modPrice;

  return {
    id: match.id,
    name: match.name,
    variant,
    modifiers,
    finalPrice,
  };
}
