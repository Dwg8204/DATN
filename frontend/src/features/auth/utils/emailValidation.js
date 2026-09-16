export function validateEmail(value) {
  const email = value.trim();
  if (!email) return 'Please enter your email address.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email address.';
  return '';
}
