export const PASSWORD_REQUIREMENTS = 'Password must contain at least 8 characters, an uppercase letter (A-Z), a lowercase letter (a-z), a number and a special character.';

export function validatePassword(password, confirmPassword) {
  if (!password || password.length < 8) return 'Password must contain at least 8 characters.';
  if (password.length > 128) return 'Password must not exceed 128 characters.';
  if (new TextEncoder().encode(password).length > 72) return 'Password must not exceed 72 bytes in UTF-8.';
  if (!password.trim()) return 'Password cannot contain only spaces.';
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^\p{L}\p{N}\s]/u.test(password)) return PASSWORD_REQUIREMENTS;
  if (password !== confirmPassword) return 'Passwords do not match.';
  return '';
}
