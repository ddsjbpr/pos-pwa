// File: src/sections/users.js

import { appState } from '../state/appState.js';
import { POSDatabase } from '../db/posDatabase.js';
import { showError } from '../utils/dom.js';
import { showAddUserModal } from '../ui/addUserModal.js';

function escapeHTML(str) {
  return str.replace(/[&<>"']/g, m => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]
  ));
}

function renderUserTable(users) {
  return `
    <table>
      <thead><tr><th>Username</th><th>Role</th><th>Cash Register ID</th><th>Actions</th></tr></thead>
      <tbody>
        ${users.map(u => `
          <tr>
            <td>${escapeHTML(u.username)}</td>
            <td>${escapeHTML(u.role)}</td>
            <td>${escapeHTML(u.cashRegisterId || 'N/A')}</td>
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
}

export async function renderUserManagementSection(main) {
  try {
    const users = await POSDatabase.getAll("users");

    main.innerHTML = `
      <h2>User Management</h2>
      <div style="margin-bottom:1em; display: flex; justify-content: flex-start;">
        <button id="openAddUserModalBtn" class="btn btn-primary">Add New User</button>
      </div>
      <div id="userListError" class="hidden" style="color:red; margin-bottom:1em;"></div>
      ${renderUserTable(users)}
    `;

    document.getElementById('openAddUserModalBtn').addEventListener('click', () => {
      showAddUserModal();
    });

    document.querySelectorAll(".deleteUserBtn").forEach(btn => {
      btn.onclick = async () => {
        if (confirm("Delete this user?")) {
          try {
            await POSDatabase.delete("users", btn.dataset.id);
            // Remove row without reloading entire DOM
            btn.closest("tr")?.remove();
          } catch (error) {
            showError("userListError", "Failed to delete user.");
            console.error("User deletion error:", error);
          }
        }
      };
    });

  } catch (err) {
    main.innerHTML = `<p style="color:red;">Failed to load user list.</p>`;
    console.error("Error loading users:", err);
  }
}
