// File: src/ui/receiptmodal.js


export function showReceiptModal(order, menuItems, categories) {
    const modal = document.getElementById("receiptModal");

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
                            return `<tr>
                                <td>${i.name}</td>
                                <td>
                                    ${i.variant?.name || ""}
                                    ${i.modifiers?.map(m => m.name).join(", ") || ""}
                                    <br><small>${(categories.find(c => c.id === meta.categoryId) || {}).name || "-"}</small>
                                </td>
                                <td>${i.qty}</td>
                                <td>${i.qty * i.price}</td>
                                <td>${i.qty * i.price}</td>
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

    // New: Event listener for A4 PDF button
    document.getElementById("printA4PdfBtn").onclick = () => {
        generateA4ReceiptPdf(order, menuItems, categories);
    };
}

export function showEditReceiptModal(order, menuItems, categories, onSave) {
    // ... (This function remains unchanged from your provided code) ...
    const modal = document.getElementById("receiptModal");

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

    modal.onclick = (e) => {
        if (e.target === modal) closeReceiptModal();
    };

    modal.querySelector("#cancelEditReceiptBtn").onclick = closeReceiptModal;

    modal.querySelector("#editReceiptForm").onsubmit = async function (e) {
        e.preventDefault();
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
            alert("Cannot save empty receipt.");
            return;
        }

        await onSave(newItems, total);
        closeReceiptModal();
    };
}

function closeReceiptModal() {
    const modal = document.getElementById("receiptModal");
    modal.style.display = 'none';
    document.body.classList.remove('modal-open');
    // Important: Clear the modal's content after closing to prevent stale data
    modal.innerHTML = '';
}

// Function to generate A4 PDF receipt
// Function to generate A4 PDF receipt
async function generateA4ReceiptPdf(order, menuItems, categories) {
    // Access jsPDF and html2canvas from the global window object
    // For jsPDF, the global object created by the UMD build is often `window.jspdf.jsPDF`
    // For html2canvas, it's usually just `window.html2canvas`
    const { jsPDF } = window.jspdf; // This line now correctly gets jsPDF from the global
    const html2canvas = window.html2canvas; // This line now correctly gets html2canvas from the global

    const pdf = new jsPDF('p', 'mm', 'a4'); // 'p' for portrait, 'mm' for millimeters, 'a4' for A4 size

    // ... (rest of your generateA4ReceiptPdf function remains the same) ...
    // Construct the HTML content specifically for A4 PDF
    // This should be a more spaced-out, possibly more detailed version
    // suitable for a full page, not just scaled-up receipt.
    // For simplicity, we'll reuse the existing receipt content, but you might
    // want to create a separate HTML string for A4 layout.
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

    // Create a temporary div to render the HTML for html2canvas
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px'; // Position off-screen
    tempDiv.style.width = '210mm'; // A4 width
    tempDiv.innerHTML = receiptContentHtml;
    document.body.appendChild(tempDiv);

    // Use html2canvas to render the HTML to a canvas
    const canvas = await html2canvas(tempDiv, {
        scale: 2, // Increase scale for better quality PDF
        useCORS: true, // If you have images from other domains
        logging: false // Disable logging
    });

    // Remove the temporary div
    document.body.removeChild(tempDiv);

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
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
}