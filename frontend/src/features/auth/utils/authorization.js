export const APP_ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  STUDENT: 'STUDENT',
});

export function normalizeRole(role) {
  const normalized = typeof role === 'string' ? role.trim().toUpperCase() : '';
  if (normalized === 'USER') return APP_ROLES.STUDENT;
  return Object.values(APP_ROLES).includes(normalized) ? normalized : '';
}

export function hasAnyRole(role, allowedRoles = []) {
  const normalizedRole = normalizeRole(role);
  return Boolean(normalizedRole) && allowedRoles.map(normalizeRole).includes(normalizedRole);
}

export function getAdminLandingPath(role) {
  return normalizeRole(role) === APP_ROLES.ADMIN ? '/admin/dashboard' : '/';
}

export function canAccessAdminPath(role) {
  return normalizeRole(role) === APP_ROLES.ADMIN;
}

export function safeReturnPath(value, role) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/';
  if (value.startsWith('/admin') && !canAccessAdminPath(role, value)) return '/';
  return value;
}
