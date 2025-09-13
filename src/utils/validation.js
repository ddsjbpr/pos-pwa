// File: src/utils/validation.js
// This file contains a utility function to validate a password.

/**
 * Validates a password against a set of security requirements.
 * @param {string} password - The password string to validate.
 * @returns {{passed: boolean, requirements: object, reason: string}} An object
 * indicating if the password passed, the status of each requirement,
 * and a reason for failure if it did not pass.
 */
 export function validatePassword(password) {
  // Check if the password exceeds the maximum length of 64 characters.
  if (password.length > 64) {
      return { passed: false, reason: "Password too long" };
  }

  // Define the validation requirements using a map of boolean checks.
  const requirements = {
      minLength: password.length >= 8, // Must be at least 8 characters long.
      hasUpper: /[A-Z]/.test(password), // Must contain at least one uppercase letter.
      hasLower: /[a-z]/.test(password), // Must contain at least one lowercase letter.
      hasNumber: /\d/.test(password), // Must contain at least one number.
      hasSpecial: /[!@#$%^&*]/.test(password), // Must contain at least one special character.
      noRepeats: !/(.)\1{3,}/.test(password), // Must not have 4 or more repeating characters.
      hasNoSpaces: !password.includes(' ') // Must not contain any blank spaces.
  };

  // Check if all requirements in the 'requirements' object are true.
  const passed = Object.values(requirements).every(Boolean);

  // Return the validation result.
  return {
      passed,
      requirements,
      reason: !passed ? "Password doesn't meet all requirements" : ""
  };
}
