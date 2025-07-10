// Utility functions
function genId(prefix = "id") {
  return prefix + "_" + Math.random().toString(36).slice(2, 10);
}

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function showError(elementId, message) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message;
  el.classList.remove("hidden");
  setTimeout(() => { el.classList.add("hidden"); }, 4000);
}

// State
let currentUser = null;
let cart = [];
let currentSection = "order";

// Drawer UI functions

function setupDrawerNav() {
 

  const openBtn = document.getElementById("drawerOpenBtn");
  const closeBtn = document.getElementById("drawerCloseBtn");
  const overlay = document.getElementById("drawerOverlay");
  const drawer = document.getElementById("drawerNav");
  const linksDiv = document.getElementById("drawerLinks");
  if (!openBtn || !closeBtn || !overlay || !drawer || !linksDiv) {
    console.warn("Drawer elements not found during setupDrawerNav. This might happen if not logged in.");
    return;
  }

  const navOptions = [
    {section: "order", label: "Order"},
    {section: "sales", label: "Sales/Reports"},
    ...(currentUser && currentUser.role === "admin" ? [
      {section: "users", label: "User Management"},
      {section: "menu", label: "Menu Management"},
    ] : []),
    {section: "logout", label: "Logout"}
  ];

  linksDiv.innerHTML = navOptions.map(opt =>
    `<button class="drawerLinkBtn${currentSection===opt.section?" active":""}" data-section="${opt.section}">${opt.label}</button>`
  ).join("");

  linksDiv.querySelectorAll(".drawerLinkBtn").forEach(btn => {
    btn.onclick = () => {
      handleNav(btn.dataset.section);
      closeDrawer();
    };
  });

  function openDrawer() {
  drawer.classList.add("open");
  overlay.style.display = "block";
  overlay.setAttribute('aria-hidden', 'false');
  setTimeout(() => overlay.style.opacity = "1", 5);
}

function closeDrawer() {
  drawer.classList.remove("open");
  overlay.style.opacity = "0";
  overlay.setAttribute('aria-hidden', 'true');
  setTimeout(() => overlay.style.display = "none", 190);
}

  openBtn.onclick = openDrawer;
  closeBtn.onclick = closeDrawer;
  overlay.onclick = closeDrawer;
}

// Main render function
async function render() {
  await window.POSDatabase.openDB();
  

  const users = await window.POSDatabase.getAll("users");
  if (!users.length) {
    await renderRegister();
  } else if (!currentUser) {
    await renderLogin();
  } else {
    await renderAppLayout();
  }
}

function renderLogin() {
 
  document.getElementById("app").innerHTML = `
    <div style="max-width:340px;margin:2em auto 0 auto;">
      <h2>Login</h2>
      <form id="loginForm">
        <input id="loginUser" placeholder="Username" autocomplete="username" required>
        <input id="loginPass" type="password" placeholder="Password" autocomplete="current-password" required>
        <button type="submit">Login</button>
      </form>
      <div id="loginError" class="hidden" style="color:red"></div>
    </div>
  `;

  document.getElementById("loginForm").onsubmit = async (e) => {
    e.preventDefault();
    const username = document.getElementById("loginUser").value.trim();
    const password = document.getElementById("loginPass").value;
    const users = await window.POSDatabase.getAll("users");
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());

    if (!user) {
      showError("loginError", "Invalid username or password");
      return;
    }

    const passwordHash = await hashPassword(password);
    if (user.passwordHash !== passwordHash) {
      showError("loginError", "Invalid username or password");
      return;
    }

    currentUser = { username: user.username, role: user.role };
    cart = [];
    render();
  };
}

function renderRegister() {
  
  document.getElementById("app").innerHTML = `
    <div style="max-width:340px;margin:2em auto 0 auto;">
      <h2>Create Admin Account</h2>
      <form id="registerForm">
        <input id="regUser" placeholder="Username" required>
        <input id="regPass" type="password" placeholder="Password" required>
        <input id="regPass2" type="password" placeholder="Confirm Password" required>
        <button type="submit">Create Account</button>
      </form>
      <div id="regError" class="hidden" style="color:red"></div>
    </div>
  `;

  document.getElementById("registerForm").onsubmit = async (e) => {
    e.preventDefault();
    const username = document.getElementById("regUser").value.trim();
    const password = document.getElementById("regPass").value;
    const password2 = document.getElementById("regPass2").value;

    if (!username || !password) {
      showError("regError", "Username and password required");
      return;
    }

    if (password !== password2) {
      showError("regError", "Passwords don't match");
      return;
    }

    const passwordHash = await hashPassword(password);
    await window.POSDatabase.put("users", {
      id: genId("user"),
      username,
      passwordHash,
      role: "admin"
    });

    currentUser = { username, role: "admin" };
    render();
  };
}

async function renderOrderSection(main) {
  const menuItems = await window.POSDatabase.getAll("menuItems");
  const categories = await window.POSDatabase.getAll("categories");

  main.innerHTML = `
    <h2>Order</h2>
    <div id="orderItemsGrid" class="order-items-grid">
      ${menuItems.map(i => `
        <button class="orderItemBtn" data-id="${i.id}">
          <span class="item-name">${i.name}</span>
          <span class="item-price">₹${i.price}</span>
          <span class="item-category">${((categories.find(c => c.id === i.categoryId)||{}).name||"-")}</span>
        </button>
      `).join("")}
    </div>
    <div id="orderConfigDiv"></div>
    <div id="cartDiv">
      <h4>Cart</h4>
      <div class="cart-table-wrapper">
        <table>
          <thead><tr><th>Item</th><th>Variant</th><th>Modifiers</th><th>Qty</th><th>Price</th><th>Total</th><th></th></tr></thead>
          <tbody>
            ${cart.map((ci, idx) => `
              <tr>
                <td>${ci.name}</td>
                <td>${ci.variant ? ci.variant.name : "-"}</td>
                <td>${ci.modifiers && ci.modifiers.length ? ci.modifiers.map(m=>m.name).join(", ") : "-"}</td>
                <td>
                  <input
                    type="number"
                    class="cart-qty-input"
                    min="1"
                    value="${ci.qty}"
                    data-idx="${idx}"
                    style="width: 3em; text-align: center;"
                  >
                </td>
                <td>${ci.finalPrice}</td>
                <td>${ci.qty * ci.finalPrice}</td>
                <td><button class="removeCartBtn" data-idx="${idx}">Remove</button></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
      <div><strong>Grand Total: ₹${cart.reduce((sum, ci) => sum + ci.qty * ci.finalPrice, 0)}</strong></div>
      <button id="placeOrderBtn" ${cart.length === 0 ? "disabled" : ""}>Place Order</button>
    </div>
    <div id="orderMsg" style="color: green"></div>
  `;

  document.querySelectorAll(".cart-qty-input").forEach(input => {
    input.onchange = () => {
      const idx = Number(input.dataset.idx);
      const val = Math.max(1, parseInt(input.value, 10) || 1);
      cart[idx].qty = val;
      renderSection("order");
    };
  });

  document.querySelectorAll(".orderItemBtn").forEach(btn => {
    btn.onclick = (e) => {
      const item = menuItems.find(i => i.id === btn.dataset.id);
      if (!item) return;
      showOrderConfigModal(item, menuItems, categories, (cartItem) => {
        cart.push(cartItem);
        renderSection("order");
      }, e);
    };
  });

  document.querySelectorAll(".removeCartBtn").forEach(btn => {
    btn.onclick = () => {
      const idx = Number(btn.dataset.idx);
      cart.splice(idx, 1);
      renderSection("order");
    };
  });

  document.getElementById("placeOrderBtn").onclick = async () => {
    if (!cart.length) return;
    const receiptNo = await getNextReceiptNo();
    await window.POSDatabase.put("orders", {
      id: genId("order"),
      receiptNo,
      items: cart.map(ci => ({
        id: ci.id,
        name: ci.name,
        variant: ci.variant,
        modifiers: ci.modifiers,
        price: ci.finalPrice,
        qty: ci.qty
      })),
      total: cart.reduce((sum, ci) => sum + ci.qty * ci.finalPrice, 0),
      ts: Date.now(),
      user: currentUser.username,
    });
    cart = [];
    document.getElementById("orderMsg").textContent = "Order placed!";
    renderSection("order");
  };
}

function openOrderModal() {
  document.getElementById('orderModal').style.display = 'flex';
  document.body.classList.add('modal-open');
}

function closeOrderModal() {
  document.getElementById('orderModal').style.display = 'none';
  document.body.classList.remove('modal-open');
}

function showOrderConfigModal(item, menuItems, categories, onAddToCart, event) {
  const modal = document.getElementById("orderModal");
  // Corrected HTML generation for modal content and backdrop
  modal.innerHTML = `
  
    <div class="modal-content">
      <form id="orderConfigForm" class="order-config-form">
        <strong>${item.name}</strong>
        <br>
        <span style="color:#1560ff;">Base Price: ₹${item.price}</span>
        <br>
        ${item.variants && item.variants.length ? `
          <label>Variant:</label>
          <select id="orderVariantSelect" required>
            <option value="">Select</option>
            ${item.variants.map((v,i) => `<option value="${i}">${v.name} (₹${v.price})</option>`).join("")}
          </select>
        ` : ""}
        ${item.modifiers && item.modifiers.length ? `
          <label>Modifiers:</label>
          <div class="order-modifiers-group">
            ${item.modifiers.map((m,i) => `
              <div class="order-modifier-row">
                <input type="checkbox" name="orderModifiers" value="${i}" id="mod${i}">
                <label for="mod${i}">${m.name} ${m.price ? `(+₹${m.price})` : ""}</label>
              </div>
            `).join("")}
          </div>
        ` : ""}
        <div class="order-config-row">
          <label for="orderQtyInput">Quantity:</label>
          <input id="orderQtyInput" type="number" min="1" max="99" value="1">
        </div>
        <div class="order-config-actions">
          <button type="submit" class="btn-primary">Add to Cart</button>
          <button type="button" id="orderCancelBtn" class="btn-secondary">Cancel</button>
        </div>
      </form>
    </div>
  `;

  openOrderModal();
modal.onclick = (e) => {
        // Only close if the click was directly on the modal (backdrop area), not on its content
        if (e.target === modal) {
            closeOrderModal();
        }
    };
  modal.querySelector("#orderConfigForm").onsubmit = (e) => {
    e.preventDefault();
    let variant = null;
    let variantPrice = 0;
    if (item.variants && item.variants.length) {
      const sel = modal.querySelector("#orderVariantSelect").value;
      if (!sel) return;
      variant = item.variants[Number(sel)];
      variantPrice = variant.price || 0;
    }

    let modifiers = [];
    let modifiersTotal = 0;
    if (item.modifiers && item.modifiers.length) {
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
      variant,
      modifiers,
      qty,
      finalPrice
    });

    closeOrderModal();
  };

  modal.querySelector("#orderCancelBtn").onclick = closeOrderModal;
 
}

function updateNavVisibility() {
  const isMobile = window.innerWidth < 768;
  const desktopButtons = document.querySelectorAll("nav#mainNav .desktop-only-nav-btn");
  const toggleButton = document.querySelector("nav#mainNav .menu-toggle-btn");
  desktopButtons.forEach(btn => {
    btn.style.display = isMobile ? "none" : "block";
    btn.classList.toggle("hidden", isMobile);
    console.log("Mobile Check:", isMobile, "Button:", btn.textContent, "Display:", btn.style.display);
  });
  if (toggleButton) {
    toggleButton.style.display = isMobile ? "flex" : "none";
    toggleButton.classList.toggle("hidden", !isMobile);
  }
}

window.addEventListener("resize", updateNavVisibility);
updateNavVisibility();

async function renderAppLayout() {
  let nav = `
    <nav id="mainNav">
      <button id="drawerOpenBtn" title="Open Menu" class="navBtn menu-toggle-btn">☰</button>
      <button class="navBtn desktop-only-nav-btn${currentSection === "order" ? " active" : ""}" data-section="order">Order</button>
      <button class="navBtn desktop-only-nav-btn${currentSection === "sales" ? " active" : ""}" data-section="sales">Sales/Reports</button>
      ${currentUser.role === "admin" ? `
        <button class="navBtn desktop-only-nav-btn${currentSection === "users" ? " active" : ""}" data-section="users">User Management</button>
        <button class="navBtn desktop-only-nav-btn${currentSection === "menu" ? " active" : ""}" data-section="menu">Menu Management</button>
      ` : ""}
      <button class="navBtn desktop-only-nav-btn" data-section="logout">Logout</button>
    </nav>
    <div id="mainContent"></div>
  `;

  const app = document.getElementById("app");
  if (!app.innerHTML || app.innerHTML.indexOf("mainNav") === -1) {
    app.innerHTML = nav;
  }

  updateNavVisibility();
  if (window.innerWidth >= 768) {
 document.querySelectorAll("nav#mainNav .desktop-only-nav-btn").forEach(btn => {
  const isActive = btn.dataset.section === currentSection;

  // Update the active class
  btn.classList.toggle("active", isActive);

  // Apply styles
  btn.style.padding = "0.6rem 1rem";
  btn.style.background = isActive ? "var(--primary-light)" : "var(--text-light)";
  btn.style.color = isActive ? "#fff" : "var(--primary-color)";
  btn.style.transform = isActive ? "translateY(-1px)" : "none";
});
  }

  document.querySelectorAll("nav#mainNav .navBtn.desktop-only-nav-btn").forEach(btn => {
    btn.onclick = () => handleNav(btn.dataset.section);
  });

  renderSection(currentSection);
  setupDrawerNav();
}

function handleNav(section) {
  if (section === "logout") {
    currentUser = null;
    cart = [];
    
    render();
    return;
  }
  currentSection = section;
  renderAppLayout();
}

function renderSection(section) {
  const main = document.getElementById("mainContent");
  if (!main) return;

  if (section === "order") {
    renderOrderSection(main);
  } else if (section === "sales") {
    renderSalesSection(main);
  } else if (section === "users") {
    renderUserManagementSection(main);
  } else if (section === "menu") {
    renderMenuManagement();
  } else {
    main.innerHTML = "<h2>Unknown Section</h2>";
  }
}

async function renderUserManagementSection(main) {
  const users = await window.POSDatabase.getAll("users");

  main.innerHTML = `
    <h2>User Management</h2>
    <form id="userAddForm" style="margin-bottom:1em;">
      <input id="userAddName" placeholder="Username" required>
      <input id="userAddPass" type="password" placeholder="Password" required>
      <select id="userAddRole">
        <option value="admin">Admin</option>
        <option value="staff">Staff</option>
      </select>
      <button type="submit">Add User</button>
    </form>
    <div id="userAddError" class="hidden" style="color:red"></div>
    <table>
      <thead><tr><th>Username</th><th>Role</th><th>Delete</th></tr></thead>
      <tbody>
        ${users.map(u => `
          <tr>
            <td>${u.username}</td>
            <td>${u.role}</td>
            <td>${u.username !== currentUser.username ? `<button class="deleteUserBtn" data-id="${u.id}">Delete</button>` : ""}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  document.getElementById("userAddForm").onsubmit = async (e) => {
    e.preventDefault();
    const username = document.getElementById("userAddName").value.trim();
    const password = document.getElementById("userAddPass").value;
    const role = document.getElementById("userAddRole").value;

    if (!username || !password) {
      showError("userAddError", "Fields cannot be empty");
      return;
    }

    const allUsers = await window.POSDatabase.getAll("users");
    if (allUsers.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      showError("userAddError", "Username already exists");
      return;
    }

    const passwordHash = await hashPassword(password);
    await window.POSDatabase.put("users", {
      id: genId("user"),
      username,
      passwordHash,
      role
    });

    renderSection("users");
  };

  document.querySelectorAll(".deleteUserBtn").forEach(btn => {
    btn.onclick = async () => {
      if (confirm("Delete this user?")) {
        await window.POSDatabase.delete("users", btn.dataset.id);
        renderSection("users");
      }
    };
  });
}

async function renderMenuManagement(editingItemId = null) {
  const main = document.getElementById("mainContent");
  if (!main) return;

  const categories = await window.POSDatabase.getAll("categories");
  const menuItems = await window.POSDatabase.getAll("menuItems");

  let html = `
    <h3>Menu Management</h3>
    <form id="catAddForm" style="margin-bottom:1em;">
      <input id="catAddName" placeholder="New Category" required>
      <button type="submit">Add Category</button>
    </form>
   
    <div id="catAddError" class="hidden" style="color:red"></div>
    
    <button id="openItemModal" class="btn-primary" style="margin-bottom:1em;">Add Item</button>
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
            <button type="button" id="closeItemModal" class="btn-secondary">Cancel</button>
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
              <td>${i.variants && i.variants.length ? i.variants.map(v=>`${v.name} (${v.price})`).join(", ") : "-"}</td>
              <td>${i.modifiers && i.modifiers.length ? i.modifiers.map(m=>`${m.name} (${m.price})`).join(", ") : "-"}</td>
              <td>
                <button class="editItemBtn" data-id="${i.id}">Edit</button>
                <button class="deleteItemBtn" data-id="${i.id}">Delete</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;

  main.innerHTML = html;

  // Initialize modal functionality
  const itemModal = document.getElementById('itemFormModal');
  const openModalBtn = document.getElementById('openItemModal');
  const closeModalBtn = document.getElementById('closeItemModal');

  // Open modal
  openModalBtn.addEventListener('click', () => {
    document.getElementById('editingItemId').value = '';
    document.getElementById('itemAddForm').reset();
    itemModal.style.display = 'flex';
    document.body.classList.add('modal-open');
  });

  // Close modal
  closeModalBtn.addEventListener('click', () => {
    itemModal.style.display = 'none';
    document.body.classList.remove('modal-open');
  });

  // Close when clicking outside modal
  itemModal.addEventListener('click', (e) => {
    if (e.target === itemModal) {
      itemModal.style.display = 'none';
      document.body.classList.remove('modal-open');
    }
  });

  // Populate form if editing
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

  // Existing form handlers
  document.getElementById("catAddForm").onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById("catAddName").value.trim();
    if (!name) return;

    const allCats = await window.POSDatabase.getAll("categories");
    if (allCats.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      showError("catAddError", "Category exists");
      return;
    }

    await window.POSDatabase.put("categories", { id: genId("cat"), name });
    renderMenuManagement();
  };

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

    let variants = [];
    if (variantsStr) {
      variants = variantsStr.split(",").map(v => {
        const [name, price] = v.split("/");
        return { name: name?.trim(), price: Number(price) };
      }).filter(v => v.name && !isNaN(v.price));
    }

    let modifiers = [];
    if (modifiersStr) {
      modifiers = modifiersStr.split(",").map(m => {
        const [name, price] = m.split("/");
        return { name: name?.trim(), price: Number(price) };
      }).filter(m => m.name && !isNaN(m.price));
    }

    if (editingId) {
      await window.POSDatabase.put("menuItems", { id: editingId, name, price, categoryId, variants, modifiers });
    } else {
      await window.POSDatabase.put("menuItems", { id: genId("item"), name, price, categoryId, variants, modifiers });
    }

    itemModal.style.display = 'none';
    document.body.classList.remove('modal-open');
    renderMenuManagement();
  };

  document.querySelectorAll(".editItemBtn").forEach(btn => {
    btn.onclick = () => {
      renderMenuManagement(btn.dataset.id);
    };
  });

  document.querySelectorAll(".deleteItemBtn").forEach(btn => {
    btn.onclick = async () => {
      if (confirm("Delete this item?")) {
        await window.POSDatabase.delete("menuItems", btn.dataset.id);
        renderMenuManagement();
      }
    };
  });
}

//function to refresh sales data
async function refreshSalesData() {
  const mainContent = document.getElementById("mainContent");
  if (mainContent && currentSection === "sales") {
    mainContent.classList.add("loading");
    try {
      await renderSalesSection(mainContent);
    } finally {
      mainContent.classList.remove("loading");
    }
  }
}

async function renderSalesSection(main) {
  const orders = await window.POSDatabase.getAll("orders");
  const users = await window.POSDatabase.getAll("users");
  const menuItems = await window.POSDatabase.getAll("menuItems");
  const categories = await window.POSDatabase.getAll("categories");

  const today = new Date();
  let filterShow = false;
  let filterType = "day";
  let filterDay = today.toISOString().slice(0,10);
  let filterMonth = today.toISOString().slice(0,7);
  let filterYear = String(today.getFullYear());
  let rangeStart = today.toISOString().slice(0,10);
  let rangeEnd = today.toISOString().slice(0,10);
  let filterUser = "";
  let filterItem = "";
  let filterCategory = "";
  let filterSearch = "";

  function filterOrders() {
    let filtered = orders.filter(o => {
      const d = new Date(o.ts);
      if (filterType === "day" && d.toISOString().slice(0,10) !== filterDay) return false;
      if (filterType === "month" && d.toISOString().slice(0,7) !== filterMonth) return false;
      if (filterType === "year" && String(d.getFullYear()) !== filterYear) return false;
      if (filterType === "range" && (d < new Date(rangeStart) || d > new Date(rangeEnd + "T23:59:59"))) return false;
      if (filterUser && o.user !== filterUser) return false;

      let foundItem = false, foundCategory = false, foundSearch = false;
      if (filterItem || filterCategory || filterSearch) {
        for (const i of o.items) {
          const itemMeta = menuItems.find(mi => mi.id === i.id) || {};
          if (!filterItem || (i.name === filterItem)) foundItem = true;
          if (!filterCategory || (itemMeta.categoryId === filterCategory)) foundCategory = true;
          if (!filterSearch || (i.name.toLowerCase().includes(filterSearch.toLowerCase()) || String(i.id).includes(filterSearch))) foundSearch = true;
        }
        if (filterItem && !foundItem) return false;
        if (filterCategory && !foundCategory) return false;
        if (filterSearch && !foundSearch) return false;
      }
      return true;
    });

	 const sortDirection = document.getElementById("sortOrder").value;
    filtered.sort((a, b) => {
  // Use '||' to provide a default value of '0' if receiptNo is missing
  const numA = parseInt((a.receiptNo || '0').replace(/\D/g, ''));
  const numB = parseInt((b.receiptNo || '0').replace(/\D/g, ''));
  return sortDirection === "asc" ? numA - numB : numB - numA;
});

    return filtered;
  }

  function rerender() {
    const filtered = filterOrders();

    let tableHtml = `
    <table>
        <thead>
        <tr>
            <th>Date</th>
            <th>Receipt #</th>
            <th>User</th>
            <th>Items</th>
            <th>Total</th>
            <th>Actions</th>
        </tr>
        </thead>
        <tbody>
        ${filtered.map(o => `
            <tr class="${o.negativeOf ? 'negative-receipt' : ''}"
                title="${o.negativeOf ? 'Return transaction for #'+o.negativeOf : 'Original sale'}">
            <td>${new Date(o.ts).toLocaleString()}</td>
            <td>
                ${o.negativeOf ? '↩️ ' : ''}${o.receiptNo}
                ${o.negativeOf ? `<br><small>(Return for #${o.negativeOf})</small>` : ''}
            </td>
            <td>${o.user || "-"}</td>
            <td>
                ${o.items.map(i => {
                    const meta = menuItems.find(m => m.id === i.id) || {};
                    return `${i.name}${i.variant ? " ("+i.variant.name+")" : ""} ×${Math.abs(i.qty)} (₹${i.price})${i.modifiers && i.modifiers.length ? `<br><small>+ ${i.modifiers.map(m=>m.name).join(", ")}</small>` : ""} <br><small>Cat: ${(categories.find(c => c.id === meta.categoryId)||{}).name||"-"}</small>`;
                }).join("<br>")}
            </td>
            <td class="${o.total < 0 ? 'negative-amount' : ''}">₹${Math.abs(o.total)}${o.total < 0 ? ' (Return)' : ''}</td>
            <td>
              <div class="sales-actions-container">
    <button class="sales-action-btn viewReceiptBtn" data-id="${o.id}">View</button>
    ${!o.negativeOf && (currentUser.role === "admin" || o.user === currentUser.username) ? `
      ${!orders.some(negOrder => negOrder.negativeOf === o.receiptNo) ? `
        <button class="sales-action-btn editReceiptBtn" data-id="${o.id}">Edit</button>
        <button class="sales-action-btn deleteReceiptBtn" data-id="${o.id}">Delete</button>
      ` : ''}
      <button class="sales-action-btn negativeReceiptBtn" data-id="${o.id}">Return</button>
    ` : ''}
  </div>
            </td>
            </tr>
        `).join("")}
        </tbody>
    </table>
    <div><strong>
    Total sales: ₹${filtered.reduce((sum, o) => sum + (o.total || 0), 0)}<br>
    Items sold: ${filtered.reduce((sum, o) => {
    const itemsTotal = Array.isArray(o.items)
        ? o.items.reduce((itemSum, i) => itemSum + (i.qty || 0), 0)
        : 0;
    return sum + itemsTotal;
}, 0)}
    </strong></div>
    `;
    document.getElementById("salesTableHolder").innerHTML = tableHtml;

    document.querySelectorAll(".viewReceiptBtn").forEach(btn => {
        btn.onclick = () => {
            const order = orders.find(o=>o.id===btn.dataset.id);
            if (!order) return;
            showReceiptModal(order, menuItems, categories);
        };
    });

    document.querySelectorAll(".editReceiptBtn").forEach(btn => {
        btn.onclick = async () => {
            const order = orders.find(o=>o.id===btn.dataset.id);
            if (!order || (currentUser.role !== "admin" && order.user !== currentUser.username)) return;
            showEditReceiptModal(order, menuItems, categories, async (newItems, total) => {
                order.items = newItems;
                order.total = total;
                await window.POSDatabase.put("orders", order);
                rerender();
            });
        };
    });

    document.querySelectorAll(".deleteReceiptBtn").forEach(btn => {
        btn.onclick = async () => {
            const order = orders.find(o=>o.id===btn.dataset.id);
            if (!order || (currentUser.role !== "admin" && order.user !== currentUser.username)) return;

            // Check if this receipt has any negative receipts (returns)
            const hasNegativeReceipt = orders.some(o => o.negativeOf === order.receiptNo);
            if (hasNegativeReceipt) {
                alert(`⚠️ Cannot delete receipt #${order.receiptNo} because it has associated return transactions.\n\nPlease delete the return transactions first.`);
                return;
            }

            if (confirm("Delete this receipt?")) {
                await window.POSDatabase.delete("orders", btn.dataset.id);
                alert(`✅ Receipt deleted successfully!`);

                await refreshSalesData();
                // Add visual feedback during refresh
                mainContent.classList.add("refreshing");
                setTimeout(() => {
                    mainContent.classList.remove("refreshing");
                }, 500);
            }
        };
    });

    document.querySelectorAll(".negativeReceiptBtn").forEach(btn => {
        btn.onclick = async () => {
            const order = orders.find(o=>o.id===btn.dataset.id);
            if (!order || (currentUser.role !== "admin" && order.user !== currentUser.username)) return;
            // Check if negative receipt already exists
            const allOrders = await window.POSDatabase.getAll("orders");
            const negativeReceiptExists = allOrders.some(o =>
                o.negativeOf === order.receiptNo
            );

            if (negativeReceiptExists) {
                alert(`⚠️ Negative receipt already exists for #${order.receiptNo}\n\nCannot create duplicate return transaction.`);
                return;
            }
            // Confirmation dialog
            const confirmCreate = confirm(
                `Create Negative Receipt for #${order.receiptNo}?\n\n` +
                `Original Total: ₹${order.total}\n` +
                `This will create a return transaction.`
            );
            if (!confirmCreate) return;

            const receiptNo = await getNextReceiptNo();
            await window.POSDatabase.put("orders", {
                id: genId("order"),
                receiptNo,
                items: order.items.map(i => ({...i, qty: -Math.abs(i.qty)})),
                total: -Math.abs(order.total),
                ts: Date.now(),
                user: currentUser.username,
                negativeOf: order.receiptNo,

            });
            alert(`✅ Negative receipt #${receiptNo} created successfully!`);

            await refreshSalesData();
            // Add visual feedback during refresh
           /* mainContent.classList.add("refreshing");
            setTimeout(() => {
                mainContent.classList.remove("refreshing");
            }, 500);*/
        };
    });

    // Rest of your chart code remains the same...
    // Hourly chart
    let hours = Array(24).fill(0);
    let chartDay = filterType === "day" ? filterDay : today.toISOString().slice(0,10);
    filtered.forEach(o => {
        const d = new Date(o.ts);
        if (d.toISOString().slice(0,10) === chartDay) {
            hours[d.getHours()] += o.total || 0;
        }
    });
    updateChart("hourlySalesChart", Array.from({length:24},(_,i)=>`${i}:00`), hours, "Hourly Sales (₹)");

    // Daily chart
    let chartMonth = filterType === "month" ? filterMonth : today.toISOString().slice(0,7);
    const [year, mon] = chartMonth.split("-");
    const daysInMonth = new Date(Number(year), Number(mon), 0).getDate();
    let daily = Array(daysInMonth).fill(0);
    filtered.forEach(o => {
        const d = new Date(o.ts);
        if (d.getFullYear() == year && (d.getMonth()+1) == Number(mon)) {
            daily[d.getDate()-1] += o.total || 0;
        }
    });
    updateChart("dailySalesChart", Array.from({length:daysInMonth},(_,i)=>`${i+1}`), daily, "Daily Sales (₹)");
}

 // Inside your renderSalesSection(main) function, update the main.innerHTML content:

main.innerHTML = `
    <h2>Sales/Reports</h2>

    <div class="sort-controls">
      <label>Sort by:</label>
      <select id="sortOrder">
        <option value="desc">Newest First</option>
        <option value="asc">Oldest First</option>
      </select>
    </div>

    <div style="text-align: center; margin-top: 1em; margin-bottom: 1em;">
      <button id="toggleFiltersBtn" type="button">${filterShow ? "Hide Filters" : "Show Filters"}</button>
    </div>

    <div id="salesFilters" class="${filterShow ? "" : "hidden"}" style="margin-bottom:1em;">
      <div class="sales-filters-grid">
        <div><label>Type</label>
        <select id="fltType">
          <option value="day">Day</option>
          <option value="month">Month</option>
          <option value="year">Year</option>
          <option value="range">Custom</option>
        </select></div>
        <div><label>Day</label><input type="date" id="fltDay" value="${filterDay}"></div>
        <div><label>Month</label><input type="month" id="fltMonth" value="${filterMonth}"></div>
        <div><label>Year</label><input type="number" min="2000" max="2100" id="fltYear" value="${filterYear}" style="width:5em;"></div>
        <div><label>Start</label><input type="date" id="fltStart" value="${rangeStart}"></div>
        <div><label>End</label><input type="date" id="fltEnd" value="${rangeEnd}"></div>
        <div><label>User</label>
          <select id="fltUser"><option value="">All</option>${users.map(u=>`<option value="${u.username}">${u.username}</option>`).join("")}</select>
        </div>
        <div><label>Item</label>
          <select id="fltItem"><option value="">All</option>${menuItems.map(i=>`<option value="${i.name}">${i.name}</option>`).join("")}</select>
        </div>
        <div><label>Category</label>
          <select id="fltCategory"><option value="">All</option>${categories.map(c=>`<option value="${c.id}">${c.name}</option>`).join("")}</select>
        </div>
        <div><label>Search (name/id)</label>
          <input type="text" id="fltSearch" placeholder="Search">
        </div>
      </div>
    </div>

    <div style="display:flex;flex-wrap:wrap;gap:1em;">
      <div style="flex:1;min-width:280px;">
        <canvas id="hourlySalesChart" height="160"></canvas>
      </div>
      <div style="flex:1;min-width:280px;">
        <canvas id="dailySalesChart" height="160"></canvas>
      </div>
    </div>
    <div id="salesTableHolder"></div>
  `;
  // Ensure the event listener for toggleFiltersBtn remains outside this HTML string,
  // targeting the button correctly, as it was in previous suggestions.

// Set up sort change handler
  //document.getElementById("sortOrder").addEventListener("change", rerender);
  
  document.getElementById("sortOrder").onchange = rerender; // Simplified, as rerender will read the value directly.


 /* main.querySelector("#toggleFiltersBtn").onclick = () => {
        // CHANGE 3: Toggle the 'hidden' class on the salesFilters container
        const salesFiltersContainer = main.querySelector("#salesFilters");
        const isHidden = salesFiltersContainer.classList.toggle("hidden");
        main.querySelector("#toggleFiltersBtn").textContent = isHidden ? "Show Filters" : "Hide Filters";
    };*/
main.querySelector("#toggleFiltersBtn").onclick = () => {
    const salesFiltersContainer = main.querySelector("#salesFilters");
    const toggleButton = main.querySelector("#toggleFiltersBtn");

    salesFiltersContainer.classList.toggle("hidden");
    const isNowHidden = salesFiltersContainer.classList.contains("hidden");

    toggleButton.textContent = isNowHidden ? "Show Filters" : "Hide Filters";

    if (isNowHidden) {
        // Filters are being hidden, so clear them
        filterType = "day";
        filterDay = today.toISOString().slice(0,10);
        filterMonth = today.toISOString().slice(0,7);
        filterYear = String(today.getFullYear());
        rangeStart = today.toISOString().slice(0,10);
        rangeEnd = today.toISOString().slice(0,10);
        filterUser = "";
        filterItem = "";
        filterCategory = "";
        filterSearch = "";

        // Update the input fields with cleared values
        main.querySelector("#fltType").value = filterType;
        main.querySelector("#fltDay").value = filterDay;
        main.querySelector("#fltMonth").value = filterMonth;
        main.querySelector("#fltYear").value = filterYear;
        main.querySelector("#fltStart").value = rangeStart;
        main.querySelector("#fltEnd").value = rangeEnd;
        main.querySelector("#fltUser").value = filterUser;
        main.querySelector("#fltItem").value = filterItem;
        main.querySelector("#fltCategory").value = filterCategory;
        main.querySelector("#fltSearch").value = filterSearch;

        rerender(); // Re-render the table with cleared filters
    } else {
        // Filters are being shown, set focus to the first filter input
        main.querySelector("#fltType").focus();
    }
};

// Corrected: Event listeners for all filter inputs to update state and then trigger rerender
main.querySelector("#fltType").onchange = e => {
  filterType = e.target.value;
  rerender();
};
main.querySelector("#fltDay").onchange = e => {
  filterDay = e.target.value;
  rerender();
};
main.querySelector("#fltMonth").onchange = e => {
  filterMonth = e.target.value;
  rerender();
};
main.querySelector("#fltYear").onchange = e => {
  filterYear = e.target.value;
  rerender();
};
main.querySelector("#fltStart").onchange = e => {
  rangeStart = e.target.value;
  rerender();
};
main.querySelector("#fltEnd").onchange = e => {
  rangeEnd = e.target.value;
  rerender();
};
main.querySelector("#fltUser").onchange = e => {
  filterUser = e.target.value;
  rerender();
};
main.querySelector("#fltItem").onchange = e => {
  filterItem = e.target.value;
  rerender();
};
main.querySelector("#fltCategory").onchange = e => {
  filterCategory = e.target.value;
  rerender();
};
main.querySelector("#fltSearch").oninput = e => { // Use oninput for text search for immediate feedback
  filterSearch = e.target.value;
  rerender();
};

// ... (rest of your renderSalesSection function, including the toggleFiltersBtn logic and initial rerender())



  // Initial render when the section loads
 /* main.querySelector("#fltType").onchange = e => {filterType = e.target.value; rerender();}
  main.querySelector("#fltDay").onchange = e => {filterDay = e.target.value; rerender();}
  main.querySelector("#fltMonth").onchange = e => {filterMonth = e.target.value; rerender();}
  main.querySelector("#fltYear").onchange = e => {filterYear = e.target.value; rerender();}
  main.querySelector("#fltStart").onchange = e => {rangeStart = e.target.value; rerender();}
  main.querySelector("#fltEnd").onchange = e => {rangeEnd = e.target.value; rerender();}
  main.querySelector("#fltUser").onchange = e => {filterUser = e.target.value; rerender();}
  main.querySelector("#fltItem").onchange = e => {filterItem = e.target.value; rerender();}
  main.querySelector("#fltCategory").onchange = e => {filterCategory = e.target.value; rerender();}
  main.querySelector("#fltSearch").oninput = e => {filterSearch = e.target.value; rerender();}*/

  /*main.querySelector("#clearFiltersBtn").onclick = () => {
    filterType = "day";
    filterDay = today.toISOString().slice(0,10);
    filterMonth = today.toISOString().slice(0,7);
    filterYear = String(today.getFullYear());
    rangeStart = today.toISOString().slice(0,10);
    rangeEnd = today.toISOString().slice(0,10);
    filterUser = "";
    filterItem = "";
    filterCategory = "";
    filterSearch = "";
    renderSalesSection(main);
	rerender();
  };*/

  rerender();
}

function updateChart(id, labels, data, label) {
  if (!window._charts) window._charts = {};
  const canvas = document.getElementById(id);
  if (!canvas) {
    console.warn("Chart canvas not found:", id);
    return;
  }

  if (window._charts[id]) {
    window._charts[id].destroy();
    delete window._charts[id];
  }

  const ctx = canvas.getContext('2d');
  window._charts[id] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: label,
        data: data,
        backgroundColor: '#43b5ffbb'
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

async function getNextReceiptNo() {
  const orders = await window.POSDatabase.getAll("orders");
  let maxNo = 0;
  orders.forEach(o => { if (o.receiptNo && Number(o.receiptNo) > maxNo) maxNo = Number(o.receiptNo); });
  return String(maxNo + 1).padStart(5, '0');
}

function showReceiptModal(order, menuItems, categories) {
  const modal = document.getElementById("receiptModal");
  // Corrected HTML generation for receipt modal to use CSS classes
  modal.innerHTML = `
    
    <div class="modal-content">
      <h3 style="margin-top:0;">Receipt #${order.receiptNo || order.id}</h3>
      <div>Date: ${new Date(order.ts).toLocaleString()}</div>
      <div>User: ${order.user}</div>
      <hr>
      <table style="width:100%;margin-bottom:1em;">
        <thead><tr><th>Item</th><th>Var/Mods</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
        <tbody>
          ${order.items.map(i => {
            const meta = menuItems.find(m => m.id === i.id) || {};
            return `<tr>
              <td>${i.name}</td>
              <td>
                ${i.variant ? i.variant.name : ""}
                ${i.modifiers && i.modifiers.length ? i.modifiers.map(m=>m.name).join(", ") : ""}
                <br><small>${(categories.find(c => c.id === meta.categoryId)||{}).name||"-"}</small>
              </td>
              <td>${i.qty}</td>
              <td>${i.price}</td>
              <td>${i.qty * i.price}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
      <div><strong>Total: ₹${order.total}</strong></div>
      <button onclick="window.print()">Print</button>
      <button id="closeReceiptModalBtn">Close</button>
    </div>
  `;
  modal.style.display = 'flex';
  document.getElementById("closeReceiptModalBtn").onclick = () => { modal.style.display = 'none'; 
  document.body.classList.remove('modal-open');
  };
 // modal.querySelector('.modal-backdrop').onclick = () => { modal.style.display = 'none'; };
  modal.onclick = (e) => {
        // Only close if the click was directly on the modal (backdrop area), not on its content
        if (e.target === modal) {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open'); // ADD THIS LINE
        }
    };
}

function showEditReceiptModal(order, menuItems, categories, onSave) {
  const modal = document.getElementById("receiptModal"); // Re-using receiptModal for simplicity in this example
  modal.innerHTML = `
    
    <div class="modal-content">
      <h3>Edit Receipt #${order.receiptNo || order.id}</h3>
      <div>Date: ${new Date(order.ts).toLocaleString()}</div>
      <form id="editReceiptForm">
        <table style="width:100%;margin-bottom:1em;">
          <thead><tr><th>Item</th><th>Qty</th><th>Remove</th></tr></thead>
          <tbody>
            ${order.items.map((i, idx) => `
              <tr>
                <td>${i.name}</td>
                <td><input type="number" name="qty${idx}" min="1" value="${i.qty}" style="width:4em;"></td>
                <td><input type="checkbox" name="rm${idx}"></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        <button type="submit">Save</button>
        <button type="button" id="cancelEditReceiptBtn">Cancel</button>
      </form>
    </div>
  `;
  modal.style.display = 'flex';
  
   document.body.classList.add('modal-open');

  modal.querySelector("#editReceiptForm").onsubmit = async function(e) {
    e.preventDefault();
    let newItems = [];
    let total = 0;
    order.items.forEach((item, idx) => {
      if (modal.querySelector(`[name="rm${idx}"]`).checked) return;
      let qty = parseInt(modal.querySelector(`[name="qty${idx}"]`).value, 10);
      if (isNaN(qty) || qty < 1) qty = 1;
      const newItem = {...item, qty};
      newItems.push(newItem);
      total += newItem.qty * newItem.price;
    });

    if (newItems.length === 0) {
      alert("Cannot save empty receipt.");
      return;
    }


    await onSave(newItems, total);
    modal.style.display = 'none';
	document.body.classList.remove('modal-open');
  };

  modal.querySelector("#cancelEditReceiptBtn").onclick = () => { modal.style.display = 'none'; };
  modal.onclick = (e) => {
      if (e.target === modal) {
          modal.style.display = 'none';
          document.body.classList.remove('modal-open');
      }
  };

}

// Initialize the app
window.addEventListener("DOMContentLoaded", render);