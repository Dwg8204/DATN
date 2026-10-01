import test from 'node:test';
import assert from 'node:assert/strict';
import {
  APP_ROLES, canAccessAdminPath, getAdminLandingPath, hasAnyRole, normalizeRole, safeReturnPath,
} from '../src/features/auth/utils/authorization.js';

test('normalizes API and legacy user roles consistently', () => {
  assert.equal(normalizeRole('admin'), APP_ROLES.ADMIN);
  assert.equal(normalizeRole('teacher'), APP_ROLES.TEACHER);
  assert.equal(normalizeRole('user'), APP_ROLES.STUDENT);
  assert.equal(hasAnyRole('STUDENT', ['ADMIN', 'TEACHER']), false);
});

test('students cannot access admin URLs and teachers only access test management', () => {
  assert.equal(canAccessAdminPath('STUDENT', '/admin'), false);
  assert.equal(canAccessAdminPath('STUDENT', '/admin/tests'), false);
  assert.equal(canAccessAdminPath('TEACHER', '/admin/tests'), true);
  assert.equal(canAccessAdminPath('TEACHER', '/admin/tests/writing/test-1/edit'), true);
  assert.equal(canAccessAdminPath('TEACHER', '/admin/users'), false);
  assert.equal(canAccessAdminPath('ADMIN', '/admin/users'), true);
});

test('redirects each privileged role to the correct workspace and rejects unsafe return paths', () => {
  assert.equal(getAdminLandingPath('ADMIN'), '/admin/dashboard');
  assert.equal(getAdminLandingPath('TEACHER'), '/admin/tests');
  assert.equal(safeReturnPath('/admin/users', 'TEACHER'), '/');
  assert.equal(safeReturnPath('/admin/tests', 'TEACHER'), '/admin/tests');
  assert.equal(safeReturnPath('//evil.example', 'ADMIN'), '/');
});
