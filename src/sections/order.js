// File: src/sections/order.js

import { appState } from '../state/appState.js';
import { genId } from '../utils/id.js';
import { showOrderConfigModal } from '../ui/ordermodal.js';
import { renderSection } from '../app/renderSection.js';
import { showCustomAlert, showCustomConfirm } from '../utils/dom.js';
import { initVoiceOrdering, speak } from '../utils/voiceOrdering.js';
import { cartItemBuilder } from '../utils/cartItemBuilder.js';
import { getNextReceiptNo } from './sales.js';

// 💡 Import the data service for cached reads
import { dataService } from '../services/dataService.js';

// 💡 Keep the original POSDatabase for 'put' operations, as it's a write operation
import { POSDatabase } from '../db/posDatabase.js';

// 🆕 Import the function from the new Custom Sales Calculator file
import { showCustomSalesCalculatorModal } from '../features/customSalesCalculator.js';

// Global reference for the main order element to pass to voice ordering
//let voiceOrderMainElement;


export function onAddToCart(newItem) {
  // Check if the item is a custom item (since custom items don't have variants or modifiers)
  const isCustomItem = newItem.isCustom;

  const existingIndex = appState.cart.findIndex(ci =>
    // For regular items, match by ID, variant, and modifiers
    !isCustomItem &&
    ci.id === newItem.id &&
    (ci.variant?.id === newItem.variant?.id || (!ci.variant && !newItem.variant)) &&
    JSON.stringify((ci.modifiers || []).map(m => m.id).sort()) ===
    JSON.stringify((newItem.modifiers || []).map(m => m.id).sort())
  );

  if (existingIndex !== -1) {
    const existing = appState.cart[existingIndex];
    const updatedItem = cartItemBuilder(
      existing, // original item (same ID)
      newItem.variant,
      newItem.modifiers,
      existing.qty + newItem.qty
    );
    appState.cart[existingIndex] = updatedItem;
    showCustomAlert("Updated quantity in cart");
  } else {
    // 💡 Add the new item, whether it's a regular menu item or a custom one
    appState.cart.push(newItem);
    showCustomAlert("Item added to cart");
  }
}


export async function renderOrderSection(main) {
  if (!main) return;

  // 💡 OPTIMIZATION: Use dataService to get all static menu data from the cache
  const menuItems = await dataService.get("menuItems");
  const categories = await dataService.get("categories");
  const allVariants = await dataService.get("variants");
  const allModifiers = await dataService.get("modifiers");

  for (const item of menuItems) {
    // 💡 Link cached variants/modifiers by filtering the cached arrays
    item.variants = allVariants.filter(v => v.itemId === item.id);
    item.modifiers = allModifiers.filter(m => m.itemId === item.id);
  }

  main.innerHTML = `
    <div class="order-section-header">
      <h2>Order</h2>
      <div class="voice-order-controls">
        <button id="startVoiceOrderBtn" class="btn btn-info btn-voice-order hidden">
          <i class="fas fa-microphone"></i> वॉयस ऑर्डर शुरू करें
        <div id="voiceOutput" class="voice-output-display"></div>
      </div>
    </div>

    <div id="orderItemsGrid" class="order-items-grid">
      ${categories.map((cat, index) => {
        const items = menuItems.filter(i => i.categoryId === cat.id);
        if (items.length === 0) return "";

        const activeClass = index === 0 ? 'active' : '';

        return `
          <div class="menu-category-group">
            <button class="category-toggle-btn ${activeClass}" data-cat-index="${index}">
              ${cat.name}
            </button>
            <div class="category-items" style="${index === 0 ? '' : 'display:none;'}">
              ${items.map(i => `
                <button class="orderItemBtn" data-id="${i.id}">
                  <span class="item-name">${i.name}${i.nameHindi ? ` / ${i.nameHindi}` : ''}</span>
                  <span class="item-price">₹${i.price}</span>
                </button>
              `).join("")}
            </div>
          </div>
        `;
      }).join("")}
    </div>

    <div id="orderConfigDiv"></div>
    <div id="cartDiv">
      <h4>Cart</h4>
      <div class="cart-table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Details</th>
              <th>Qty</th>
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
                  ${ci.modifiers?.length ? `Modifiers: ${ci.modifiers.map(m => m.name).join(", ")}` : ''}
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
      </button><!-- 🆕 Add the button directly to the HTML -->
      <button id="addCustomItemBtn" class="btn btn-primary">Add Custom Item</button>
      <button id="placeOrderBtn" ${appState.cart.length === 0 ? "disabled" : ""}>Place Order</button>
    </div>
    <div id="orderMsg" style="color: green"></div>
  `;
  // This ensures that the DOM is fully rendered and styles are applied before proceeding
  requestAnimationFrame(() => {
    const toggleButtons = main.querySelectorAll('.category-toggle-btn');
    toggleButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        toggleButtons.forEach(el => el.classList.remove('active'));
        btn.classList.add('active');

        const allItems = main.querySelectorAll('.category-items');
        allItems.forEach(el => el.style.display = 'none');

        const nextDiv = btn.nextElementSibling;
        nextDiv.style.display = 'block';
      });
    });

    // 🆕 Add the event listener for the new button
    document.getElementById('addCustomItemBtn').addEventListener('click', () => {
        showCustomSalesCalculatorModal((newItem) => {
            onAddToCart(newItem);
            renderSection('order'); // Re-render to show the added item
        });
    });

    // Pass cached data to voice ordering for faster matching
    initVoiceOrdering(main, handleVoiceOrderCallback, { menuItems, categories, allVariants, allModifiers });
    setupOrderEvents(menuItems, categories);
  });
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

    const grandTotal = appState.cart.reduce((sum, ci) => sum + ci.finalPrice, 0);
    const confirmed = await showCustomConfirm(`Do you want to place this order for ₹${grandTotal.toFixed(2)}?`, "Yes", "No");

    if (!confirmed) {
      showCustomAlert("Order placement cancelled.", "info");
      return;
    }

    const receiptNo = await getNextReceiptNo();
    await dataService.put("orders", {
      id: genId("order"),
      receiptNo,
      items: appState.cart.map(ci => ({
        id: ci.id || null,
        name: ci.name || null,
        hindiName: ci.hindiName || null,
        variant: ci.variant ? {
          id: ci.variant.id || null,
          name: ci.variant.name || null,
          hindiName: ci.variant.hindiName || null,
          price: ci.variant.price || 0
        } : null,
        modifiers: ci.modifiers ? ci.modifiers.map(m => ({
          id: m.id || null,
          name: m.name || null,
          hindiName: m.hindiName || null,
          price: m.price || 0
        })) : null,
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
      // 💡 Use cached data for faster lookups
      const allVariants = await dataService.get("variants");
      const allModifiers = await dataService.get("modifiers");
      // --- Enrich item with variant/modifier data if not already present ---
      const enrichedItem = {
        ...itemToAdd,
        variants: allVariants.filter(v => v.itemId === itemToAdd.id),
        modifiers: allModifiers.filter(m => m.itemId === itemToAdd.id)
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

      }
      renderSection("order");
      break;
    }


    case 'openModal': {
      const { itemToAdd } = payload;
      if (!itemToAdd) return;

      // 💡 Use cached data to find variants and modifiers
      const allVariants = await dataService.get("variants");
      const allModifiers = await dataService.get("modifiers");

      const enrichedItem = {
        ...itemToAdd,
        variants: allVariants.filter(v => v.itemId === itemToAdd.id),
        modifiers: allModifiers.filter(m => m.itemId === itemToAdd.id)
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

      }
      break;
    }

    case 'placeOrder': {
      if (!appState.cart.length) {
        showCustomAlert("Cart is empty");
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

      await dataService.put("orders", order);
      appState.cart = [];
      showCustomAlert("Order placed");
      break;
    }
  }
}
