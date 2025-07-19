// File: src/ui/categoryModal.js

import { POSDatabase } from '../db/posDatabase.js';
import { genId } from '../utils/id.js';
import { openOrderModal, closeOrderModal } from '../ui/modals.js';

// IMPORTANT: Ensure this matches the ID of your main modal container in index.html
const modalContainer = document.getElementById("orderModal");
let mainContentRef = null; // To store the reference to the main element for re-rendering menu

export async function showCategoryManagementModal(mainElement) {
    if (!modalContainer) {
        console.error("Modal container for categories (orderModal) not found!");
        return;
    }
    mainContentRef = mainElement; // Store the reference

    modalContainer.innerHTML = `
        <div class="modal-content">
            <h3>Manage Categories</h3>
            <div id="categoryModalError" class="hidden" style="color:red; margin-bottom:10px;"></div>

            <form id="addCategoryForm" style="margin-bottom:1.5em; padding-bottom:1em; border-bottom: 1px solid #eee; display: flex; align-items: center; gap: 10px;">
                <input id="newCategoryName" placeholder="Add New Category Name" required style="padding: 8px; border: 1px solid #ccc; border-radius: 4px; flex-grow: 1;">
                <button type="submit" class="addCategoryBtn">Add Category</button>
            </form>

            <div id="categoryList">Loading categories...</div>
            <div class="modal-actions" style="margin-top: 15px;">
                <button id="closeCategoryModalBtn" class="closeModalBtn">✖️ Close</button>
            </div>
        </div>
    `;

    openOrderModal();

    document.getElementById('closeCategoryModalBtn').onclick = closeCategoryModal;
    modalContainer.onclick = (e) => {
        if (e.target === modalContainer) {
            closeCategoryModal();
        }
    };

    // Attach handler for adding new category
    document.getElementById('addCategoryForm').onsubmit = handleAddCategory;

    renderCategoryList(); // Initial render of categories
}



async function renderCategoryList() {
    const categoryListDiv = document.getElementById('categoryList');
    const categoryModalErrorDiv = document.getElementById('categoryModalError');
    categoryListDiv.innerHTML = 'Loading categories...';
    categoryModalErrorDiv.classList.add('hidden');
    categoryModalErrorDiv.textContent = '';

    try {
        const categories = await POSDatabase.getAll('categories');
        if (!categories || categories.length === 0) {
            categoryListDiv.innerHTML = '<p>No categories found. Add one using the form above.</p>';
            return;
        }

        categoryListDiv.innerHTML = `
            <ul style="list-style: none; padding: 0;">
                ${categories.map(category => `
                    <li id="category-${category.id}" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #eee;">
                        <span id="categoryName-${category.id}" style="flex-grow: 1; font-weight: 500;">${category.name}</span>
                        <div>
                            <button class="editCategoryBtn" data-id="${category.id}" data-name="${category.name}" style="margin-right: 5px;">✏️ Edit</button>
                            <button class="deleteCategoryBtn" data-id="${category.id}">🗑️ Delete</button>
                        </div>
                    </li>
                `).join('')}
            </ul>
        `;

        document.querySelectorAll('.editCategoryBtn').forEach(button => {
            button.onclick = (e) => startEditCategory(e.target.dataset.id, e.target.dataset.name);
        });
        document.querySelectorAll('.deleteCategoryBtn').forEach(button => {
            button.onclick = (e) => deleteCategory(e.target.dataset.id);
        });

    } catch (error) {
        console.error('Error loading categories:', error);
        categoryModalErrorDiv.textContent = 'Failed to load categories.';
        categoryModalErrorDiv.classList.remove('hidden');
    }
}





async function handleAddCategory(e) {
    e.preventDefault();
    const newCategoryInput = document.getElementById("newCategoryName");
    const name = newCategoryInput.value.trim();
    const categoryModalErrorDiv = document.getElementById('categoryModalError');
    categoryModalErrorDiv.classList.add('hidden');
    categoryModalErrorDiv.textContent = '';

    if (!name) {
        categoryModalErrorDiv.textContent = "Category name cannot be empty.";
        categoryModalErrorDiv.classList.remove('hidden');
        return;
    }

    try {
        const allCats = await POSDatabase.getAll("categories");
        if (allCats.some(c => c.name.toLowerCase() === name.toLowerCase())) {
            categoryModalErrorDiv.textContent = "Category with this name already exists.";
            categoryModalErrorDiv.classList.remove('hidden');
            return;
        }

        await POSDatabase.put("categories", { id: genId("cat"), name });
        newCategoryInput.value = ''; // Clear input
        renderCategoryList(); // Re-render the list in the modal
        refreshMenuManagement(); // Re-render main menu section
    } catch (error) {
        console.error("Error adding category:", error);
        categoryModalErrorDiv.textContent = "Failed to add category. Please try again.";
        categoryModalErrorDiv.classList.remove('hidden');
    }
}

function closeCategoryModal() {
    closeOrderModal();
    modalContainer.innerHTML = ''; // Clear content
    mainContentRef = null; // Clear the reference
}

async function startEditCategory(categoryId, currentName) {
    const listItem = document.getElementById(`category-${categoryId}`);
    if (!listItem) return;

    // Update the innerHTML of the list item (<li>) with input and new buttons
    // NOTE: The <li> itself is effectively acting as a "table row" here due to flex styling
    listItem.innerHTML = `
        <span style="flex-grow: 1; font-weight: 500;">
            <input type="text" id="editCategoryInput-${categoryId}" value="${currentName}" style="width: 100%; padding: 5px; box-sizing: border-box;">
        </span>
        <div>
            <button class="saveCategoryBtn" data-id="${categoryId}" style="margin-right: 5px;">✔️ Save</button>
            <button class="cancelEditCategoryBtn" data-id="${categoryId}" data-name="${currentName}">✖️ Cancel</button>
        </div>
    `;

    document.getElementById(`editCategoryInput-${categoryId}`).focus();

    // Attach event listeners to the new buttons within the edited row
    document.querySelector(`#category-${categoryId} .saveCategoryBtn`).onclick = () => saveCategory(categoryId);
    document.querySelector(`#category-${categoryId} .cancelEditCategoryBtn`).onclick = () => renderCategoryList();
}

async function saveCategory(categoryId) {
    const input = document.getElementById(`editCategoryInput-${categoryId}`);
    const newName = input.value.trim();
    const categoryModalErrorDiv = document.getElementById('categoryModalError');
    categoryModalErrorDiv.classList.add('hidden');
    categoryModalErrorDiv.textContent = '';

    if (!newName) {
        categoryModalErrorDiv.textContent = 'Category name cannot be empty.';
        categoryModalErrorDiv.classList.remove('hidden');
        return;
    }

    try {
        const categories = await POSDatabase.getAll('categories');
        const originalCategory = categories.find(cat => cat.id === categoryId);

        const isDuplicate = categories.some(cat =>
            cat.id !== categoryId && cat.name.toLowerCase() === newName.toLowerCase()
        );

        if (isDuplicate) {
            categoryModalErrorDiv.textContent = 'Category name already exists.';
            categoryModalErrorDiv.classList.remove('hidden');
            return;
        }

        if (originalCategory && originalCategory.name === newName) {
            renderCategoryList(); // No change, just exit edit mode
            return;
        }

        await POSDatabase.put('categories', { id: categoryId, name: newName });
        renderCategoryList();
        refreshMenuManagement();
        console.log(`Category ${categoryId} updated to ${newName}`);

    } catch (error) {
        console.error('Error saving category:', error);
        categoryModalErrorDiv.textContent = 'Failed to save category. Please try again.';
        categoryModalErrorDiv.classList.remove('hidden');
    }
}

async function deleteCategory(categoryId) {
    if (!confirm("Are you sure you want to delete this category? This cannot be undone.")) {
        return;
    }

    const categoryModalErrorDiv = document.getElementById('categoryModalError');
    categoryModalErrorDiv.classList.add('hidden');
    categoryModalErrorDiv.textContent = '';

    try {
        const menuItems = await POSDatabase.getAll('menuItems');
        const itemsInCategory = menuItems.some(item => item.categoryId === categoryId);

        if (itemsInCategory) {
            categoryModalErrorDiv.textContent = 'Cannot delete category: It is linked to existing menu items. Please remove or reassign items first.';
            categoryModalErrorDiv.classList.remove('hidden');
            return;
        }

        await POSDatabase.delete('categories', categoryId);
        renderCategoryList();
        refreshMenuManagement();
        console.log(`Category ${categoryId} deleted.`);
    } catch (error) {
        console.error('Error deleting category:', error);
        categoryModalErrorDiv.textContent = 'Failed to delete category.';
        categoryModalErrorDiv.classList.remove('hidden');
    }
}

// Helper to re-render the main menu management section
async function refreshMenuManagement() {
    if (mainContentRef) {
        const menuManagementModule = await import('../sections/menu.js');
        if (menuManagementModule.renderMenuManagement) {
            menuManagementModule.renderMenuManagement(mainContentRef);
        } else {
            console.warn('renderMenuManagement not found in menu.js for refresh.');
        }
    }
}