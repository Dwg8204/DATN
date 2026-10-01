export function validateEmail(value, t) {
  const email = value.trim();
  if (!email) return t?.('auth.emailRequired') ?? 'Please enter your email address.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return t?.('auth.emailInvalid') ?? 'Please enter a valid email address.';
  return '';
}
