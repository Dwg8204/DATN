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

for (const password of ['abcdefgh1!', 'ABCDEFGH1!', 'Abcdefgh!!', 'Abcdefgh12', 'Aa1!aaa', 'Abcdefg1  ', 'Abcdefg1\u00e9', '']) {
  test(`rejects weak new password ${JSON.stringify(password)}`, () => {
    assert.notEqual(validatePassword(password, password), '');
  });
}
test('accepts all requirements at eight characters', () => {
  assert.equal(validatePassword('Aa1!aaaa', 'Aa1!aaaa'), '');
});
