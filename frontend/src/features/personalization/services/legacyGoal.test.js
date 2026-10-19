import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readLegacyGoal } from './legacyGoal.js';

test('legacy goal accepts only valid active goals without changing local storage', () => {
  const valid = { active: true, targetBand: 'B2', targetTests: 40, durationDays: 30 };
  const read = value => readLegacyGoal({ getItem: () => JSON.stringify(value) });
  assert.deepEqual(read(valid), { targetCefr: 'B2', targetTests: 40, durationDays: 30 });
  for (const overrides of [{ active: false }, { durationDays: 2 }, { durationDays: 181 }, { targetTests: 501 }, { targetBand: 'C2' }]) assert.equal(read({ ...valid, ...overrides }), null);
  assert.equal(readLegacyGoal({ getItem: () => '{broken' }), null);
  assert.equal(readLegacyGoal({ getItem: () => { throw Error('Storage denied'); } }), null);
});
