// File: src/sections/users.js

import { appState } from '../state/appState.js';
import { POSDatabase } from '../db/posDatabase.js';
import { validatePassword } from '../utils/validation.js';
import { hashPassword } from '../utils/crypto.js';
import { genId } from '../utils/id.js';
import { showError } from '../utils/dom.js';
import { showAddUserModal } from '../ui/addUserModal.js'; // Import the new modal function from src/ui/

export async function renderUserManagementSection(main) {
  const users = await POSDatabase.getAll("users");

  main.innerHTML = `
    <h2>User Management</h2>
    <div style="margin-bottom:1em; display: flex; justify-content: flex-start;">
      <button id="openAddUserModalBtn" class="btn btn-primary">Add New User</button>
    </div>
    <div id="userListError" class="hidden" style="color:red; margin-bottom:1em;"></div>
    <table>
      <thead><tr><th>Username</th><th>Role</th><th>Actions</th></tr></thead>
      <tbody>
        ${users.map(u => `
          <tr>
            <td>${u.username}</td>
            <td>${u.role}</td>
            <td>
              ${u.username !== appState.currentUser.username ? `
                <button class="deleteUserBtn btn btn-danger" data-id="${u.id}">Delete</button>
              ` : '—'}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  document.getElementById('openAddUserModalBtn').addEventListener('click', () => {
    showAddUserModal(); // Call the function to open the add user modal
  });

  document.querySelectorAll(".deleteUserBtn").forEach(btn => {
    btn.onclick = async () => {
      if (confirm("Delete this user?")) {
        try {
          await POSDatabase.delete("users", btn.dataset.id);
          renderUserManagementSection(main);
        } catch (error) {
          showError("userListError", "Failed to delete user.");
          console.error("User deletion error:", error);
        }
      }
    };
  });
}