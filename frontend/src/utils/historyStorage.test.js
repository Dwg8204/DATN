import test from 'node:test';
import assert from 'node:assert/strict';
import { purgeLegacyReadingHistory } from './historyStorage.js';

test('removes only legacy Reading history and its linked browser session', () => {
  const values = new Map([
    ['aptimate.learning_history', JSON.stringify([
      { id: 'hist_reading', skill: 'reading', reviewUrl: '/reading/result/sess-abc' },
      { id: 'hist_speaking', skill: 'speaking', reviewUrl: '/speaking/result' },
    ])],
    ['sess-abc', 'reading session'],
    ['history_data_hist_reading', 'reading snapshot'],
    ['history_data_hist_speaking', 'speaking snapshot'],
  ]);
  const previous = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  };
  try {
    assert.equal(purgeLegacyReadingHistory(), 1);
    assert.equal(values.has('sess-abc'), false);
    assert.equal(values.has('history_data_hist_reading'), false);
    assert.equal(values.get('history_data_hist_speaking'), 'speaking snapshot');
    assert.deepEqual(JSON.parse(values.get('aptimate.learning_history')), [
      { id: 'hist_speaking', skill: 'speaking', reviewUrl: '/speaking/result' },
    ]);
  } finally {
    globalThis.localStorage = previous;
  }
});
