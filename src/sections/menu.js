// File: src/sections/menu.js

import { POSDatabase } from '../db/posDatabase.js';
import { showError } from '../utils/dom.js';
import { genId } from '../utils/id.js';
import { showCategoryManagementModal } from '../ui/categoryModal.js'; // Import the modal function

export async function renderMenuManagement(main, editingItemId = null) {
  if (!main) return;

  const categories = await POSDatabase.getAll("categories");
  const menuItems = await POSDatabase.getAll("menuItems");

  let html = `
    <h3>Menu Management</h3>

    <button id="manageCategoriesBtn" class="btn btn-primary" style="margin-bottom:1em;">Manage Categories</button>
<button id="openItemModal" class="btn btn-primary" style="margin-bottom:1em;">Add Item</button>
<div id="itemAddError" class="hidden" style="color:red"></div>

    <div id="itemFormModal" class="modal">
      <div class="modal-content">
        <h3>${editingItemId ? 'Edit Item' : 'Add New Item'}</h3>
        <form id="itemAddForm" class="order-config-form">
          <input id="itemAddName" placeholder="Item name" required>
          <input id="itemAddPrice" type="number" step="0.01" placeholder="Base Price" required>
          <select id="itemAddCategory" required>
            <option value="">Select Category</option>
            ${categories.map(c => `<option value="${c.id}">${c.name}</option>`).join("")}
          </select>
          <input id="itemAddVariants" placeholder="Variants (comma separated, e.g. Small/50,Large/80)">
          <input id="itemAddModifiers" placeholder="Modifiers (comma separated, e.g. Extra Cheese/10,No Ice/0)">

          <div class="order-config-actions">
            <button type="submit" class="btn-primary">${editingItemId ? 'Update' : 'Save'} Item</button>
            <button type="button" id="closeItemModal" class="btn btn-secondary">Cancel</button>
          </div>
          <input type="hidden" id="editingItemId">
        </form>
      </div>
    </div>

    <div class="menu-items-table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Base Price</th>
            <th>Variants</th>
            <th>Modifiers</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${menuItems.map(i => `
            <tr>
              <td>${i.name}</td>
              <td>${(categories.find(c => c.id === i.categoryId)||{}).name||"-"}</td>
              <td>${i.price || "-"}</td>
              <td>${i.variants?.map(v => `${v.name} (${v.price})`).join(", ") || "-"}</td>
              <td>${i.modifiers?.map(m => `${m.name} (${m.price})`).join(", ") || "-"}</td>
              <td>
                <button class="editItemBtn" data-id="${i.id}" style="margin-right: 5px;">Edit</button>
                <button class="deleteItemBtn" data-id="${i.id}">Delete</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;

  main.innerHTML = html;

    // Attach event listener for the new "Manage Categories" button
    document.getElementById('manageCategoriesBtn').onclick = () => {
        showCategoryManagementModal(main); // Pass `main` so the modal can trigger a re-render of `menu.js`
    };

  // Modal setup (existing item modal setup)
  const itemModal = document.getElementById('itemFormModal');
  const openModalBtn = document.getElementById('openItemModal');
  const closeModalBtn = document.getElementById('closeItemModal');

  openModalBtn.onclick = () => {
    document.getElementById('editingItemId').value = '';
    document.getElementById('itemAddForm').reset();
    itemModal.style.display = 'flex';
    document.body.classList.add('modal-open');
  };

  closeModalBtn.onclick = () => {
    itemModal.style.display = 'none';
    document.body.classList.remove('modal-open');
  };

  itemModal.onclick = (e) => {
    if (e.target === itemModal) {
      itemModal.style.display = 'none';
      document.body.classList.remove('modal-open');
    }
  };

  // Prefill if editing
  if (editingItemId) {
    const item = menuItems.find(i => i.id === editingItemId);
    if (item) {
      document.getElementById("itemAddName").value = item.name;
      document.getElementById("itemAddPrice").value = item.price;
      document.getElementById("itemAddCategory").value = item.categoryId;
      document.getElementById("itemAddVariants").value = item.variants?.map(v => `${v.name}/${v.price}`).join(", ") || "";
      document.getElementById("itemAddModifiers").value = item.modifiers?.map(m => `${m.name}/${m.price}`).join(", ") || "";
      document.getElementById("editingItemId").value = item.id;
      itemModal.style.display = 'flex';
      document.body.classList.add('modal-open');
    }
  }

    // Removed the inline catAddForm submission handler from here,
    // as category addition will now happen in the categoryModal.js

  document.getElementById("itemAddForm").onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById("itemAddName").value.trim();
    const price = Number(document.getElementById("itemAddPrice").value);
    const categoryId = document.getElementById("itemAddCategory").value;
    const variantsStr = document.getElementById("itemAddVariants").value.trim();
    const modifiersStr = document.getElementById("itemAddModifiers").value.trim();
    const editingId = document.getElementById("editingItemId").value;

    if (!name || !price || !categoryId) {
      showError("itemAddError", "Missing fields");
      return;
    }

    let variants = variantsStr
      ? variantsStr.split(",").map(v => {
          const [name, price] = v.split("/");
          return { name: name?.trim(), price: Number(price) };
        }).filter(v => v.name && !isNaN(v.price))
      : [];

    let modifiers = modifiersStr
      ? modifiersStr.split(",").map(m => {
          const [name, price] = m.split("/");
          return { name: name?.trim(), price: Number(price) };
        }).filter(m => m.name && !isNaN(m.price))
      : [];

    const itemData = { id: editingId || genId("item"), name, price, categoryId, variants, modifiers };
    await POSDatabase.put("menuItems", itemData);

    itemModal.style.display = 'none';
    document.body.classList.remove('modal-open');
    renderMenuManagement(main);
  };

  document.querySelectorAll(".editItemBtn").forEach(btn => {
    btn.onclick = () => renderMenuManagement(main, btn.dataset.id);
  });

  document.querySelectorAll(".deleteItemBtn").forEach(btn => {
    btn.onclick = async () => {
      if (confirm("Delete this item?")) {
        await POSDatabase.delete("menuItems", btn.dataset.id);
        renderMenuManagement(main);
      }
    };
  });
}