import test from 'node:test';
import assert from 'node:assert/strict';
import { validateManagedUser } from '../src/features/admin/users/validation/userValidation.js';

const existing = [{ id: 'user-1', email: 'member@aptimate.com' }];

test('user validation accepts the editable account fields', () => {
  assert.equal(validateManagedUser({ id: '', role: 'user', name: 'New Member', email: 'new@aptimate.com' }, existing), '');
});

test('user validation rejects duplicate emails', () => {
  assert.equal(validateManagedUser({ id: '', role: 'user', name: 'New Member', email: 'member@aptimate.com' }, existing), 'This email address is already in use.');
});

test('teacher accounts require a specialization', () => {
  assert.equal(validateManagedUser({ id: '', role: 'teacher', name: 'Teacher', email: 'teacher@aptimate.com', specialization: '' }, existing), 'Enter the teacher’s specialization.');
});
