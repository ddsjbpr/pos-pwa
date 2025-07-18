import { openOrderModal, closeOrderModal } from './modals.js';

export function showOrderConfigModal(item, menuItems, categories, onAddToCart, event) {
  const modal = document.getElementById("orderModal");

  modal.innerHTML = `
    <div class="modal-content">
      <form id="orderConfigForm" class="order-config-form">
        <div class="item-details-header">
            <strong>${item.name}</strong>
            <span class="item-base-price">Base Price: ₹${item.price}</span>
        </div>
        
        ${item.variants?.length ? `
          <label>Variant:</label>
          <div class="order-variants-group">
            ${item.variants.map((v, i) => `
              <div class="order-variant-row">
                <input type="checkbox" name="orderSingleVariant" value="${i}" id="variant${i}">
                <label for="variant${i}">${v.name} (₹${v.price})</label>
              </div>
            `).join("")}
          </div>
        ` : ""}

        ${item.modifiers?.length ? `
          <div id="modifiersSection" class="${item.variants?.length ? 'hidden' : ''}">
            <label>Modifiers:</label>
            <div class="order-modifiers-group">
              ${item.modifiers.map((m, i) => `
                <div class="order-modifier-row">
                  <input type="checkbox" name="orderModifiers" value="${i}" id="mod${i}">
                  <label for="mod${i}">${m.name} ${m.price ? `(+₹${m.price})` : ""}</label>
                </div>
              `).join("")}
            </div>
          </div>
        ` : ""}

        <div class="order-config-row">
          <label for="orderQtyInput">Quantity:</label>
          <input id="orderQtyInput" type="number" min="1" max="99" value="1">
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

  // --- NEW/AMENDED JAVASCRIPT LOGIC FOR VARIANT/MODIFIER INTERACTION ---
  const variantCheckboxes = modal.querySelectorAll('input[name="orderSingleVariant"]'); // Select by the new name
  const modifiersSection = modal.querySelector("#modifiersSection");
  const modifierCheckboxes = modal.querySelectorAll('input[name="orderModifiers"]'); // Get all modifier checkboxes
  const addToCartButton = modal.querySelector("#orderConfigForm .btn-primary[type='submit']");

  // Function to enable/disable all modifier checkboxes
  function setModifiersEnabled(enabled) {
    if (modifierCheckboxes.length > 0) {
      modifierCheckboxes.forEach(checkbox => {
        checkbox.disabled = !enabled;
        if (!enabled) checkbox.checked = false; // Uncheck if disabling
      });
    }
  }

  // Initial state: Hide modifiers section and disable Add to Cart button if variants exist
  if (item.variants?.length > 0) {
    if (modifiersSection) modifiersSection.classList.add('hidden');
    setModifiersEnabled(false); // Ensure modifier checkboxes are disabled
    if (addToCartButton) addToCartButton.disabled = true;
  } else {
    // If no variants, show modifiers and enable Add to Cart by default
    if (modifiersSection) modifiersSection.classList.remove('hidden');
    setModifiersEnabled(true); // Ensure modifier checkboxes are enabled
    if (addToCartButton) addToCartButton.disabled = false;
  }

  // Event listener for variant checkboxes (to enforce single selection and enable modifiers)
  if (variantCheckboxes.length > 0) {
    variantCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', function() {
        if (this.checked) {
          // Deselect all other variant checkboxes
          variantCheckboxes.forEach(otherCheckbox => {
            if (otherCheckbox !== this) {
              otherCheckbox.checked = false;
            }
          });

          // Enable modifiers and Add to Cart
          if (modifiersSection) modifiersSection.classList.remove('hidden');
          setModifiersEnabled(true);
          if (addToCartButton) addToCartButton.disabled = false;

        } else {
          // If the currently checked checkbox is unchecked, then no variant is selected
          // This happens if the user clicks the only checked checkbox to uncheck it.
          if (modifiersSection) modifiersSection.classList.add('hidden');
          setModifiersEnabled(false);
          if (addToCartButton) addToCartButton.disabled = true;
        }
      });
    });
  }
  // --- END NEW/AMENDED JAVASCRIPT LOGIC ---


  modal.querySelector("#orderConfigForm").onsubmit = (e) => {
    e.preventDefault();

    let variant = null, variantPrice = 0;
    // VARIANT SELECTION (SINGLE FROM CHECKBOXES)
    if (item.variants?.length) {
      const selectedVariantCheckbox = modal.querySelector('input[name="orderSingleVariant"]:checked');
      if (!selectedVariantCheckbox) {
        alert("Please select a variant."); // User might bypass button disable with dev tools
        return;
      }
      variant = item.variants[Number(selectedVariantCheckbox.value)];
      variantPrice = variant.price || 0;
    }

    let modifiers = [], modifiersTotal = 0;
    // MODIFIER SELECTION (MULTIPLE FROM CHECKBOXES)
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
    const base = item.price || 0;
    const finalPrice = base + variantPrice + modifiersTotal;

    onAddToCart({
      id: item.id,
      name: item.name,
      variant: variant, // Now a single selected variant object or null
      modifiers: modifiers, // Array of selected modifier objects
      qty,
      finalPrice
    });

    closeOrderModal();
  };

  modal.querySelector("#orderCancelBtn").onclick = closeOrderModal;
}