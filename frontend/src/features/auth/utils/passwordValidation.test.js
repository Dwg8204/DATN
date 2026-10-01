import assert from 'node:assert/strict';
import test from 'node:test';
import { validatePassword } from './passwordValidation.js';

test('accepts a matching password within the bcrypt byte limit', () => {
  assert.equal(validatePassword('Secure-Password-123', 'Secure-Password-123'), '');
});

test('rejects a multibyte password even when its character count is short', () => {
  const password = 'é'.repeat(37);
  assert.match(validatePassword(password, password), /72 bytes/);
});

test('rejects mismatched confirmation', () => {
  assert.match(validatePassword('Secure-Password-123', 'Different-Password-123'), /do not match/);
});
