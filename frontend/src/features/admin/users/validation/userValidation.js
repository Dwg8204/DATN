import { validatePassword } from '../../../auth/utils/passwordValidation.js';
export function validateManagedUser(user, users) {
  if (!user.name?.trim()) return 'Enter the user’s full name.';
  if (user.name.trim().length > 100) return 'Full name must not exceed 100 characters.';
  if (!user.email || user.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email.trim())) return 'Enter a valid email address.';
  if (users.some(item => item.id !== user.id && item.email.trim().toLowerCase() === user.email.trim().toLowerCase())) return 'This email address is already in use.';
  if (!['user','teacher','admin'].includes(user.role)) return 'Invalid role.';
  if (!user.id) return validatePassword(user.password, user.confirmPassword);
  return '';
}
