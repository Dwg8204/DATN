import assert from 'node:assert/strict';
import test from 'node:test';
import { formatDuration, formatRemainingTime, remainingSeconds } from './attemptTime.js';

test('remaining time uses the server clock offset and never becomes negative', () => {
  const clientNow = Date.parse('2026-09-21T10:00:00.000Z');
  assert.equal(remainingSeconds('2026-09-21T10:05:30.000Z', '2026-09-21T10:00:30.000Z', clientNow, clientNow), 300);
  assert.equal(remainingSeconds('2026-09-21T09:59:00.000Z', '2026-09-21T10:00:30.000Z', clientNow, clientNow), 0);
  assert.equal(remainingSeconds(null, null, clientNow, clientNow), null);
});

test('remaining time continues to decrease after clock synchronization', () => {
  const synchronizedAt = Date.parse('2026-09-21T10:00:00.000Z');
  assert.equal(remainingSeconds('2026-09-21T10:05:30.000Z', '2026-09-21T10:00:30.000Z', synchronizedAt, synchronizedAt + 2_000), 298);
});

test('attempt times use stable display formats', () => {
  assert.equal(formatRemainingTime(65), '01:05');
  assert.equal(formatDuration('2026-09-21T10:00:00.000Z', '2026-09-21T11:02:03.000Z'), '01:02:03');
});
