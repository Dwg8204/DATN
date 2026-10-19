import test from 'node:test';
import assert from 'node:assert/strict';
import {
  APP_ROLES, canAccessAdminPath, getAdminLandingPath, hasAnyRole, normalizeRole, safeReturnPath,
} from '../src/features/auth/utils/authorization.js';

test('normalizes API and legacy user roles consistently', () => {
  assert.equal(normalizeRole('admin'), APP_ROLES.ADMIN);
  assert.equal(normalizeRole('teacher'), '');
  assert.equal(normalizeRole('user'), APP_ROLES.STUDENT);
  assert.deepEqual(Object.values(APP_ROLES).sort(), ['ADMIN', 'STUDENT']);
  assert.equal(hasAnyRole('TEACHER', ['TEACHER']), false);
  assert.equal(hasAnyRole(undefined, ['UNKNOWN']), false);
  assert.equal(hasAnyRole('STUDENT', ['ADMIN']), false);
});

test('only administrators can access admin URLs', () => {
  assert.equal(canAccessAdminPath('STUDENT', '/admin'), false);
  assert.equal(canAccessAdminPath('STUDENT', '/admin/tests'), false);
  assert.equal(canAccessAdminPath('TEACHER', '/admin/tests'), false);
  assert.equal(canAccessAdminPath('TEACHER', '/admin/tests/writing/test-1/edit'), false);
  assert.equal(canAccessAdminPath('TEACHER', '/admin/users'), false);
  assert.equal(canAccessAdminPath('ADMIN', '/admin/users'), true);
});

test('redirects each privileged role to the correct workspace and rejects unsafe return paths', () => {
  assert.equal(getAdminLandingPath('ADMIN'), '/admin/dashboard');
  assert.equal(getAdminLandingPath('TEACHER'), '/');
  assert.equal(safeReturnPath('/admin/users', 'TEACHER'), '/');
  assert.equal(safeReturnPath('/admin/tests', 'TEACHER'), '/');
  assert.equal(safeReturnPath('//evil.example', 'ADMIN'), '/');
});
