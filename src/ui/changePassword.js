import { POSDatabase } from '../db/posDatabase.js';
import { validatePassword } from '../utils/validation.js';
import { verifyPassword, hashPassword } from '../utils/crypto.js';

export async function handlePasswordChange(form, currentUser) {
  try {
    const currentPass = form.currentPassword.value.trim();
    const newPass = form.newPassword.value.trim();
    const confirmPass = form.confirmPassword.value.trim();

    if (!currentPass || !newPass || !confirmPass) {
      throw new Error("All fields are required");
    }

    if (newPass !== confirmPass) {
      throw new Error("New passwords don't match");
  	}

    const validation = validatePassword(newPass);
    if (!validation.passed) {
      throw new Error("New password doesn't meet requirements.");
    }

    // --- START OF CHANGE ---
    // Use currentUser.id to fetch the user, as 'id' is the keyPath in the 'users' store.
    // Ensure currentUser has the 'id' property stored after login/registration.
    const user = await POSDatabase.get("users", currentUser.id);
    // --- END OF CHANGE ---

    if (!user) throw new Error("User not found"); // This error should now be less frequent

    const isValid = await verifyPassword(user.passwordHash, currentPass);
    if (!isValid) throw new Error("Current password is incorrect");

    user.passwordHash = await hashPassword(newPass);
    await POSDatabase.put("users", user); // Using .put() for update

    return { success: true };
  } catch (error) {
    console.error("Password change error:", error.message);
    return { success: false, message: error.message };
  }
}