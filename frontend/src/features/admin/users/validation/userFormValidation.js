import { validatePassword } from '../../../auth/utils/passwordValidation.js';

const NAME_PATTERN = /\S/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateTeacherForm(user) {
  if (!NAME_PATTERN.test(user.firstName ?? '')) return 'Enter the teacher’s first name.';
  if (user.firstName.trim().length > 100) return 'First name must not exceed 100 characters.';
  if (!NAME_PATTERN.test(user.lastName ?? '')) return 'Enter the teacher’s last name.';
  if (user.lastName.trim().length > 100) return 'Last name must not exceed 100 characters.';
  if (!user.email || user.email.length > 254 || !EMAIL_PATTERN.test(user.email.trim())) return 'Enter a valid email address.';
  return validatePassword(user.password, user.confirmPassword);
}

export function toTeacherPayload(user) {
  return {
    firstName: user.firstName.trim(),
    lastName: user.lastName.trim(),
    email: user.email.trim().toLowerCase(),
    password: user.password,
    confirmPassword: user.confirmPassword,
  };
}
