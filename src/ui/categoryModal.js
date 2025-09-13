// File: src/ui/categoryModal.js
import { showError, hideError } from '../utils/dom.js';
import { genId } from '../utils/id.js';
import { showCustomConfirm } from '../utils/dom.js';
import { renderMenuManagement } from '../sections/menu.js';

// 💡 Import the new dataService
import { dataService } from '../services/dataService.js';

// 💡 Keep the original POSDatabase for put() and delete() operations
import { POSDatabase } from '../db/posDatabase.js';

// Define a unique ID for the modal to avoid conflicts
const MODAL_ID = 'categoryManagementModal';
// Define the ID for the error message element
const ERROR_EL_ID = 'categoryAddError';

/**
 * Renders the categories list inside the modal and sets up delete listeners.
 * @param {HTMLElement} categoryListDiv - The div element to render the categories into.
 * @param {HTMLElement} mainContentElement - The main content element to re-render the menu.
 */
async function renderCategories(categoryListDiv, mainContentElement) {
    // 💡 Use the data service to get categories from the cache
    const categories = await dataService.get("categories");
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

    // Attach delete event listeners using a delegated approach for efficiency
    categoryListDiv.addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.delete-category-btn');
        if (deleteBtn) {
            const categoryId = deleteBtn.dataset.id;
            const categoryName = categories.find(c => c.id === categoryId)?.name;
            
            const confirmDelete = await showCustomConfirm(`Are you sure you want to delete category "${categoryName}"?`);
            if (confirmDelete) {
                await POSDatabase.delete("categories", categoryId);
                // 💡 Manually refresh the cache after a delete operation
                dataService.clearCache("categories");
                await renderCategories(categoryListDiv, mainContentElement);
                if (mainContentElement) {
                    renderMenuManagement(mainContentElement);
                }
            }
        }
    });
}

/**
 * Sets up the event handler for adding a new category.
 * @param {HTMLInputElement} categoryNameInput - The input field for the category name.
 * @param {HTMLElement} categoryListDiv - The div to re-render categories in.
 * @param {HTMLElement} mainContentElement - The main content element to re-render.
 */
function setupAddCategoryFormHandler(categoryNameInput, categoryListDiv, mainContentElement) {
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    addCategoryBtn.onclick = async () => {
        const categoryName = categoryNameInput.value.trim();
        hideError(ERROR_EL_ID);

        if (!categoryName) {
            showError(ERROR_EL_ID, "Category name cannot be empty.");
            return;
        }

        // 💡 Use the data service to get the existing categories from the cache
        const existingCategories = await dataService.get("categories");
        if (existingCategories.some(c => c.name.toLowerCase() === categoryName.toLowerCase())) {
            showError(ERROR_EL_ID, "Category with this name already exists.");
            return;
        }

        const newCategory = { id: genId("cat"), name: categoryName };
        await POSDatabase.put("categories", newCategory);
        categoryNameInput.value = ''; // Clear input

        // 💡 Update the cache with the new category after a successful put() operation
        existingCategories.push(newCategory);

        await renderCategories(categoryListDiv, mainContentElement); // Re-render modal list
        if (mainContentElement) {
            renderMenuManagement(mainContentElement); // Re-render main view
        }
    };
}

/**
 * Sets up event listeners for closing the modal.
 * @param {HTMLElement} modal - The modal element.
 */
function setupModalCloseListeners(modal) {
    const closeCategoryModalBtn = document.getElementById('closeCategoryModal');
    closeCategoryModalBtn.onclick = () => {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
        modal.remove(); // Clean up the modal from DOM
    };

    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
            modal.remove(); // Clean up the modal from DOM
        }
    };
}

/**
 * Main function to show the category management modal.
 * @param {HTMLElement} mainContentElement - The main content element to re-render the menu.
 */
export function showCategoryManagementModal(mainContentElement) {
    const existingModal = document.getElementById(MODAL_ID);
    if (existingModal) {
        existingModal.remove();
    }

    const modalHtml = `
        <div id="${MODAL_ID}" class="modal">
            <div class="modal-content">
                <h3>Manage Categories</h3>
                <div class="category-form-section">
                    <h4>Add New Category</h4>
                    <div id="${ERROR_EL_ID}" class="error-message hidden"></div>
                    <div class="form-group">
                        <input type="text" id="categoryNameInput" placeholder="New Category Name" required>
                        <button id="addCategoryBtn" class="btn btn-primary">Add Category</button>
                    </div>
                </div>
                <div class="category-list-section">
                    <h4>Existing Categories</h4>
                    <div id="categoryList" class="category-list"></div>
                </div>
                <div class="modal-actions">
                    <button id="closeCategoryModal" class="btn btn-secondary">Close</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modal = document.getElementById(MODAL_ID);
    const categoryNameInput = document.getElementById('categoryNameInput');
    const categoryListDiv = document.getElementById('categoryList');

    // Initial render and setup
    renderCategories(categoryListDiv, mainContentElement);
    setupAddCategoryFormHandler(categoryNameInput, categoryListDiv, mainContentElement);
    setupModalCloseListeners(modal);

    // Show the modal
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
}