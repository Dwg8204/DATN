export function validateManagedUser(user, users) {
  if (!user.name.trim()) return 'Enter the user’s full name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email.trim())) return 'Enter a valid email address.';
  if (users.some((item) => item.id !== user.id && item.email.toLowerCase() === user.email.trim().toLowerCase())) return 'This email address is already in use.';
  if (user.role === 'teacher' && !user.specialization?.trim()) return 'Enter the teacher’s specialization.';
  return '';
}
