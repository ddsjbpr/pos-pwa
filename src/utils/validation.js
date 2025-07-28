export function validatePassword(password) {
  if (password.length > 64) {
    return { passed: false, reason: "Password too long" };
  }

  const requirements = {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*]/.test(password),
    noRepeats: !/(.)\1{3,}/.test(password), // No 4+ repeating chars
    hasNoSpaces: !password.includes(' ') // ADDED: No blank spaces
  };

  const passed = Object.values(requirements).every(Boolean);

  return {
    passed,
    requirements,
    reason: !passed ? "Password doesn't meet all requirements" : ""
  };
}
