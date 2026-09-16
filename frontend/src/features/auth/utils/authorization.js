export const APP_ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT',
});

export function normalizeRole(role) {
  const normalized = typeof role === 'string' ? role.trim().toUpperCase() : '';
  return normalized === 'USER' ? APP_ROLES.STUDENT : normalized;
}

export function hasAnyRole(role, allowedRoles = []) {
  const normalizedRole = normalizeRole(role);
  return allowedRoles.map(normalizeRole).includes(normalizedRole);
}

export function getAdminLandingPath(role) {
  return normalizeRole(role) === APP_ROLES.TEACHER ? '/admin/tests' : '/admin/dashboard';
}

export function canAccessAdminPath(role, pathname = '') {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === APP_ROLES.ADMIN) return true;
  return normalizedRole === APP_ROLES.TEACHER
    && (pathname === '/admin/tests' || pathname.startsWith('/admin/tests/'));
}

export function safeReturnPath(value, role) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '/';
  if (value.startsWith('/admin') && !canAccessAdminPath(role, value)) return '/';
  return value;
}
