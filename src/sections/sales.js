// File: src/sections/sales.js

import { appState } from '../state/appState.js';
import { dataService } from '../services/dataService.js';

import { showReceiptModal, showEditReceiptModal } from '../ui/receiptModal.js';
import { genId } from '../utils/id.js';
import { updateChart } from '../utils/charts.js';


let orders = [];
let users = [];
let menuItems = []; // This will now hold full menu item objects, including variants and modifiers
let categories = [];

const today = new Date();

// Filter state
let filterType = "day";
let filterDay = today.toISOString().slice(0, 10);
let filterMonth = today.toISOString().slice(0, 7);
let filterYear = String(today.getFullYear());
let rangeStart = today.toISOString().slice(0, 10);
let rangeEnd = today.toISOString().slice(0, 10);
// Add new state variables for time
let rangeStartTime = ""; 
let rangeEndTime = "";

let filterUser = "";
let filterItem = ""; // This will now store the ITEM ID
let filterCategory = "";
let filterSearch = "";
// Updated filter states for variant and modifier to hold selected NAME
let filterVariant = "";
let filterModifier = "";

let sortOrder = "desc"; // Initial sort order: Newest First (descending date)
let filterShow = false;

export async function renderSalesSection(main) {
  // Use dataService to read data offline-first
  orders = await dataService.get("orders");
  users = await dataService.get("users");
  menuItems = await dataService.get("menuItems");
  categories = await dataService.get("categories");
// Enrich menuItems with variants and modifiers
const allVariants = await dataService.get("variants");
const allModifiers = await dataService.get("modifiers");
for (const item of menuItems) {
  item.variants = allVariants.filter(v => v.itemId === item.id);
  item.modifiers = allModifiers.filter(m => m.itemId === item.id);
}
// ✨ END OF ADDITION ✨
// Define exportToExcel inside renderSalesSection to ensure it has access to 'main'
function exportToExcel() {
  const filteredOrders = applyFilters();
  if (!filteredOrders || filteredOrders.length === 0) {
    showCustomAlert("No sales data to export for the current filters.");
    return;
  }

  // Sheet 1: Total Sales
  const totalSales = filteredOrders.reduce((s, o) => s + (o._filteredTotal ?? o.total ?? 0), 0);
  const totalSalesSheet = [
    ["Report Title", "Total Sales"],
    ["Total Sales", `₹${totalSales.toFixed(2)}`],
    ["Items Sold", filteredOrders.reduce((s, o) => s + (o._filteredItems ?? o.items)?.reduce((n, i) => n + i.qty, 0), 0)]
  ];
  const totalSalesWorksheet = XLSX.utils.aoa_to_sheet(totalSalesSheet);

  // Sheet 2: Summary of Items Sold
  const itemSummary = {};
  filteredOrders.forEach(order => {
    (order._filteredItems || order.items).forEach(item => {
      const itemKey = `${item.name}-${item.variant?.name || ''}-${(item.modifiers || []).map(m => m.name).sort().join(',')}`;
      if (!itemSummary[itemKey]) {
        itemSummary[itemKey] = {
          name: item.name,
          variant: item.variant?.name || '-',
          modifiers: (item.modifiers || []).map(m => m.name).join(', ') || '-',
          qty: 0,
          total: 0
        };
      }
      itemSummary[itemKey].qty += item.qty;
      itemSummary[itemKey].total += (item.qty * item.price);
    });
  });

  const itemSummaryData = Object.values(itemSummary).map(item => [
    item.name,
    item.variant,
    item.modifiers,
    item.qty,
    `₹${item.total.toFixed(2)}`
  ]);
  const itemSummaryHeaders = ["Item Name", "Variant", "Modifiers", "Quantity Sold", "Total Sale"];
  const itemSummarySheet = [itemSummaryHeaders, ...itemSummaryData];
  const itemSummaryWorksheet = XLSX.utils.aoa_to_sheet(itemSummarySheet);

  // Sheet 3: Sales by User
  const userSales = {};
  filteredOrders.forEach(order => {
    if (!userSales[order.user]) {
      userSales[order.user] = 0;
    }
    userSales[order.user] += (order._filteredTotal ?? order.total ?? 0);
  });

  const userSalesData = Object.entries(userSales).map(([user, total]) => [user, `₹${total.toFixed(2)}`]);
  const userSalesHeaders = ["User/Cash Register", "Total Sales"];
  const userSalesSheet = [userSalesHeaders, ...userSalesData];
  const userSalesWorksheet = XLSX.utils.aoa_to_sheet(userSalesSheet);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, totalSalesWorksheet, "Total Sales");
  XLSX.utils.book_append_sheet(wb, itemSummaryWorksheet, "Item Summary");
  XLSX.utils.book_append_sheet(wb, userSalesWorksheet, "Sales by User");

  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `sales-report-${dateStr}.xlsx`);
}


  main.innerHTML = `
    <h2>Sales/Reports</h2>
    <button id="exportBtn" type="button" class="btn btn-primary">Export to Excel</button>
    <div style="text-align: center; margin: 1em 0;">
      <button id="toggleFiltersBtn" type="button">${filterShow ? "Hide Filters" : "Show Filters"}</button>
    </div>

    <div id="salesFilters" class="${filterShow ? "" : "hidden"}" style="margin-bottom:1em;">
      <div class="sales-filters-grid">
        <div><label>Type</label><select id="fltType">
          <option value="day">Day</option>
          <option value="month">Month</option>
          <option value="year">Year</option>
          <option value="range">Custom</option>
        </select></div>
        <div><label>Day</label><input type="date" id="fltDay" value="${filterDay}"></div>
        <div><label>Month</label><input type="month" id="fltMonth" value="${filterMonth}"></div>
        <div><label>Year</label><input type="number" min="2000" max="2100" id="fltYear" value="${filterYear}"></div>
       
        <div><label>Start</label>
        <input type="date" id="fltStart" value="${rangeStart}">
                    <input type="time" id="fltStartTime" value="${rangeStartTime}"></div>
        <div><label>End</label><input type="date" id="fltEnd" value="${rangeEnd}">
        <input type="time" id="fltEndTime" value="${rangeEndTime}"></div>
        
        <div><label>User</label><select id="fltUser"><option value="">All</option>${users.map(u => `<option>${u.username}</option>`).join("")}</select></div>
        <div><label>Category</label><select id="fltCategory"><option value="">All</option>${categories.map(c => `<option value="${c.id}">${c.name}</option>`).join("")}</select></div>
        <div><label>Item</label><select id="fltItem"><option value="">All</option>${menuItems.map(i => `<option value="${i.id}">${i.name}</option>`).join("")}</select></div>
        <div><label>Variant</label><select id="fltVariant"><option value="">All</option></select></div>
        <div><label>Modifier</label><select id="fltModifier"><option value="">All</option></select></div>
        <div><label>Search</label><input type="text" id="fltSearch" value="${filterSearch}"></div>
      </div>
    </div>

    <div style="display:flex;gap:1em;flex-wrap:wrap">
      <canvas id="hourlySalesChart" height="160" style="flex:1;min-width:280px;"></canvas>
      <canvas id="dailySalesChart" height="160" style="flex:1;min-width:280px;"></canvas>
    </div>

    <div id="salesTableHolder"></div>
  `;

  attachFilterEvents(main);
  updateItemDropdown(main); // Initial population of item dropdown
  updateVariantAndModifierDropdowns(main); // Initial population of variant/modifier dropdowns
  rerender(main);
  main.querySelector("#exportBtn").onclick = () => exportToExcel();
}

// Helper function to render a single order row
function renderOrderRow(order) {
  const itemsHtml = (order._filteredItems || order.items || [])
    .map(item => {
      const menuItem = menuItems.find(mi => mi.id === item.id);
      const categoryName = categories.find(c => c.id === menuItem?.categoryId)?.name || "-";
      return `
        <span class="item-name">${item.name}</span>
        ${item.variant ? `<span class="item-variant">(${item.variant.name})</span>` : ''}
        ${item.modifiers && item.modifiers.length > 0 ? `<span class="item-modifiers">(${item.modifiers.map(m => m.name).join(', ')})</span>` : ''}
        <span class="item-qty">x${item.qty}</span>
        <span class="item-price">₹${item.price}</span>
        <span class="item-category">(${categoryName})</span><br>
      `;
    })
    .join('');

  const user = users.find(u => u.username === order.user); // Find user by username
  const userNameDisplay = user ? user.username : order.user; // Display username if found, else original string

  // Check if the current order is itself a return receipt (negative total)
  const isThisOrderAReturn = order.total < 0;

  // Check if there is ANY return receipt for this specific order's receipt number
  const hasAssociatedReturn = orders.some(o => o.negativeOf === order.receiptNo && o.id !== order.id);

  // Conditional rendering for buttons
  const showActionButtons = !isThisOrderAReturn && !hasAssociatedReturn &&
                            (appState.currentUser.role === "admin" || order.user === appState.currentUser.username);

  // Determine the content for the Receipt # column
  let receiptNumberContent;
  if (order.negativeOf) {
    receiptNumberContent = `↩️ ${order.receiptNo}<br><small>(Return for #${order.negativeOf})</small>`;
  } else if (hasAssociatedReturn) {
    // This is an original receipt that has a return associated with it
    const returnOrder = orders.find(o => o.negativeOf === order.receiptNo);
    receiptNumberContent = `${order.receiptNo}<br><small>(Returned by ${returnOrder.receiptNo})</small>`;
  } else {
    receiptNumberContent = order.receiptNo;
  }

  return `
  <tr class="${isThisOrderAReturn ? 'negative-receipt' : ''}">
  <td>${new Date(order.ts).toLocaleString()}</td>
  <td>${receiptNumberContent}</td>
  <td>${userNameDisplay}</td>
  <td>${itemsHtml}</td>
  <td class="${order.total < 0 ? 'negative-amount' : ''}">₹${Math.abs(order._filteredTotal ?? order.total)}</td>
  <td>
  <div class="action-buttons">
    <button class="btn viewReceiptBtn" data-id="${order.id}">View</button>
    ${showActionButtons ? `
      <button class="btn editReceiptBtn" data-id="${order.id}">Edit</button>
      <button class="btn deleteReceiptBtn" data-id="${order.id}">Delete</button>
      <button class="btn negativeReceiptBtn" data-id="${order.id}">Return</button>
    ` : ''}
  </div>
</td>
</tr>
  `;
}

// Main rerender function
async function rerender(main) {
  // ✨ ADDED: Fetch the latest orders from the database BEFORE applying filters ✨
  orders = await dataService.get("orders");

  const filtered = applyFilters(); // This function uses the sortOrder variable
  
    // NO LONGER FILTERING salesOrders separately here for modifier cost
    // as you want it to be a net calculation like total sales.
  
  // Calculate total modifier cost including returns (net calculation)
  let totalModifierCost = filtered.reduce((total, order) => {
   (order._filteredItems || order.items || []).forEach(item => {
   // The item.qty will be negative for return items,
  // so multiplying by modifier.price will correctly subtract the modifier cost.
 (item.modifiers || []).forEach(modifier => {
 total += modifier.price * item.qty;
 });
  });
  return total;
  }, 0);

  const html = `
    <table>
      <thead>
        <tr>
            <th>
                Date
                <button id="toggleSortBtn" class="sort-btn ${sortOrder === 'asc' ? 'active-asc' : 'active-desc'}">
                    <i class="fas ${sortOrder === 'asc' ? 'fa-sort-amount-up' : 'fa-sort-amount-down-alt'}"></i>
                </button>
            </th>
            <th>Receipt #</th>
            <th>User</th>
            <th>Items</th>
            <th>Total</th>
            <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${filtered.map(renderOrderRow).join("")}
      </tbody>
    </table>
    <div><strong>
      Total Sales: ₹${filtered.reduce((s, o) => s + (o._filteredTotal ?? o.total ?? 0), 0)}<br>
      Items Sold: ${filtered.reduce((s, o) => s + (o._filteredItems ?? o.items)?.reduce((n, i) => n + i.qty, 0), 0)}<br>
      Total Modifier Cost: ₹${totalModifierCost.toFixed(2)}
    </strong></div>
    
  `;

  // 💥 FIXED: Access the salesTableHolder using the `main` parameter
 main.querySelector("#salesTableHolder").innerHTML = DOMPurify.sanitize(html);

  main.querySelector('#toggleSortBtn').onclick = () => {
 sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
rerender(main);
 };

  bindReceiptButtons(filtered,main);
  renderCharts(filtered);
}

// Function to apply filters and sorting
function applyFilters() {
  let filteredOrders = [...orders]; // Start with a copy of all orders

  // Apply date filters
  const todayDate = new Date(filterDay);
  const startOfMonth = new Date(filterMonth + '-01');
  const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0); // Last day of month
  const startOfYear = new Date(filterYear + '-01-01');
  const endOfYear = new Date(filterYear + '-12-31');
  // AMENDED LOGIC FOR CUSTOM RANGE
  let customRangeStart, customRangeEnd;
  if (filterType === 'range') {
      const startTime = rangeStartTime || '00:00';
      const endTime = rangeEndTime || '23:59';
      customRangeStart = new Date(`${rangeStart}T${startTime}:00`);
      customRangeEnd = new Date(`${rangeEnd}T${endTime}:59`);
  }
  

  filteredOrders = filteredOrders.filter(order => {
    const orderDate = new Date(order.ts);
    
    switch (filterType) {
        case 'day':
            // Normalize orderDate to start of the day for comparison
            const normalizedOrderDate = new Date(order.ts);
            normalizedOrderDate.setHours(0, 0, 0, 0);
            return normalizedOrderDate.toDateString() === todayDate.toDateString();
        case 'month':
            // Normalize orderDate to start of the day for comparison
            const normalizedOrderDateForMonth = new Date(order.ts);
            normalizedOrderDateForMonth.setHours(0, 0, 0, 0);
            return normalizedOrderDateForMonth >= startOfMonth && normalizedOrderDateForMonth <= endOfMonth;
        case 'year':
            // Normalize orderDate to start of the day for comparison
            const normalizedOrderDateForYear = new Date(order.ts);
            normalizedOrderDateForYear.setHours(0, 0, 0, 0);
            return normalizedOrderDateForYear >= startOfYear && normalizedOrderDateForYear <= endOfYear;
        case 'range':
            // Use the combined date and time objects for accurate range filtering
            // We've already created these objects above, so we can use them directly.
            return orderDate >= customRangeStart && orderDate <= customRangeEnd;
        default:
            return true;
    }
});

  // Apply user filter
  if (filterUser) {
    filteredOrders = filteredOrders.filter(order => order.user === filterUser);
  }

  // Apply item/category/search/variant/modifier filters (more complex, requires iterating through items)
  if (filterItem || filterCategory || filterSearch || filterVariant || filterModifier) {
    filteredOrders = filteredOrders.map(order => {
      let matchedItems = [];
      let totalForMatchedItems = 0;

      order.items.forEach(item => {
        const menuItem = menuItems.find(mi => mi.id === item.id);
        const category = categories.find(cat => cat.id === menuItem?.categoryId);

        let itemMatches = true;
        const lowerCaseFilterSearch = filterSearch.toLowerCase();
        const lowerCaseFilterVariant = filterVariant.toLowerCase();
        const lowerCaseFilterModifier = filterModifier.toLowerCase();


        // Filter by specific item ID
        if (filterItem && item.id !== filterItem) { // Compare by ID, not name
          itemMatches = false;
        }

        // Filter by category
        // Only apply if filterItem is not set (category filter only applies when item isn't specifically chosen)
        // OR if filterItem IS set, ensure the item's category matches the filterCategory.
        if (filterCategory) {
            if (menuItem?.categoryId !== filterCategory) {
                itemMatches = false;
            }
        }


        // NEW: Filter by variant name
        if (filterVariant) {
            if (!item.variant || item.variant.name.toLowerCase() !== lowerCaseFilterVariant) {
                itemMatches = false;
            }
        }

        // NEW: Filter by modifier name
        if (filterModifier) {
            const hasModifierMatch = (item.modifiers || []).some(
                m => m.name.toLowerCase() === lowerCaseFilterModifier
            );
            if (!hasModifierMatch) {
                itemMatches = false;
            }
        }

        // Filter by general search term (applies to item name, variant, modifiers, category name)
        // This is a broader search, so it should be less strict than the specific dropdowns
        if (filterSearch) {
          const itemText = [
            item.name,
            item.variant?.name,
            ...(item.modifiers || []).map(m => m.name),
            category?.name
          ].join(' ').toLowerCase();

          if (!itemText.includes(lowerCaseFilterSearch)) {
            itemMatches = false;
          }
        }

        if (itemMatches) {
          matchedItems.push(item);
          totalForMatchedItems += item.qty * item.price;
        }
      });

      // If no items match the item/category/search/variant/modifier filters, the order itself doesn't match
      if (matchedItems.length === 0 && (filterItem || filterCategory || filterSearch || filterVariant || filterModifier)) {
        return null; // Mark order for removal
      }

      // Return a new order object with filtered items and total
      return {
        ...order,
        _filteredItems: matchedItems.length > 0 ? matchedItems : order.items, // Keep original if no filter applied
        _filteredTotal: matchedItems.length > 0 ? totalForMatchedItems : order.total
      };
    }).filter(Boolean); // Remove null entries
  }

  // Apply sorting based on 'sortOrder'
  filteredOrders.sort((a, b) => {
    const dateA = new Date(a.ts).getTime();
    const dateB = new Date(b.ts).getTime();
    if (sortOrder === 'asc') {
      return dateA - dateB;
    } else {
      return dateB - dateA;
    }
  });

  return filteredOrders;
}

// Function to attach event listeners for filters
function attachFilterEvents(main) {
  const $ = (id) => main.querySelector(id);

  $("#toggleFiltersBtn").onclick = () => {
    filterShow = !filterShow;
    $("#salesFilters").classList.toggle("hidden", !filterShow);
    $("#toggleFiltersBtn").textContent = filterShow ? "Hide Filters" : "Show Filters";
    if (!filterShow) {
      clearFilters(main); // Clear filters if hiding
    } else {
      // ✨ ADDED LINE: Call this to set the correct state when filters are shown ✨
      updateDateInputsState(main, filterType);
    }
  };

  // Main listener for the date type dropdown
  $("#fltType").onchange = (e) => {
    filterType = e.target.value;
    // Call a new function to manage the state of the date inputs
    updateDateInputsState(main, filterType);
    rerender(main);
  };

  // Existing listeners for individual date inputs
  $("#fltDay").onchange = (e) => {
    filterDay = e.target.value;
    filterType = 'day';
    $("#fltType").value = 'day';
    updateDateInputsState(main, filterType);
    rerender(main);
  };
  $("#fltMonth").onchange = (e) => {
    filterMonth = e.target.value;
    filterType = 'month';
    $("#fltType").value = 'month';
    updateDateInputsState(main, filterType);
    rerender(main);
  };
  $("#fltYear").onchange = (e) => {
    filterYear = e.target.value;
    filterType = 'year';
    $("#fltType").value = 'year';
    updateDateInputsState(main, filterType);
    rerender(main);
  };
  $("#fltStart").onchange = (e) => {
    rangeStart = e.target.value;
    filterType = 'range';
    $("#fltType").value = 'range';
    updateDateInputsState(main, filterType);
    rerender(main);
  };
  $("#fltEnd").onchange = (e) => {
    rangeEnd = e.target.value;
    filterType = 'range';
    $("#fltType").value = 'range';
    updateDateInputsState(main, filterType);
    rerender(main);
  };

  // Add listeners for the new time inputs
$("#fltStartTime").onchange = (e) => {
  rangeStartTime = e.target.value;
  filterType = 'range';
  $("#fltType").value = 'range';
  updateDateInputsState(main, filterType);
  rerender(main);
};
$("#fltEndTime").onchange = (e) => {
  rangeEndTime = e.target.value;
  filterType = 'range';
  $("#fltType").value = 'range';
  updateDateInputsState(main, filterType);
  rerender(main);
};
  
  $("#fltUser").onchange = (e) => { filterUser = e.target.value; rerender(main); };
  $("#fltCategory").onchange = (e) => {
    filterCategory = e.target.value;
    filterItem = "";
    filterVariant = "";
    filterModifier = "";
    updateItemDropdown(main);
    updateVariantAndModifierDropdowns(main);
    rerender(main);
  };
  $("#fltItem").onchange = (e) => {
    filterItem = e.target.value;
    filterVariant = "";
    filterModifier = "";
    updateVariantAndModifierDropdowns(main);
    rerender(main);
  };
  $("#fltVariant").onchange = (e) => { filterVariant = e.target.value; rerender(main); };
  $("#fltModifier").onchange = (e) => { filterModifier = e.target.value; rerender(main); };
  $("#fltSearch").oninput = (e) => { filterSearch = e.target.value.trim(); rerender(main); };
}

// New function to handle the state of date input fields
function updateDateInputsState(main, filterType) {
  const $ = (id) => main.querySelector(id);
  const dayInput = $("#fltDay");
  const monthInput = $("#fltMonth");
  const yearInput = $("#fltYear");
  const rangeStartInput = $("#fltStart");
  const rangeEndInput = $("#fltEnd");
// Get the new time input elements
 const rangeStartTimeInput = $("#fltStartTime");
 const rangeEndTimeInput = $("#fltEndTime");
// Disable all date and time inputs first
dayInput.disabled = true;
monthInput.disabled = true;
yearInput.disabled = true;
rangeStartInput.disabled = true;
rangeEndInput.disabled = true;
rangeStartTimeInput.disabled = true;
rangeEndTimeInput.disabled = true;

 
  // Then, enable only the one(s) that are relevant
  switch (filterType) {
    case 'day':
      dayInput.disabled = false;
      break;
    case 'month':
      monthInput.disabled = false;
      break;
    case 'year':
      yearInput.disabled = false;
      break;
    case 'range':
      rangeStartInput.disabled = false;
      rangeEndInput.disabled = false;
      rangeStartTimeInput.disabled = false;
      rangeEndTimeInput.disabled = false;
      break;
    // Default case for 'all' or any other types, all remain disabled
    default:
      break;
  }
}

function clearFilters(main) {
  filterType = "day";
  filterDay = today.toISOString().slice(0, 10);
  filterMonth = today.toISOString().slice(0, 7);
  filterYear = String(today.getFullYear());
  rangeStart = filterDay;
  rangeEnd = filterDay;
  filterUser = "";
  filterItem = "";
  filterCategory = "";
  filterSearch = "";
  filterVariant = ""; // Clear variant filter
  filterModifier = ""; // Clear modifier filter

  // sortOrder remains as is, controlled by sort buttons

  const $ = (id) => main.querySelector(id);
  $("#fltType").value = filterType;
  $("#fltDay").value = filterDay;
  $("#fltMonth").value = filterMonth;
  $("#fltYear").value = filterYear;
  $("#fltStart").value = rangeStart;
  $("#fltEnd").value = rangeEnd;
  $("#fltUser").value = "";
  $("#fltItem").value = "";
  $("#fltCategory").value = "";
  $("#fltSearch").value = "";
  $("#fltVariant").value = ""; // Reset variant dropdown
  $("#fltModifier").value = ""; // Reset modifier dropdown

  updateItemDropdown(main); // Also clear and re-populate item dropdown
  updateVariantAndModifierDropdowns(main); // Reset V/M dropdowns as well
// ✨ ADDED LINE: Set the correct disabled state after clearing ✨
updateDateInputsState(main, filterType);
 // ✨ ADDED: Trigger a re-render to update the sales table ✨
 rerender(main);
}

function updateItemDropdown(main) {
  const fltItemSelect = main.querySelector("#fltItem");
  let itemsToShow = menuItems;

  if (filterCategory) {
    itemsToShow = menuItems.filter(item => item.categoryId === filterCategory);
  }

  // Populate item dropdown with values (item.id) and text (item.name)
  fltItemSelect.innerHTML = `<option value="">All</option>${itemsToShow.map(i => `<option value="${i.id}">${i.name}</option>`).join("")}`;

  // If the previously selected item ID is no longer in the list, or if 'All' category is selected, clear item filter.
  if (filterItem && !itemsToShow.some(item => item.id === filterItem)) {
    filterItem = "";
  }
  fltItemSelect.value = filterItem; // Set the selected value after population
}

function updateVariantAndModifierDropdowns(main) {
    const $ = (id) => main.querySelector(id);
    const fltVariantSelect = $("#fltVariant");
    const fltModifierSelect = $("#fltModifier");

    fltVariantSelect.innerHTML = `<option value="">All</option>`;
    fltModifierSelect.innerHTML = `<option value="">All</option>`;

    if (filterItem) {
        const selectedItem = menuItems.find(item => item.id === filterItem);
        if (selectedItem) {
            // Populate Variants
            if (selectedItem.variants && selectedItem.variants.length > 0) {
                fltVariantSelect.innerHTML += selectedItem.variants
                    .map(v => `<option value="${v.name}">${v.name}</option>`)
                    .join("");
            }

            // Populate Modifiers
            if (selectedItem.modifiers && selectedItem.modifiers.length > 0) {
                fltModifierSelect.innerHTML += selectedItem.modifiers
                    .map(m => `<option value="${m.name}">${m.name}</option>`)
                    .join("");
            }
        }
    }

    // Retain selected values if they are still valid, otherwise reset
    if (filterVariant && !Array.from(fltVariantSelect.options).some(opt => opt.value === filterVariant)) {
        filterVariant = "";
    }
    fltVariantSelect.value = filterVariant;

    if (filterModifier && !Array.from(fltModifierSelect.options).some(opt => opt.value === filterModifier)) {
        filterModifier = "";
    }
    fltModifierSelect.value = filterModifier;
}


// Placeholder for renderCharts
function renderCharts(filtered) {
    const hours = Array(24).fill(0);
    const chartDay = filterType === "day" ? filterDay : today.toISOString().slice(0,10);
    filtered.forEach(o => {
        const d = new Date(o.ts);
        if (d.toISOString().slice(0,10) === chartDay) {
            hours[d.getHours()] += o.total || 0;
        }
    });

    const chartMonth = filterType === "month" ? filterMonth : today.toISOString().slice(0,7);
    const [year, mon] = chartMonth.split("-");
    const daysInMonth = new Date(+year, +mon, 0).getDate();
    const daily = Array(daysInMonth).fill(0);
    filtered.forEach(o => {
        const d = new Date(o.ts);
        if (d.getFullYear() == year && d.getMonth() + 1 == +mon) {
            daily[d.getDate()-1] += o.total || 0;
        }
    });

    updateChart("hourlySalesChart", Array.from({length: 24}, (_, i) => `${i}:00`), hours, "Hourly Sales");
    updateChart("dailySalesChart", Array.from({length: daysInMonth}, (_, i) => `${i+1}`), daily, "Daily Sales");
}

// Placeholder for bindReceiptButtons
function bindReceiptButtons(filtered,main) {
    //const mainContent = document.getElementById("mainContent"); // Get a reference to mainContent

    document.querySelectorAll(".viewReceiptBtn").forEach(btn => {
        const order = filtered.find(o => o.id === btn.dataset.id);
        btn.onclick = () => showReceiptModal(order, menuItems, categories);
    });

    document.querySelectorAll(".editReceiptBtn").forEach(btn => {
        const order = filtered.find(o => o.id === btn.dataset.id);
        if (order) { // Ensure order exists before binding
            btn.onclick = () => {
                showEditReceiptModal(order, menuItems, categories, async (items, total) => {
                    order.items = items;
                    order.total = total;
                    await dataService.put("orders", order);
                    rerender(main); // Use mainContent reference
                });
            };
        }
    });

    document.querySelectorAll(".deleteReceiptBtn").forEach(btn => {
        const order = filtered.find(o => o.id === btn.dataset.id);
        if (order) { // Ensure order exists before binding
            btn.onclick = async () => {
                const confirmDelete = await showCustomConfirm(`Delete receipt #${order.receiptNo}?`);
                if (confirmDelete) {
                  await dataService.delete("orders", order.id);
                  orders = await dataService.get("orders");
                    rerender(main); // Use mainContent reference
                }
            };
        }
    });

    document.querySelectorAll(".negativeReceiptBtn").forEach(btn => {
        const order = filtered.find(o => o.id === btn.dataset.id);
        if (order) { // Ensure order exists before binding
            btn.onclick = async () => {
                const exists = orders.some(o => o.negativeOf === order.receiptNo);
                if (exists) {
                    showCustomAlert("Return already exists for this receipt.");
                    return;
                }
                const orderDate = new Date(order.ts).toISOString().slice(0, 10);
                const todayDate = today.toISOString().slice(0, 10);

                if (orderDate !== todayDate) {
                    showCustomAlert("Return receipts can only be created for receipts generated today.");
                    return;
                }

                const confirmReturn = await showCustomConfirm(`Create return for #${order.receiptNo}?`);
                if (!confirmReturn) return;

                const receiptNo = await getNextReceiptNo();
                await dataService.put("orders", {
                    id: genId("order"),
                    receiptNo,
                    items: order.items.map(i => ({ ...i, qty: -Math.abs(i.qty) })),
                    total: -Math.abs(order.total),
                    ts: Date.now(),
                    user: appState.currentUser.username,
                    negativeOf: order.receiptNo
                });
                orders = await dataService.get("orders");
                rerender(main); // Use mainContent reference
            };
        }
    });
}

// You'll need to make sure appState is imported wherever this function resides.
// For example, if this function is in a 'utils' file, you might need:
// import { appState } from '../state/appState.js';
// import { POSDatabase } from '../db/posDatabase.js'; // This is already there



export async function getNextReceiptNo() {
    // 1. Get the current user's cashRegisterId from appState
    const currentCashRegisterId = appState.currentUser?.cashRegisterId;

    // Handle cases where the cashRegisterId might not be available (e.g., user not logged in, or ID not assigned)
    if (!currentCashRegisterId) {
        console.error("Error: Current user's cashRegisterId is not available. Cannot generate receipt number.");
        // You might want to throw an error, return a default/fallback, or redirect to login.
        // For now, we'll return a placeholder to indicate the error.
        return "ERROR-NO-REGISTER-ID";
    }

    const allOrders = await dataService.get("orders");

    // 2. Filter orders to only include those that belong to the current cashRegisterId
    const relevantOrders = allOrders.filter(order => {
        // Ensure order.receiptNo exists and starts with the currentCashRegisterId prefix
        return order.receiptNo && order.receiptNo.startsWith(`${currentCashRegisterId}-`);
    });

    // 3. Find the maximum sequential number from the relevant orders
    const maxSuffixNumber = relevantOrders.reduce((max, order) => {
        // Example receiptNo: "EPOS-ABCD-0005"
        // We need to extract "0005" from it
        const receiptParts = order.receiptNo.split('-');
        if (receiptParts.length > 2) {
            // The numeric part is the last element
            const suffixStr = receiptParts[receiptParts.length - 1];
            const suffixNum = parseInt(suffixStr, 10); // Parse as base 10
            if (!isNaN(suffixNum)) {
                return Math.max(max, suffixNum);
            }
        }
        return max; // Return current max if suffix can't be parsed
    }, 0);

    // 4. Format the new receipt number
    const nextSuffix = String(maxSuffixNumber + 1).padStart(4, "0");
    return `${currentCashRegisterId}-${nextSuffix}`;
}

// Example usage (assuming appState.currentUser.cashRegisterId is set after login)
// In your order processing logic, you would call:
// const newReceiptNumber = await getNextReceiptNo();
//console.log(newReceiptNumber); // e.g., "EPOS-ABCD-0001" or "EPOS-ABCD-0006"

// Custom Alert/Confirm Modals (to replace native alert/confirm)
function showCustomAlert(message) {
    return new Promise(resolve => {
        const modalHtml = `
            <div id="customAlertDialog" class="modal">
                <div class="modal-content">
                    <h3>Alert</h3>
                    <p>${message}</p>
                    <div class="modal-actions">
                        <button class="btn btn-primary" id="alertDialogOk">OK</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = document.getElementById('customAlertDialog');
        const okBtn = document.getElementById('alertDialogOk');

        modal.style.display = 'flex'; // Show the modal
        document.body.classList.add('modal-open'); // Prevent scrolling

        okBtn.onclick = () => {
            modal.remove();
            document.body.classList.remove('modal-open');
            resolve();
        };
    });
}

function showCustomConfirm(message) {
    return new Promise(resolve => {
        const modalHtml = `
            <div id="customConfirmDialog" class="modal">
                <div class="modal-content">
                    <h3>Confirm</h3>
                    <p>${message}</p>
                    <div class="modal-actions">
                        <button class="btn btn-secondary" id="confirmDialogCancel">Cancel</button>
                        <button class="btn btn-primary" id="confirmDialogOk">OK</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = document.getElementById('customConfirmDialog');
        const okBtn = document.getElementById('confirmDialogOk');
        const cancelBtn = document.getElementById('confirmDialogCancel');

        modal.style.display = 'flex'; // Show the modal
        document.body.classList.add('modal-open'); // Prevent scrolling

        okBtn.onclick = () => {
            modal.remove();
            document.body.classList.remove('modal-open');
            resolve(true);
        };

        cancelBtn.onclick = () => {
            modal.remove();
            document.body.classList.remove('modal-open');
            resolve(false);
        };
    });
}
