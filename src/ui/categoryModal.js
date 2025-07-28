// File: src/ui/categoryModal.js

import { POSDatabase } from '../db/posDatabase.js';
import { showError, hideError } from '../utils/dom.js'; // Import both
import { genId } from '../utils/id.js';
import { showCustomConfirm } from '../utils/dom.js';

// Import renderMenuManagement if it's not globally accessible
// Example: Assuming menu.js exports it:
import { renderMenuManagement } from '../sections/menu.js'; // Make sure this path is correct and it's exported in menu.js

// Pass `mainContentElement` to allow re-rendering of menu.js
export function showCategoryManagementModal(mainContentElement) {
    const modalId = 'categoryManagementModal'; // Define a unique ID for the modal

    // Remove existing modal if it's already there to prevent duplicates
    const existingModal = document.getElementById(modalId);
    if (existingModal) {
        existingModal.remove();
    }

    const modalHtml = `
        <div id="${modalId}" class="modal">
            <div class="modal-content">
                <h3>Manage Categories</h3>

                <div class="category-form-section">
                    <h4>Add New Category</h4>
                    <div id="categoryAddError" class="error-message hidden"></div>
                    <div class="form-group">
                        <input type="text" id="categoryNameInput" placeholder="New Category Name" required>
                        <button id="addCategoryBtn" class="btn btn-primary">Add Category</button>
                    </div>
                </div>

                <div class="category-list-section">
                    <h4>Existing Categories</h4>
                    <div id="categoryList" class="category-list">
                        </div>
                </div>

                <div class="modal-actions">
                    <button id="closeCategoryModal" class="btn btn-secondary">Close</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modal = document.getElementById(modalId);
    const categoryNameInput = document.getElementById('categoryNameInput');
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    const closeCategoryModalBtn = document.getElementById('closeCategoryModal');
    const categoryListDiv = document.getElementById('categoryList');

    // THIS IS THE ONLY DECLARATION FOR THE ERROR DIV ID:
    const categoryErrorElementId = 'categoryAddError'; // Use this string ID for showError/hideError

    // Function to render categories
    const renderCategories = async () => {
        const categories = await POSDatabase.getAll("categories");
        categoryListDiv.innerHTML = ''; // Clear existing list

        if (categories.length === 0) {
            categoryListDiv.innerHTML = '<p style="text-align: center; color: #777;">No categories added yet.</p>';
            return;
        }

        categories.forEach(category => {
            const categoryItem = document.createElement('div');
            categoryItem.className = 'category-item';
            categoryItem.innerHTML = `
                <span class="category-name">${category.name}</span>
                <div class="category-actions">
                    <button class="btn btn-danger delete-category-btn" data-id="${category.id}">Delete</button>
                </div>
            `;
            categoryListDiv.appendChild(categoryItem);
        });

        // Attach delete event listeners
        document.querySelectorAll('.delete-category-btn').forEach(btn => {
            btn.onclick = async () => {
                // Using showCustomConfirm instead of native confirm
                const confirmDelete = await showCustomConfirm(`Are you sure you want to delete category "${categories.find(c => c.id === btn.dataset.id)?.name}"?`);
                if (confirmDelete) {
                    await POSDatabase.delete("categories", btn.dataset.id);
                    await renderCategories(); // Re-render categories in the modal
                    // Re-render the main menu management section to update category dropdowns
                    if (mainContentElement && typeof renderMenuManagement !== 'undefined') {
                         renderMenuManagement(mainContentElement);
                    } else {
                         console.warn("renderMenuManagement not accessible to update main view after category change.");
                    }
                }
            };
        });
    };

    // Initial render of categories
    renderCategories();

    // Event listeners
    addCategoryBtn.onclick = async () => {
        const categoryName = categoryNameInput.value.trim();
        hideError(categoryErrorElementId); // Use the ID string here

        if (!categoryName) {
            showError(categoryErrorElementId, "Category name cannot be empty."); // Use the ID string here
            return;
        }

        // Check for duplicate category names (case-insensitive)
        const existingCategories = await POSDatabase.getAll("categories");
        if (existingCategories.some(c => c.name.toLowerCase() === categoryName.toLowerCase())) {
            showError(categoryErrorElementId, "Category with this name already exists."); // Use the ID string here
            return;
        }

        const newCategory = { id: genId("cat"), name: categoryName };
        await POSDatabase.put("categories", newCategory);
        categoryNameInput.value = ''; // Clear input
        await renderCategories(); // Re-render categories in the modal
        // Re-render the main menu management section to update category dropdowns
        if (mainContentElement && typeof renderMenuManagement !== 'undefined') {
            renderMenuManagement(mainContentElement);
        }
    };

    closeCategoryModalBtn.onclick = () => {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
        modal.remove(); // Clean up the modal from DOM
    };

    // Close modal if clicking outside content
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
            modal.remove(); // Clean up the modal from DOM
        }
    };

    // Show the modal
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
}