// File: src/sections/menu.js

import { POSDatabase } from '../db/posDatabase.js';
import { showError } from '../utils/dom.js';
import { genId } from '../utils/id.js';
import { showCategoryManagementModal } from '../ui/categoryModal.js';

export async function renderMenuManagement(main, editingItemId = null) {
  if (!main) return;

  const categories = await POSDatabase.getAll("categories");
  const menuItems = await POSDatabase.getAll("menuItems");

  for (const item of menuItems) {
    item.variants = await POSDatabase.getByIndex("variants", "itemId", item.id);
    item.modifiers = await POSDatabase.getByIndex("modifiers", "itemId", item.id);
  }

  let html = `
    <h3>Menu Management</h3>
    <button id="manageCategoriesBtn" class="btn btn-primary" style="margin-bottom:1em;">Manage Categories</button>
    <button id="openItemModal" class="btn btn-primary" style="margin-bottom:1em;">Add Item</button>
    <div id="itemAddError" class="hidden" style="color:red"></div>

    <div id="itemFormModal" class="modal">
      <div class="modal-content">
        <h3>${editingItemId ? 'Edit Item' : 'Add New Item'}</h3>
        <form id="itemAddForm" class="order-config-form">
          <input id="itemAddName" placeholder="Item name (English)" required>
          <input id="itemAddNameHindi" placeholder="Item name (Hindi)">
          <input type="checkbox" id="toggleHindiTyping"> <label for="toggleHindiTyping">Enable Hindi Typing</label>
          <input id="itemAddPrice" type="number" step="0.01" placeholder="Base Price" required>
          <select id="itemAddCategory" required>
            <option value="">Select Category</option>
            ${categories.map(c => `<option value="${c.id}">${c.name}</option>`).join("")}
          </select>
          <input id="itemAddVariants" placeholder="Variants (comma separated, e.g. Small/50)">
          <textarea id="itemAddVariantKeywords" placeholder="Variant Keywords (English, comma-separated keywords, blocks for each variant separated by '|', e.g. small,tiny | large,big)"></textarea>
          <input id="itemAddVariantsHindi" placeholder="Variants Hindi (e.g. छोटा/50)">
          <textarea id="itemAddVariantKeywordsHindi" placeholder="Variant Keywords (Hindi, comma-separated keywords, blocks for each variant separated by '|', e.g. छोटा,नन्हा | बड़ा,विशाल)"></textarea>
          <input id="itemAddModifiers" placeholder="Modifiers (comma separated, e.g. Extra Cheese/10)">
          <textarea id="itemAddModifierKeywords" placeholder="Modifier Keywords (English, comma-separated keywords, blocks for each modifier separated by '|', e.g. cheese,extra | mayo,sauce)"></textarea>
          <input id="itemAddModifiersHindi" placeholder="Modifiers Hindi (e.g. अधिक पनीर/10)">
          <textarea id="itemAddModifierKeywordsHindi" placeholder="Modifier Keywords (Hindi, comma-separated keywords, blocks for each modifier separated by '|', e.g. पनीर,अधिक | मेयो,चटनी)"></textarea>
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
      <td>${i.name}${i.nameHindi ? ` / ${i.nameHindi}` : ""}</td>
      <td>${(categories.find(c => c.id === i.categoryId) || {}).name || "-"}</td>
      <td>${i.price !== undefined && i.price !== null ? i.price : "-"}</td>
      <td>${i.variants?.map((v) => `${v.name} (${v.price})${v.nameHindi ? ` / ${v.nameHindi}` : ""}`).join(", ") || "-"}</td>
      <td>${i.modifiers?.map((m) => `${m.name} (${m.price})${m.nameHindi ? ` / ${m.nameHindi}` : ""}`).join(", ") || "-"}</td>
      <td>
        <div class="action-buttons">
          <button class="editItemBtn" data-id="${i.id}" style="margin-right: 5px;">Edit</button>
          <button class="deleteItemBtn" data-id="${i.id}">Delete</button>
        </div>
      </td>
    </tr>
   `).join("")}
    </tbody>
      </table>
    </div>
    `;

    main.innerHTML = html;
    let editingItem = null;

    if (editingItemId) {
    editingItem = menuItems.find(item => item.id === editingItemId);
    if (editingItem) {
      document.getElementById('itemAddName').value = editingItem.name || '';
      document.getElementById('itemAddNameHindi').value = editingItem.nameHindi || '';
      document.getElementById('itemAddPrice').value = editingItem.price || '';
      document.getElementById('itemAddCategory').value = editingItem.categoryId || '';
      document.getElementById('itemAddVariants').value = editingItem.variants?.map(v => `${v.name}/${v.price}`).join(', ') || '';
      document.getElementById('itemAddVariantsHindi').value = editingItem.variants?.map(v => `${v.nameHindi}/${v.price}`).join(', ') || '';
      document.getElementById('itemAddModifiers').value = editingItem.modifiers?.map(m => `${m.name}/${m.price}`).join(', ') || '';
      document.getElementById('itemAddModifiersHindi').value = editingItem.modifiers?.map(m => `${m.nameHindi}/${m.price}`).join(', ') || '';
      // START NEW LINES for pre-filling keywords
      document.getElementById('itemAddVariantKeywords').value = editingItem.variants?.map(v => v.variantKeywords?.join(', ') || '').join(' | ') || '';
      document.getElementById('itemAddVariantKeywordsHindi').value = editingItem.variants?.map(v => v.variantKeywordsHindi || '').join(' | ') || '';
      document.getElementById('itemAddModifierKeywords').value = editingItem.modifiers?.map(m => m.modifierKeywords?.join(', ') || '').join(' | ') || '';
      document.getElementById('itemAddModifierKeywordsHindi').value = editingItem.modifiers?.map(m => m.modifierKeywordsHindi || '').join(' | ') || '';
      // END NEW LINES
      document.getElementById('editingItemId').value = editingItemId;
      document.getElementById('itemFormModal').style.display = 'flex';
      document.body.classList.add('modal-open');
    }
    }
  
    if (window.pramukhIME) {
      const ime = window.pramukhIME;
      ime.enable();
      document.getElementById('toggleHindiTyping').addEventListener('change', (e) => {
        const fields = ["itemAddNameHindi", "itemAddVariantsHindi", "itemAddVariantKeywordsHindi", "itemAddModifiersHindi", "itemAddModifierKeywordsHindi"];
        if (e.target.checked) {
          console.log("Enabling Hindi typing...");
          ime.setLanguage('hindi', 'pramukhindic');
          fields.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
              console.log(`Adding keyboard to element: ${id}`, element);
              ime.addKeyboard(element);
            } else {
              console.error(`Element not found for ID: ${id}. Is the modal open?`);
            }
          });
        } else {
          console.log("Disabling Hindi typing...");
          fields.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
              console.log(`Removing keyboard from element: ${id}`, element);
              ime.removeKeyboard(element);
            }
          });
        }
      });
     }
    document.getElementById('manageCategoriesBtn').onclick = () => showCategoryManagementModal(main);

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

  const nameInput = document.getElementById("itemAddName");
  const hindiNameInput = document.getElementById("itemAddNameHindi");

  nameInput.addEventListener("blur", async () => {
    const text = nameInput.value.trim();
    if (text && !hindiNameInput.dataset.manualEdited) {
      try {
        const res = await fetch("https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=hi&dt=t&q=" + encodeURIComponent(text));
        const data = await res.json();
        hindiNameInput.value = data[0][0][0];
      } catch {
        console.warn("Translation failed");
      }
    }
  });

  hindiNameInput.addEventListener("input", () => {
    hindiNameInput.dataset.manualEdited = "true";
  });

  const translateFieldPairs = [
    { eng: "itemAddVariants", hindi: "itemAddVariantsHindi" },
    { eng: "itemAddVariantKeywords", hindi: "itemAddVariantKeywordsHindi" },
    { eng: "itemAddModifiers", hindi: "itemAddModifiersHindi" },
    { eng: "itemAddModifierKeywords", hindi: "itemAddModifierKeywordsHindi" }
  ];

  translateFieldPairs.forEach(({ eng, hindi }) => {
    const engInput = document.getElementById(eng);
    const hiInput = document.getElementById(hindi);

    engInput.addEventListener("blur", async () => {
      if (!engInput.value.trim() || hiInput.dataset.manualEdited) return;

      let parts;
      let joinDelimiter;

      // MODIFIED: Determine split and join delimiters based on the field type
      if (eng === "itemAddVariants" || eng === "itemAddModifiers") {
        parts = engInput.value.split(",").map(s => s.trim()); // Split by comma for variants/modifiers
        joinDelimiter = ", "; // Join with comma for variants/modifiers
      } else { // For keyword fields (Variant Keywords, Modifier Keywords)
        parts = engInput.value.split("|").map(s => s.trim()); // Split by pipe for keywords
        joinDelimiter = " | "; // Join with pipe for keywords
      }

      const translated = await Promise.all(parts.map(async (pair) => {
        // MODIFIED: Logic for translating variant/modifier names while preserving price
        if (eng === "itemAddVariants" || eng === "itemAddModifiers") {
            const [text, price] = pair.split("/");
            try {
                const res = await fetch("https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=hi&dt=t&q=" + encodeURIComponent(text.trim()));
                const data = await res.json();
                return `${data[0][0][0].trim()}/${price?.trim() || ""}`;
            } catch {
                return `${text.trim()}/${price?.trim() || ""}`;
            }
        } else { // Logic for translating keyword blocks
            const keywords = pair.split(',').map(k => k.trim());
            const translatedKeywords = await Promise.all(keywords.map(async (keyword) => {
                try {
                    const res = await fetch("https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=hi&dt=t&q=" + encodeURIComponent(keyword));
                    const data = await res.json();
                    return data[0][0][0].trim();
                } catch {
                    return keyword;
                }
            }));
            return translatedKeywords.join(',');
        }
      }));
      hiInput.value = translated.join(joinDelimiter); // Use the correct joinDelimiter
    });

    hiInput.addEventListener("input", () => {
      hiInput.dataset.manualEdited = "true";
    });
  });

  document.getElementById("itemAddForm").onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById("itemAddName").value.trim();
    const nameHindi = document.getElementById("itemAddNameHindi").value.trim();
    const price = Number(document.getElementById("itemAddPrice").value);
    const categoryId = document.getElementById("itemAddCategory").value;
    const variantsStr = document.getElementById("itemAddVariants").value.trim();
    const variantsHindiStr = document.getElementById("itemAddVariantsHindi").value.trim();
    const modifiersStr = document.getElementById("itemAddModifiers").value.trim();
    const modifiersHindiStr = document.getElementById("itemAddModifiersHindi").value.trim();
    // START NEW LINES for capturing keyword input values
    const variantKeywordsStr = document.getElementById("itemAddVariantKeywords").value.trim();
    const variantKeywordsHindiStr = document.getElementById("itemAddVariantKeywordsHindi").value.trim();
    const modifierKeywordsStr = document.getElementById("itemAddModifierKeywords").value.trim();
    const modifierKeywordsHindiStr = document.getElementById("itemAddModifierKeywordsHindi").value.trim();
    // END NEW LINES
    const editingId = document.getElementById("editingItemId").value;
  
    if (!name || !price || !categoryId) {
      showError("itemAddError", "Missing fields");
      return;
    }
  
   // START MODIFIED parsePairs function
    const parsePairs = (str, hindiStr, keywordsStr = '', keywordsHindiStr = '') => {
      const enParts = str.split(",").map(s => s.trim()).filter(s => s.length > 0);
      const hiParts = hindiStr.split(",").map(s => s.trim()).filter(s => s.length > 0);
      const engKeywordBlocks = keywordsStr.split('|').map(s => s.trim());
      const hindiKeywordBlocks = keywordsHindiStr.split('|').map(s => s.trim());

      return enParts.map((e, i) => {
        const [name, price] = e.split("/");
        const [nameHindi] = hiParts[i]?.split("/") || [""];

        const variantEngKeywords = engKeywordBlocks[i] ? engKeywordBlocks[i].split(',').map(k => k.trim()).filter(k => k.length > 0) : [];
        const variantHindiKeywords = hindiKeywordBlocks[i] ? hindiKeywordBlocks[i] : '';

        return {
          name: name.trim(),
          nameHindi: nameHindi.trim(),
          price: Number(price),
          variantKeywords: variantEngKeywords,
          variantKeywordsHindi: variantHindiKeywords,
          modifierKeywords: variantEngKeywords,
          modifierKeywordsHindi: variantHindiKeywords
        };
      }).filter(v => v.name && !isNaN(v.price));
    };
    // END MODIFIED parsePairs function
  
    const itemId = editingId || genId("item");
    const variants = variantsStr ? parsePairs(variantsStr, variantsHindiStr, variantKeywordsStr, variantKeywordsHindiStr) : [];
    const modifiers = modifiersStr ? parsePairs(modifiersStr, modifiersHindiStr, modifierKeywordsStr, modifierKeywordsHindiStr) : [];
    
    const variantIds = [];
    const modifierIds = [];
  
    for (const variant of variants) {
      const existingVariant = editingItem?.variants?.find(v =>
          v.name === variant.name &&
          v.nameHindi === variant.nameHindi &&
          v.price === variant.price
      );
      variant.id = existingVariant ? existingVariant.id : genId("variant");
      variant.itemId = itemId;

      await POSDatabase.put("variants", variant);
      variantIds.push(variant.id);
    }

    for (const modifier of modifiers) {
      const existingModifier = editingItem?.modifiers?.find(m =>
          m.name === modifier.name &&
          m.nameHindi === modifier.nameHindi &&
          m.price === modifier.price
      );
      modifier.id = existingModifier ? existingModifier.id : genId("modifier");
      modifier.itemId = itemId;

      await POSDatabase.put("modifiers", modifier);
      modifierIds.push(modifier.id);
    }
    
    const itemData = {
      id: itemId,
      name,
      nameHindi,
      price,
      categoryId,
      variantIds,
      modifierIds,
    };
  
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