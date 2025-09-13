// File: src/ui/ordermodal.js


import { openOrderModal, closeOrderModal } from './modals.js';
import { cartItemBuilder } from '../utils/cartItemBuilder.js';
import {onAddToCart} from '../sections/order.js'

// Helper function to generate a random pastel-like color for better UI
function getRandomPastelColor() {
  const hue = Math.floor(Math.random() * 360);
  const saturation = Math.floor(Math.random() * 25) + 75; // 75-100% saturation
  const lightness = Math.floor(Math.random() * 15) + 80; // 80-95% lightness
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// Or a simpler random hex color function if preferred:
// function getRandomHexColor() {
//     const letters = '0123456789ABCDEF';
//     let color = '#';
//     for (let i = 0; i < 6; i++) {
//         color += letters[Math.floor(Math.random() * 16)];
//     }
//     return color;
// }

export function showOrderConfigModal(item, menuItems, categories, onAddToCart, event) {
  const modal = document.getElementById("orderModal");

  modal.innerHTML = `
  <div class="modal-content">
    <form id="orderConfigForm" class="order-config-form">
      <div class="item-details-header">
        <strong>${item.name}</strong>
        ${item.nameHindi ? `<div class="item-hindi-name">${item.nameHindi}</div>` : ""}
        <span class="item-base-price">Base Price: ₹${item.price}</span>
      </div>

      ${item.variants?.length ? `
        <label>Variant:</label>
        <div class="order-variants-group">
          ${item.variants.map((v, i) => `
            <div class="order-variant-row" style="background-color: ${getRandomPastelColor()};">
              <input type="radio" name="orderSingleVariant" value="${i}" id="variant${i}" ${i === 0 ? "checked" : ""}>
              <label for="variant${i}">
                ${v.name}${v.nameHindi ? ` (${v.nameHindi})` : ""} (₹${v.price})
              </label>
            </div>
          `).join("")}
        </div>
      ` : ""}

      ${item.modifiers?.length ? `
        <div id="modifiersSection">
          <label>Modifiers:</label>
          <div class="order-modifiers-group">
            ${item.modifiers.map((m, i) => `
              <div class="order-modifier-row" style="background-color: ${getRandomPastelColor()};">
                <input type="checkbox" name="orderModifiers" value="${i}" id="mod${i}">
                <label for="mod${i}">
                  ${m.name}${m.nameHindi ? ` (${m.nameHindi})` : ""} ${m.price ? `(+₹${m.price})` : ""}
                </label>
              </div>
            `).join("")}
          </div>
        </div>
      ` : ""}

      <div class="order-config-row">
        <label for="orderQtyInput">Quantity:</label>
        <input id="orderQtyInput" type="number" min="1" max="99" value="1" onfocus="this.select()" inputmode="numeric">
      </div>

      <div class="order-config-actions">
        <button type="submit" class="btn btn-primary">Add to Cart</button>
        <button type="button" id="orderCancelBtn" class="btn btn-secondary">Cancel</button>
      </div>
    </form>
  </div>
`;


  openOrderModal();

  modal.onclick = (e) => {
    if (e.target === modal) closeOrderModal();
  };

  // Same logic preserved for interactivity
  const variantRadios = modal.querySelectorAll('input[name="orderSingleVariant"]');
  const modifiersSection = modal.querySelector("#modifiersSection");
  const modifierCheckboxes = modal.querySelectorAll('input[name="orderModifiers"]');
  const addToCartButton = modal.querySelector("#orderConfigForm .btn-primary[type='submit']");

  function setModifiersEnabled(enabled) {
    modifierCheckboxes.forEach(checkbox => {
      checkbox.disabled = !enabled;
      if (!enabled) checkbox.checked = false;
    });
  }

  const hasVariants = item.variants?.length > 0;
  const hasModifiers = item.modifiers?.length > 0;

  if (hasVariants) {
    const selectedVariant = modal.querySelector('input[name="orderSingleVariant"]:checked');
    if (selectedVariant) {
      if (modifiersSection) modifiersSection.classList.remove('hidden');
      setModifiersEnabled(true);
      if (addToCartButton) addToCartButton.disabled = false;
    } else {
      if (modifiersSection) modifiersSection.classList.remove('hidden');
      setModifiersEnabled(false);
      if (addToCartButton) addToCartButton.disabled = true;
    }
  } else {
    if (modifiersSection) modifiersSection.classList.remove('hidden');
    setModifiersEnabled(true);
    if (addToCartButton) addToCartButton.disabled = false;
  }

  variantRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.checked) {
        if (modifiersSection) modifiersSection.classList.remove('hidden');
        setModifiersEnabled(true);
        if (addToCartButton) addToCartButton.disabled = false;
      }
    });
  });

  modal.querySelector("#orderConfigForm").onsubmit = (e) => {
    e.preventDefault();
  
    let variant = null, variantPrice = 0;
    if (item.variants?.length) {
      const selectedVariantCheckbox = modal.querySelector('input[name="orderSingleVariant"]:checked');
      if (!selectedVariantCheckbox) {
        alert("Please select a variant.");
        return;
      }
      variant = item.variants[Number(selectedVariantCheckbox.value)];
      variantPrice = variant.price || 0;
    }
  
    let modifiers = [], modifiersTotal = 0;
    if (item.modifiers?.length) {
      modal.querySelectorAll('input[name="orderModifiers"]:checked').forEach(chk => {
        const m = item.modifiers[Number(chk.value)];
        if (m) {
          modifiers.push(m);
          modifiersTotal += m.price || 0;
        }
      });
    }
  
    const qty = Math.max(1, parseInt(modal.querySelector("#orderQtyInput").value, 10) || 1);
  
    // ✅ Use builder
    const cartItem = cartItemBuilder(item, variant, modifiers, qty);
    onAddToCart(cartItem);
  
    closeOrderModal();
  };
  

  modal.querySelector("#orderCancelBtn").onclick = closeOrderModal;
}
