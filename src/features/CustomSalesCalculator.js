// File: src/features/CustomSalesCalculator.js
import { openOrderModal, closeOrderModal } from '../ui/modals.js';

/**
 * Renders and manages a modal for adding a custom sales item.
 * This function handles all UI creation, event listeners, and data processing
 * for the custom item flow.
 *
 * @param {function} onAddItem A callback function to execute with the new custom item.
 */
export function showCustomSalesCalculatorModal(onAddItem) {
    const modal = document.getElementById('orderModal');
    if (!modal) {
        console.error("showCustomSalesCalculatorModal: 'orderModal' element not found.");
        return;
    }

    // Modal HTML structure using the same classes as the order modal
    modal.innerHTML = `
    <div class="modal-content card">
        <form id="custom-sale-form" class="order-config-form">
            <div class="item-details-header">
                <h3>Custom Item Details</h3>
            </div>
            <div class="order-config-row">
                <label for="custom-item-name">Description:</label>
                <input type="text" id="custom-item-name" placeholder="E.g., Special Lassi, Custom Combo" required>
            </div>
            <div class="order-config-row">
                <label for="custom-item-price">Price (₹):</label>
                <input type="number" id="custom-item-price" step="0.01" min="0" required inputmode="numeric">
            </div>
            <div class="order-config-row">
                <label for="custom-item-quantity">Quantity:</label>
                <input type="number" id="custom-item-quantity" min="1" value="1" required inputmode="numeric">
            </div>
            <div class="order-config-row total-display">
                <label>Subtotal (₹):</label>
                <span id="custom-item-subtotal">0.00</span>
            </div>
            <div class="order-config-actions">
                <button type="submit" class="btn btn-primary">Add to Order</button>
                <button type="button" id="cancelBtn" class="btn btn-secondary">Cancel</button>
            </div>
        </form>
    </div>
    `;

    const form = modal.querySelector('#custom-sale-form');
    const priceInput = modal.querySelector('#custom-item-price');
    const quantityInput = modal.querySelector('#custom-item-quantity');
    const subtotalSpan = modal.querySelector('#custom-item-subtotal');
    const cancelBtn = modal.querySelector('#cancelBtn');

    // Update subtotal as user types
    const updateSubtotal = () => {
        const price = parseFloat(priceInput.value) || 0;
        const quantity = parseInt(quantityInput.value) || 0;
        const subtotal = price * quantity;
        subtotalSpan.textContent = subtotal.toFixed(2);
    };

    priceInput.addEventListener('input', updateSubtotal);
    quantityInput.addEventListener('input', updateSubtotal);

    // Event listeners to close the modal
    cancelBtn.addEventListener('click', closeOrderModal);

    // Handle form submission
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const name = modal.querySelector('#custom-item-name').value.trim();
        const price = parseFloat(priceInput.value);
        const quantity = parseInt(quantityInput.value);

        if (name && price > 0 && quantity > 0) {
            const newItem = {
                id: null, // Custom items don't have a menu ID
                name: name,
                price: price,
                qty: quantity,
                finalPrice: price * quantity,
                isCustom: true
            };
            onAddItem(newItem);
            closeOrderModal();
        } else {
            console.error('Please enter a valid description, price, and quantity.');
        }
    });

    // Set initial focus and show the modal
    requestAnimationFrame(() => {
        modal.querySelector('#custom-item-name').focus();
    });

    // Call the shared function to open the modal
    openOrderModal();
}

