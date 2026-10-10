import test from 'node:test';
import assert from 'node:assert/strict';
import { speakingResultParts, speakingPartStatus } from './speakingResultParts.js';

test('full Speaking attempt shows all parts even when result only contains Part 1', () => {
  const attempt = { scope: 'FULL_SKILL', result: { parts: [{ partNumber: 1 }] } };
  assert.deepEqual(speakingResultParts(attempt), [1, 2, 3, 4]);
});

test('part practice only shows its assigned part', () => {
  assert.deepEqual(speakingResultParts({ scope: 'PART', partNumber: 3 }), [3]);
});

test('unanswered Speaking items are skipped', () => {
  const attempt = { result: { items: [
    { partNumber: 1, selectedAnswer: { kind: 'AUDIO', mediaKey: 'https://example.com/one.webm' } },
    { partNumber: 1, selectedAnswer: null },
    { partNumber: 2, selectedAnswer: null },
  ] } };
  assert.deepEqual(speakingPartStatus(attempt, 1), { recorded: 1, total: 2, skipped: 1 });
  assert.deepEqual(speakingPartStatus(attempt, 2), { recorded: 0, total: 1, skipped: 1 });
});
