export function validatePassword(password, confirmPassword) {
  if (!password || password.length < 8) return 'Password must contain at least 8 characters.';
  if (password.length > 128) return 'Password must not exceed 128 characters.';
  if (!password.trim()) return 'Password cannot contain only spaces.';
  if (password !== confirmPassword) return 'Passwords do not match.';
  return '';
}
