import assert from 'node:assert/strict';
import test from 'node:test';
import { applyLocalChanges, batchReachedServer, changedAnswers, classifySaveRecovery,
  isRetryableSaveError, splitAnswerChanges, waitForActiveSave } from './attemptSavePolicy.js';

test('recognizes a save that reached the server after its response was lost', () => {
  const changes = { 'p2:q1': { kind: 'TEXT', text: 'Saved response' } };
  assert.equal(batchReachedServer(changes, changes), true);
  assert.equal(batchReachedServer({ 'p2:q1': { kind: 'TEXT', text: 'Other response' } }, changes), false);
});

test('reconciles the exact in-flight batch while newer edits remain pending', () => {
  const first = { 'p2:q1': { kind: 'TEXT', text: 'A' } };
  const second = { 'p2:q1': { kind: 'TEXT', text: 'B' } };
  const remote = { revision: 1, answers: first, progress: { currentQuestionKey: 'p2:q1' } };
  const batch = { changes: first, expectedRevision: 0, currentQuestionKey: 'p2:q1' };
  assert.equal(classifySaveRecovery(remote, batch), 'confirmed');
  assert.deepEqual(applyLocalChanges(remote.answers, second), second);
  assert.equal(classifySaveRecovery({ ...remote, answers: {} }, batch), 'conflict');
  assert.equal(classifySaveRecovery({ ...remote, revision: 0, answers: {} }, batch), 'not-saved');
});

test('keep my version includes unchanged local answers and deleted answers', () => {
  const remote = { first: { kind: 'TEXT', text: 'new remote' }, second: { kind: 'TEXT', text: 'server only' } };
  const local = { first: { kind: 'TEXT', text: 'my version' } };
  const changes = changedAnswers(remote, local);
  assert.deepEqual(changes, { first: local.first, second: null });
  assert.deepEqual(applyLocalChanges(remote, changes), local);
});

test('cursor-only autosave is confirmed only when the cursor reached the server', () => {
  const remote = { revision: 1, answers: {}, progress: { currentQuestionKey: 'p3:q1' } };
  assert.equal(classifySaveRecovery(remote, { changes: {}, expectedRevision: 0, currentQuestionKey: 'p3:q3' }), 'conflict');
});

test('splits Unicode and escaped newlines into requests within the backend byte limit', () => {
  const changes = {
    'p4:q1': { kind: 'TEXT', text: 'Đ\n'.repeat(2_000) },
    'p4:q2': { kind: 'TEXT', text: '界\n'.repeat(4_000) },
  };
  const batches = splitAnswerChanges(changes, 24_000);
  assert.equal(batches.length, 2);
  assert.deepEqual(Object.assign({}, ...batches), changes);
  assert.ok(batches.every(batch => new TextEncoder().encode(JSON.stringify(batch)).length <= 24_000));
});

test('only retries transient save failures', () => {
  assert.equal(isRetryableSaveError({ code: 'ERR_NETWORK', request: {} }), true);
  assert.equal(isRetryableSaveError({ response: { status: 503, data: {} } }), true);
  assert.equal(isRetryableSaveError({ response: { status: 422, data: {} } }), false);
  assert.equal(isRetryableSaveError({ response: { status: 409, data: { error: { code: 'ATTEMPT_REVISION_CONFLICT' } } } }), false);
});

test('waits for every autosave that becomes active before submission', async () => {
  let finishFirst;
  let finishSecond;
  const first = new Promise(resolve => { finishFirst = resolve; });
  const second = new Promise(resolve => { finishSecond = resolve; });
  const active = { current: first };
  first.then(() => { active.current = second; });
  second.then(() => { active.current = null; });

  let finished = false;
  const waiting = waitForActiveSave(active).then(() => { finished = true; });
  finishFirst();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(finished, false);
  finishSecond();
  await waiting;
  assert.equal(finished, true);
});
