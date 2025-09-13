// File: src/ui/receiptmodal.js

// This file handles the display and interaction for the receipt and edit receipt modals.
// It includes logic for generating and printing PDF receipts.

// NOTE: The utility functions showError, hideError, and showCustomAlert are included here
// to make this file self-contained for the canvas environment. In a production app,
// these would be imported from a separate dom.js utility file.

/**
 * Displays an error message in a specific DOM element for a short duration.
 * @param {string} elementId - The ID of the HTML element to display the error in.
 * @param {string} message - The error message to display.
 */
 function showError(elementId, message) {
    const el = document.getElementById(elementId);
    if (!el) {
        console.error(`Error element with ID "${elementId}" not found.`);
        return;
    }
    el.textContent = message;
    el.classList.remove("hidden");

    // Clear any existing timeout to prevent conflicts if showError is called rapidly
    if (el._errorTimeout) {
        clearTimeout(el._errorTimeout);
    }

    el._errorTimeout = setTimeout(() => {
        el.classList.add("hidden");
        el.textContent = '';
        delete el._errorTimeout;
    }, 4000);
}

/**
 * Hides an error message in a specific DOM element.
 * @param {string} elementId - The ID of the HTML element to hide the error from.
 */
function hideError(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
        if (el._errorTimeout) {
            clearTimeout(el._errorTimeout);
            delete el._errorTimeout;
        }
        el.classList.add("hidden");
        el.textContent = '';
    }
}

/**
 * Displays a custom alert message as a floating notification.
 * @param {string} message - The message to display in the alert.
 * @param {string} [type='info'] - The type of alert ('info', 'success', 'error', 'warning'). Affects styling.
 * @param {number} [duration=3000] - How long the alert should be visible in milliseconds.
 */
function showCustomAlert(message, type = 'info', duration = 3000) {
    let alertContainer = document.getElementById('customAlertContainer');

    if (!alertContainer) {
        const newContainer = document.createElement('div');
        newContainer.id = 'customAlertContainer';
        newContainer.style.position = 'fixed';
        newContainer.style.top = '20px';
        newContainer.style.right = '20px';
        newContainer.style.zIndex = '1000';
        newContainer.style.display = 'flex';
        newContainer.style.flexDirection = 'column';
        newContainer.style.alignItems = 'flex-end';
        document.body.appendChild(newContainer);
        alertContainer = newContainer;
    }

    const alertBox = document.createElement('div');
    alertBox.className = `custom-alert custom-alert-${type}`;
    alertBox.textContent = message;

    alertBox.style.padding = '10px 20px';
    alertBox.style.borderRadius = '5px';
    alertBox.style.color = 'white';
    alertBox.style.marginBottom = '10px';
    alertBox.style.opacity = '0';
    alertBox.style.transition = 'opacity 0.5s ease-in-out, transform 0.3s ease-out';
    alertBox.style.transform = 'translateX(100%)';

    if (type === 'info') {
        alertBox.style.backgroundColor = '#2196F3';
    } else if (type === 'success') {
        alertBox.style.backgroundColor = '#4CAF50';
    } else if (type === 'error') {
        alertBox.style.backgroundColor = '#f44336';
    } else if (type === 'warning') {
        alertBox.style.backgroundColor = '#ff9800';
    }

    alertContainer.appendChild(alertBox);

    setTimeout(() => {
        alertBox.style.opacity = '1';
        alertBox.style.transform = 'translateX(0)';
    }, 10);

    setTimeout(() => {
        alertBox.style.opacity = '0';
        alertBox.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (alertBox.parentNode === alertContainer) {
                alertContainer.removeChild(alertBox);
            }
            if (alertContainer.children.length === 0 && alertContainer.id === 'customAlertContainer' && alertContainer.parentNode) {
                alertContainer.parentNode.removeChild(alertContainer);
            }
        }, 500);
    }, duration);
}

// Placeholder functions for modals.js imports
// This is to make the code runnable in the canvas environment without the full app context.
function closeOrderModal() {}
function openOrderModal() {}

// Closes the receipt modal and clears its content.
function closeReceiptModal() {
    const modal = document.getElementById("receiptModal");
    if (modal) {
      modal.style.display = 'none';
      document.body.classList.remove('modal-open');
      modal.innerHTML = '';
    }
}


export function showReceiptModal(order, menuItems, categories) {
    const modal = document.getElementById("receiptModal");
    if (!modal) {
        console.error("Receipt modal container not found.");
        return;
    }

    modal.innerHTML = `
        <div class="modal-content">
            <h3 style="margin-top:0;">Receipt #${order.receiptNo || order.id}</h3>
            <div>Date: ${new Date(order.ts).toLocaleString()}</div>
            <div>User: ${order.user}</div>
            <hr>
            <div class="receipt-table-wrapper" id="printableReceiptContent">
                <table>
                    <thead><tr><th>Item</th><th>Var/Mods</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
                    <tbody>
                        ${order.items.map(i => {
                            const meta = menuItems.find(m => m.id === i.id) || {};
                            const unitPrice = i.price;
                            const totalPrice = i.qty * i.price;
                            return `<tr>
                                <td>${i.name}</td>
                                <td>
                                    ${i.variant?.name || ""}
                                    ${i.modifiers?.map(m => m.name).join(", ") || ""}
                                </td>
                                <td>${i.qty}</td>
                                <td>₹${unitPrice}</td>
                                <td>₹${totalPrice}</td>
                            </tr>`;
                        }).join("")}
                    </tbody>
                </table>
            </div>
            <div><strong>Total: ₹${order.total}</strong></div>
            <div class="modal-actions">
                <button onclick="window.print()" class="btn btn-primary">🖨️ Print Receipt</button>
                <button id="printA4PdfBtn" class="btn btn-secondary">📄 Print A4 PDF</button>
                <button id="closeReceiptModalBtn" class="btn btn-secondary">✖️ Close</button>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
    document.body.classList.add('modal-open');

    modal.onclick = (e) => {
        if (e.target === modal) closeReceiptModal();
    };

    document.getElementById("closeReceiptModalBtn").onclick = closeReceiptModal;

    document.getElementById("printA4PdfBtn").onclick = () => {
        generateA4ReceiptPdf(order, menuItems, categories);
    };
}


export function showEditReceiptModal(order, menuItems, categories, onSave) {
    const modal = document.getElementById("receiptModal");
    if (!modal) {
        console.error("Receipt modal container not found.");
        return;
    }

    modal.innerHTML = `
        <div class="modal-content">
            <h3>Edit Receipt #${order.receiptNo || order.id}</h3>
            <div>Date: ${new Date(order.ts).toLocaleString()}</div>
            
            <div class="modal-body-content"> 
                <table style="width:100%;margin-bottom:1em;">
                    <thead><tr><th>Item</th><th>Qty</th><th>Remove</th></tr></thead>
                    <tbody>
                        ${order.items.map((i, idx) => `
                            <tr>
                                <td>${i.name}</td>
                                <td><input type="number" name="qty${idx}" min="1" value="${i.qty}" style="width:4em;" onfocus="this.select()" inputmode="numeric"></td>
                                <td><input type="checkbox" name="rm${idx}"></td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
                <form id="editReceiptForm">
                    <button type="submit" class="btn btn-primary">Save</button>
                    <button type="button" id="cancelEditReceiptBtn" class="btn btn-secondary">Cancel</button>
                </form>
            </div> 
            <div id="editReceiptError" class="error-message hidden"></div>
        </div>
    `;

    modal.style.display = 'flex';
    document.body.classList.add('modal-open');

    modal.onclick = (e) => {
        if (e.target === modal) closeReceiptModal();
    };

    modal.querySelector("#cancelEditReceiptBtn").onclick = closeReceiptModal;

    modal.querySelector("#editReceiptForm").onsubmit = async function (e) {
        e.preventDefault();
        hideError("editReceiptError");

        const newItems = [];
        let total = 0;

        order.items.forEach((item, idx) => {
            const remove = modal.querySelector(`[name="rm${idx}"]`).checked;
            if (remove) return;

            let qty = parseInt(modal.querySelector(`[name="qty${idx}"]`).value, 10);
            if (isNaN(qty) || qty < 1) qty = 1;

            const updatedItem = { ...item, qty };
            newItems.push(updatedItem);
            total += qty * item.price;
        });

        if (!newItems.length) {
            showError("editReceiptError", "Cannot save an empty receipt. Please keep at least one item.");
            return;
        }

        await onSave(newItems, total);
        closeReceiptModal();
        showCustomAlert("Receipt updated successfully!", "success");
    };
}

// Function to generate A4 PDF receipt
async function generateA4ReceiptPdf(order, menuItems, categories) {
    const { jsPDF } = window.jspdf;
    const html2canvas = window.html2canvas;
    
    if (!jsPDF || !html2canvas) {
        showCustomAlert("PDF generation libraries not loaded. Please check your HTML file.", "error");
        return;
    }
    
    const pdf = new jsPDF('p', 'mm', 'a4');

    const receiptContentHtml = `
    <div style="padding: 20mm; font-family: 'Noto Sans', 'Arial', sans-serif; font-size: 12pt; color: #333;">
    <h1 style="text-align: center; color: #1560ff; margin-bottom: 20px;">Invoice / Receipt</h1>
    <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
        <div>
            <strong>Receipt #:</strong> ${order.receiptNo || order.id}<br>
            <strong>Date:</strong> ${new Date(order.ts).toLocaleString()}<br>
            <strong>User:</strong> ${order.user}
        </div>
        <div>
            <strong>POS App</strong><br>
            Jassi Di Lassi<br>
            Jabalpur<br>
            +9540081776
        </div>
    </div>
    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
            <tr style="background-color: #f0f0f0;">
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Item</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Variant/Modifiers</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Qty</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Price</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">Total</th>
            </tr>
        </thead>
        <tbody>
            ${order.items.map(i => {
                const meta = menuItems.find(m => m.id === i.id) || {};
                return `<tr>
                    <td style="padding: 8px; border: 1px solid #ddd;">${i.name}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">
                        ${i.variant?.name || ""}
                        ${i.modifiers?.map(m => m.name).join(", ") || ""}
                        <br><small style="color: #666;">Cat: ${(categories.find(c => c.id === meta.categoryId) || {}).name || "-"}</small>
                    </td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${i.qty}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">₹${i.price}</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">₹${i.qty * i.price}</td>
                </tr>`;
            }).join("")}
        </tbody>
    </table>
    <div style="text-align: right; font-size: 14pt; font-weight: bold; margin-top: 20px;">
        Total: ₹${order.total}
    </div>
    <p style="text-align: center; margin-top: 30px; font-size: 10pt; color: #666;">Thank you for your business!</p>
    </div>
    `;

    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.width = '210mm';
    tempDiv.innerHTML = receiptContentHtml;
    document.body.appendChild(tempDiv);

    try {
        const canvas = await html2canvas(tempDiv, {
            scale: 2,
            useCORS: true,
            logging: false
        });

        document.body.removeChild(tempDiv);

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 210;
        const pageHeight = 297;
        const imgHeight = canvas.height * imgWidth / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        pdf.save(`Receipt_${order.receiptNo || order.id}_A4.pdf`);
    } catch (error) {
        document.body.removeChild(tempDiv);
        console.error("Failed to generate PDF:", error);
        showCustomAlert("Failed to generate PDF. Please try again.", "error");
    }
}
