import test from 'node:test';
import assert from 'node:assert/strict';
import { validateManagedUser } from '../src/features/admin/users/validation/userValidation.js';
import { getManagedUsers, saveManagedUser, deleteManagedUser, authenticateManagedUser } from '../src/features/admin/users/data/userManagementStorage.js';

const existing = [{ id: 'user-1', email: 'member@aptimate.com' }];
const account = (extra = {}) => ({ id: '', role: 'user', name: 'New Member', email: 'new@example.test', status: 'Active', password: 'Demo-test-123', confirmPassword: 'Demo-test-123', ...extra });
function resetStorage() {
  const memory = new Map();
  globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
  globalThis.window = { dispatchEvent() {} };
  return memory;
}

test('new users and teachers require valid passwords, not specialization', () => {
  assert.equal(validateManagedUser(account(), existing), '');
  assert.equal(validateManagedUser(account({ role: 'teacher' }), existing), '');
  for (const password of ['', 'short', '        ', 'x'.repeat(129)]) {
    assert.ok(validateManagedUser(account({ password, confirmPassword: password }), existing));
  }
  assert.equal(validateManagedUser(account({ confirmPassword: 'different' }), existing), 'Passwords do not match.');
});

test('validation rejects missing names, invalid emails and case-insensitive duplicates', () => {
  assert.ok(validateManagedUser(account({ name: ' ' }), existing));
  assert.ok(validateManagedUser(account({ email: 'invalid' }), existing));
  assert.equal(validateManagedUser(account({ email: ' MEMBER@aptimate.com ' }), existing), 'This email address is already in use.');
});

test('created accounts authenticate without storing plaintext passwords', async () => {
  const memory = resetStorage();
  const created = await saveManagedUser(account({ role: 'teacher', specialization: 'Legacy value' }));
  const raw = memory.get('aptimate_admin_users');
  assert.ok(!raw.includes('Demo-test-123'));
  assert.ok(!raw.includes('specialization'));
  assert.ok(!raw.includes('confirmPassword'));
  assert.ok(created.credential.hash);
  assert.equal((await authenticateManagedUser(' NEW@EXAMPLE.TEST ', 'Demo-test-123')).id, created.id);
  assert.equal(await authenticateManagedUser(created.email, 'wrong'), null);
  const profile = await authenticateManagedUser(created.email, 'Demo-test-123');
  assert.ok(!('credential' in profile));
  await assert.rejects(saveManagedUser(account()), /already in use/);
});

test('role changes preserve identity and only permit stepwise promotion', async () => {
  resetStorage();
  const original = getManagedUsers().find(u => u.role === 'user');
  await assert.rejects(saveManagedUser({ ...original, role: 'admin' }), /Only User/);
  const teacher = await saveManagedUser({ ...original, role: 'teacher', name: 'Tampered', email: 'changed@example.test' });
  assert.equal(teacher.name, original.name);
  assert.equal(teacher.email, original.email);
  const admin = await saveManagedUser({ ...teacher, role: 'admin' });
  await assert.rejects(saveManagedUser({ ...admin, role: 'teacher' }), /Only User/);
  assert.equal(deleteManagedUser(admin.id), false);
  assert.equal(deleteManagedUser('teacher-1'), true);
});

test('inactive accounts cannot log in and concurrent creates retain both records', async () => {
  resetStorage();
  const [first, second] = await Promise.all([
    saveManagedUser(account({ status: 'Inactive' })),
    saveManagedUser(account({ email: 'second@example.test' }))
  ]);
  assert.ok(getManagedUsers().some(u => u.id === first.id));
  assert.ok(getManagedUsers().some(u => u.id === second.id));
  assert.equal(await authenticateManagedUser(first.email, 'Demo-test-123'), null);
});
