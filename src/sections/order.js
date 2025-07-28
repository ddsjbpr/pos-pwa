// File: src/sections/order.js

import { appState } from '../state/appState.js';
import { POSDatabase } from '../db/posDatabase.js';
import { genId } from '../utils/id.js';
import { showOrderConfigModal } from '../ui/ordermodal.js';
import { renderSection } from '../app/renderSection.js';
import { showCustomAlert, showCustomConfirm } from '../utils/dom.js'; // Import custom alerts/confirms
import { initVoiceOrdering, speak } from '../utils/voiceOrdering.js'; // Import voice ordering functions
import { cartItemBuilder } from '../utils/cartItemBuilder.js';
import{getNextReceiptNo} from './sales.js'


// TEMPORARY: Expose POSDatabase to global scope for console debugging
window.POSDatabase = POSDatabase;

// Global reference for the main order element to pass to voice ordering
let voiceOrderMainElement;


export function onAddToCart(newItem) {
  const { id, variant, modifiers, qty } = newItem;

  const existingIndex = appState.cart.findIndex(ci =>
    ci.id === id &&
    (ci.variant?.id === variant?.id || (!ci.variant && !variant)) &&
    JSON.stringify((ci.modifiers || []).map(m => m.id).sort()) ===
    JSON.stringify((modifiers || []).map(m => m.id).sort())
  );

  if (existingIndex !== -1) {
    const existing = appState.cart[existingIndex];
    const updatedItem = cartItemBuilder(
      existing, // original item (same ID)
      variant,
      modifiers,
      existing.qty + qty
    );
    appState.cart[existingIndex] = updatedItem;
    showCustomAlert("Updated quantity in cart");
    speak("आइटम अपडेट किया गया");
  } else {
    appState.cart.push(newItem);
    showCustomAlert("Item added to cart");
    speak("आइटम जोड़ा गया");
  }
}



export async function renderOrderSection(main) {

    
    if (!main) return;

    // Store the main element for voice ordering (if needed globally for init)
    voiceOrderMainElement = main;

    const menuItems = await POSDatabase.getAll("menuItems");
    const categories = await POSDatabase.getAll("categories");
    // NEW: Load all variants and modifiers, and attach them to their menuItems
    const allVariants = await POSDatabase.getAll("variants");
    const allModifiers = await POSDatabase.getAll("modifiers");
    
    for (const item of menuItems) {
        item.variants = allVariants.filter(v => v.itemId === item.id);
        item.modifiers = allModifiers.filter(m => m.itemId === item.id);
    }
    main.innerHTML = `
        <div class="order-section-header">
            <h2>Order</h2>
            <div class="voice-order-controls">
                <button id="startVoiceOrderBtn" class="btn btn-info btn-voice-order">
                    <i class="fas fa-microphone"></i> वॉयस ऑर्डर शुरू करें
                </button>
                <div id="voiceOutput" class="voice-output-display"></div>
            </div>
        </div>

        <div id="orderItemsGrid" class="order-items-grid">
    ${menuItems.map(i => `
        <button class="orderItemBtn" data-id="${i.id}">
            <span class="item-name">${i.name}${i.nameHindi ? ` / ${i.nameHindi}` : ''}</span>
            <span class="item-price">₹${i.price}</span>
        </button>
    `).join("")}
</div>

        <div id="orderConfigDiv"></div>
        <div id="cartDiv">
            <h4>Cart</h4>
            <div class="cart-table-wrapper">
                <table>
                    <thead>
                    <tr>
                    <th>Item</th>
                    <th>Details</th>  <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                    <th></th>
                </tr>
                    </thead>
                    <tbody>
                        ${appState.cart.map((ci, idx) => `
                            <tr>
                                <td>${ci.name}</td>
                                <td>
    ${ci.variant?.name ? `Variant: ${ci.variant.name}<br>` : ''}
    ${ci.modifiers && ci.modifiers.length > 0 ? `Modifiers: ${ci.modifiers.map(m => m.name).join(", ")}` : ''}
</td>
<td>
                                    <input type="number" class="cart-qty-input" min="1" value="${ci.qty}" data-idx="${idx}" style="width: 3em; text-align: center;">
                                </td>
                                <td>₹${(ci.finalPrice / ci.qty).toFixed(2)}</td>
<td>₹${ci.finalPrice.toFixed(2)}</td>
                                <td><button class="removeCartBtn" data-idx="${idx}">Remove</button></td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
            <div><strong>Grand Total: ₹${appState.cart.reduce((sum, ci) => sum + ci.finalPrice, 0).toFixed(2)}</strong></div>
            <button id="placeOrderBtn" ${appState.cart.length === 0 ? "disabled" : ""}>Place Order</button>
        </div>
        <div id="orderMsg" style="color: green"></div>
    `;

    // Initialize Voice Ordering after the DOM is ready
    initVoiceOrdering(main, handleVoiceOrderCallback);

    setupOrderEvents(menuItems, categories);
}

export function setupOrderEvents(menuItems, categories) {
    document.querySelectorAll(".cart-qty-input").forEach(input => {
        input.onchange = () => {
            const idx = Number(input.dataset.idx);
            const val = Math.max(1, parseInt(input.value, 10) || 1);
            const old = appState.cart[idx];
appState.cart[idx] = cartItemBuilder(old, old.variant, old.modifiers, val);
            renderSection("order");
        };
    });

    document.querySelectorAll(".orderItemBtn").forEach(btn => {
        btn.onclick = (e) => {
            const item = menuItems.find(i => i.id === btn.dataset.id);
            if (!item) return;

            showOrderConfigModal(item, menuItems, categories, (cartItem) => {
              onAddToCart(cartItem);
                renderSection("order");
            }, e);
        };
    });

    document.querySelectorAll(".removeCartBtn").forEach(btn => {
        btn.onclick = async () => {
            const idx = Number(btn.dataset.idx);
            const confirmed = await showCustomConfirm("Are you sure you want to remove this item?", "Yes", "No");
            if (confirmed) {
                appState.cart.splice(idx, 1);
                renderSection("order");
                showCustomAlert("Item removed from cart.", "success");
            }
        };
    });

    document.getElementById("placeOrderBtn").onclick = async () => {
        if (!appState.cart.length) {
            showCustomAlert("Your cart is empty. Please add items before placing an order.", "warning");
            return;
        }

        const grandTotal = appState.cart.reduce((sum, ci) => sum + ci.qty * ci.finalPrice, 0);
        const confirmed = await showCustomConfirm(`Do you want to place this order for ₹${grandTotal.toFixed(2)}?`, "Yes", "No");

        if (!confirmed) {
            showCustomAlert("Order placement cancelled.", "info");
            return;
        }

        const receiptNo = await getNextReceiptNo();
        await POSDatabase.put("orders", {
            id: genId("order"),
            receiptNo,
            items: appState.cart.map(ci => ({
              id: ci.id,
              name: ci.name,
              hindiName: ci.hindiName,
              variant: ci.variant,
              modifiers: ci.modifiers,
              price: ci.finalPrice / ci.qty,
              qty: ci.qty,
              finalPrice: ci.finalPrice
          })),
          
            total: grandTotal,
            ts: Date.now(),
            user: appState.currentUser.username,
        });
        appState.cart = [];
        document.getElementById("orderMsg").textContent = "Order placed!";
        showCustomAlert("Order placed successfully!", "success");
        renderSection("order"); // Re-render to clear cart and update UI
    };
}

// Callback handler for voice ordering module
// Normalize string (for case-insensitive and diacritic-insensitive matching)
const normalize = str => (str || '').toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

// Voice ordering callback handler
export async function handleVoiceOrderCallback(type, payload) {
  switch (type) {
    case 'addItem': {
      const { itemToAdd, quantity, variantName, modifierNames } = payload;
    
      // --- Enrich item with variant/modifier data if not already present ---
      const enrichedItem = {
        ...itemToAdd,
        variants: itemToAdd.variants || await POSDatabase.getByIndex("variants", "itemId", itemToAdd.id),
        modifiers: itemToAdd.modifiers || await POSDatabase.getByIndex("modifiers", "itemId", itemToAdd.id)
      };
    
      // --- Match variant by name or Hindi name ---
      const selectedVariant = variantName
        ? enrichedItem.variants?.find(v =>
            normalize(v.name) === normalize(variantName) ||
            normalize(v.hindiName) === normalize(variantName)
          )
        : null;
    
      // --- Match modifiers by name or Hindi name ---
      const selectedModifiers = [];
      if (Array.isArray(modifierNames)) {
        modifierNames.forEach(modName => {
          const match = enrichedItem.modifiers?.find(m =>
            normalize(m.name).includes(normalize(modName)) ||
            normalize(m.hindiName).includes(normalize(modName))
          );
          if (match) selectedModifiers.push(match);
        });
      }
    
      // --- Create a unique key for comparing items in cart ---
      const getCartKey = (itemId, variant, modifiers) => {
        const variantId = variant?.id || "";
        const modifierIds = (modifiers || []).map(m => m.id).sort().join(",");
        return `${itemId}::${variantId}::${modifierIds}`;
      };
    
      const incomingKey = getCartKey(enrichedItem.id, selectedVariant, selectedModifiers);
    
      // --- Try to find existing matching item in cart ---
      const existingCartItemIndex = appState.cart.findIndex(ci =>
        getCartKey(ci.id, ci.variant, ci.modifiers) === incomingKey
      );
    
      if (existingCartItemIndex !== -1) {
        // ✅ Update quantity and final price
        const existing = appState.cart[existingCartItemIndex];
        const updatedQty = existing.qty + quantity;
    
        appState.cart[existingCartItemIndex] = cartItemBuilder(
          enrichedItem,
          selectedVariant,
          selectedModifiers,
          updatedQty
        );
    
        showCustomAlert("Updated quantity in cart");
        speak("आइटम अपडेट किया गया");
      } else {
        // ➕ Add new item
        const cartItem = cartItemBuilder(
          enrichedItem,
          selectedVariant,
          selectedModifiers,
          quantity
        );
    
        appState.cart.push(cartItem);
        showCustomAlert("Item added to cart");
        speak("आइटम जोड़ा गया");
      }
      renderSection("order"); 
      break;
    }
    

    case 'openModal': {
      const { itemToAdd } = payload;
      if (!itemToAdd) return;

      const enrichedItem = {
        ...itemToAdd,
        variants: itemToAdd.variants || await POSDatabase.getByItemId("variants", itemToAdd.id),
        modifiers: itemToAdd.modifiers || await POSDatabase.getByItemId("modifiers", itemToAdd.id)
      };

      showOrderConfigModal(enrichedItem);
      break;
    }

    case 'removeItem': {
      const { itemName } = payload;
      const normalizedName = normalize(itemName);
      const matchIndex = appState.cart.findIndex(ci =>
        normalize(ci.name) === normalizedName || normalize(ci.hindiName) === normalizedName
      );

      if (matchIndex !== -1) {
        appState.cart.splice(matchIndex, 1);
        showCustomAlert("Item removed");
        speak("आइटम हटाया गया");
      } else {
        speak("यह आइटम कार्ट में नहीं मिला");
      }
      break;
    }

    case 'placeOrder': {
      if (!appState.cart.length) {
        showCustomAlert("Cart is empty");
        speak("कार्ट खाली है");
        return;
      }

      const order = {
        id: genId(),
        items: appState.cart.map(ci => ({
          id: ci.id,
          name: ci.name,
          hindiName: ci.hindiName,
          price: ci.finalPrice / ci.qty,
          qty: ci.qty,
          finalPrice: ci.finalPrice,

          variant: ci.variant ? {
            id: ci.variant.id,
            name: ci.variant.name,
            hindiName: ci.variant.hindiName,
            price: ci.variant.price
          } : null,
          modifiers: (ci.modifiers || []).map(m => ({
            id: m.id,
            name: m.name,
            hindiName: m.hindiName,
            price: m.price
          }))
        })),
        createdAt: new Date().toISOString()
      };

      await POSDatabase.add("orders", order);
      appState.cart = [];
      showCustomAlert("Order placed");
      speak("ऑर्डर प्लेस किया गया");
      break;
    }
  }
}


