// File: src/app/order.js

import { appState } from '../state/appState.js';
import { POSDatabase } from '../db/posDatabase.js';
import { genId } from '../utils/id.js';
import { showOrderConfigModal } from '../ui/ordermodal.js';
import { renderSection } from '../app/renderSection.js';

export async function renderOrderSection(main) {
  const menuItems = await POSDatabase.getAll("menuItems");
  const categories = await POSDatabase.getAll("categories");

  main.innerHTML = `
    <h2>Order</h2>
    <div id="orderItemsGrid" class="order-items-grid">
      ${menuItems.map(i => `
        <button class="orderItemBtn" data-id="${i.id}">
          <span class="item-name">${i.name}</span>
          <span class="item-price">₹${i.price}</span>
          <span class="item-category">${(categories.find(c => c.id === i.categoryId)?.name || "-")}</span>
        </button>
      `).join("")}
    </div>
    <div id="orderConfigDiv"></div>
    <div id="cartDiv">
      <h4>Cart</h4>
      <div class="cart-table-wrapper">
        <table>
          <thead>
            <tr><th>Item</th><th>Variant</th><th>Modifiers</th><th>Qty</th><th>Price</th><th>Total</th><th></th></tr>
          </thead>
          <tbody>
            ${appState.cart.map((ci, idx) => `
              <tr>
                <td>${ci.name}</td>
                <td>${ci.variant?.name || "-"}</td>
                <td>${ci.modifiers?.map(m => m.name).join(", ") || "-"}</td>
                <td>
                  <input type="number" class="cart-qty-input" min="1" value="${ci.qty}" data-idx="${idx}" style="width: 3em; text-align: center;">
                </td>
                <td>${ci.finalPrice}</td>
                <td>${ci.qty * ci.finalPrice}</td>
                <td><button class="removeCartBtn" data-idx="${idx}">Remove</button></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
      <div><strong>Grand Total: ₹${appState.cart.reduce((sum, ci) => sum + ci.qty * ci.finalPrice, 0)}</strong></div>
      <button id="placeOrderBtn" ${appState.cart.length === 0 ? "disabled" : ""}>Place Order</button>
    </div>
    <div id="orderMsg" style="color: green"></div>
  `;

  setupOrderEvents(menuItems, categories);
}

function setupOrderEvents(menuItems, categories) {
  document.querySelectorAll(".cart-qty-input").forEach(input => {
    input.onchange = () => {
      const idx = Number(input.dataset.idx);
      const val = Math.max(1, parseInt(input.value, 10) || 1);
      appState.cart[idx].qty = val;
      renderSection("order");
    };
  });

  document.querySelectorAll(".orderItemBtn").forEach(btn => {
    btn.onclick = (e) => {
      const item = menuItems.find(i => i.id === btn.dataset.id);
      if (!item) return;

      showOrderConfigModal(item, menuItems, categories, (cartItem) => {
        appState.cart.push(cartItem);
        renderSection("order");
      }, e);
    };
  });

  document.querySelectorAll(".removeCartBtn").forEach(btn => {
    btn.onclick = () => {
      const idx = Number(btn.dataset.idx);
      appState.cart.splice(idx, 1);
      renderSection("order");
    };
  });

  document.getElementById("placeOrderBtn").onclick = async () => {
    if (!appState.cart.length) return;
    const receiptNo = await getNextReceiptNo();
    await POSDatabase.put("orders", {
      id: genId("order"),
      receiptNo,
      items: appState.cart.map(ci => ({
        id: ci.id,
        name: ci.name,
        variant: ci.variant,
        modifiers: ci.modifiers,
        price: ci.finalPrice,
        qty: ci.qty
      })),
      total: appState.cart.reduce((sum, ci) => sum + ci.qty * ci.finalPrice, 0),
      ts: Date.now(),
      user: appState.currentUser.username,
    });
    appState.cart = [];
    document.getElementById("orderMsg").textContent = "Order placed!";
    renderSection("order");
  };
}

async function getNextReceiptNo() {
  const allOrders = await POSDatabase.getAll("orders");
  const max = allOrders.reduce((max, o) => {
    const no = parseInt(o.receiptNo?.replace(/\D/g, "") || "0");
    return Math.max(max, no);
  }, 0);
  return "R" + String(max + 1).padStart(4, "0");
}
