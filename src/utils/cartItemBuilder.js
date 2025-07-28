// src/utils/cartItemBuilder.js
export function cartItemBuilder(item, variant = null, modifiers = [], qty = 1) {
  const basePrice = item.price || 0;
  const variantPrice = variant?.price || 0;
  const modifiersPrice = Array.isArray(modifiers)
    ? modifiers.reduce((sum, m) => sum + (m.price || 0), 0)
    : 0;

  const finalPrice = (basePrice + variantPrice + modifiersPrice) * qty;

  return {
    id: item.id,
    name: item.name,
    hindiName: item.nameHindi || "",
    basePrice,
    qty,
    variant,
    modifiers,
    finalPrice
  };
}
