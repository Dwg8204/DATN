import assert from 'node:assert/strict';
import test from 'node:test';
import { displaySelectedAnswer } from './answerDisplay.js';

test('displays indexed choices as A-Z labels', () => {
  assert.equal(displaySelectedAnswer({ kind: 'CHOICE', optionId: 'o0' }), 'A');
  assert.equal(displaySelectedAnswer({ kind: 'CHOICE', optionId: 'o2' }), 'C');
});

test('keeps matching labels and open answers readable', () => {
  assert.equal(displaySelectedAnswer({ kind: 'MATCH', optionId: 'G' }), 'G');
  assert.equal(displaySelectedAnswer({ kind: 'TEXT', text: '  My response  ' }), 'My response');
  assert.equal(displaySelectedAnswer(null), null);
});
