import assert from 'node:assert/strict';
import test from 'node:test';
import { estimatedProgress, progressStage, progressStorageKey, readProgress, saveProgress } from './assessmentProgress.js';

test('only persisted usable results finish progress; errors and partial failures never do', () => {
  for (const component of ['GRAMMAR_VOCAB', 'READING', 'LISTENING']) {
    assert.equal(progressStage({ data: { component, result: { method: 'OBJECTIVE' } } }), 'COMPLETED');
  }
  for (const component of ['WRITING', 'SPEAKING']) {
    const field = component.toLowerCase();
    assert.equal(progressStage({ data: { component, gradingStatus: 'COMPLETED', result: { method: 'AI', [field]: {} } } }), 'COMPLETED');
    assert.equal(progressStage({ data: { component, gradingStatus: 'COMPLETED', result: { method: 'PENDING_AI' } } }), 'LOADING_RESULT');
  }
  assert.equal(progressStage({ data: { gradingStatus: 'PARTIAL_FAILED', result: { method: 'AI' } } }), 'FAILED');
  assert.equal(progressStage({ error: 'offline', data: { gradingStatus: 'PROCESSING' } }), 'CONNECTION_ERROR');
  assert.equal(progressStage({ paused: true, data: { gradingStatus: 'PROCESSING' } }), 'LONG_WAIT');
  assert.equal(progressStage({ data: { gradingStatus: 'QUEUED', assessment: { enabled: false } } }), 'PAUSED');
});

test('provider and user progress survive remounts independently without trusting cached completion', () => {
  const values = new Map();
  globalThis.localStorage = { getItem: () => JSON.stringify({ id: 'student-one' }) };
  globalThis.sessionStorage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  try {
    const gemini = progressStorageKey('attempt', 'gemini');
    const groq = progressStorageKey('attempt', 'groq');
    saveProgress(gemini, 50); saveProgress(groq, 25);
    assert.equal(readProgress(gemini), 50);
    assert.equal(readProgress(groq), 25);
    assert.notEqual(progressStorageKey('another', 'gemini'), gemini);
    assert.notEqual(progressStorageKey('attempt', 'gemini', 1), gemini);
    globalThis.localStorage.getItem = () => JSON.stringify({ id: 'student-two' });
    assert.equal(readProgress(progressStorageKey('attempt', 'gemini')), 0);
    saveProgress(gemini, 100); assert.equal(readProgress(gemini), 95);
    values.set(gemini, JSON.stringify({ value: 70, at: Date.now() - 86400001 }));
    assert.equal(readProgress(gemini), 0);
  } finally { delete globalThis.localStorage; delete globalThis.sessionStorage; }
});

test('retry wait freezes the estimate, not a failure or a completed result', () => {
  const data = { gradingStatus: 'QUEUED', assessment: { errorCode: 'GEMINI_HTTP_503', nextRetryAt: new Date(Date.now() + 60000).toISOString() } };
  assert.equal(progressStage({ data }), 'RETRY_WAIT');
  assert.equal(estimatedProgress('RETRY_WAIT', 50, 51), 51);
  data.assessment.nextRetryAt = new Date(0).toISOString();
  assert.equal(progressStage({ data }), 'QUEUED');
});

test('estimated progress is bounded, monotonic during automatic retry and stops on failure', () => {
  assert.equal(estimatedProgress('SUBMITTING', 999), 10);
  assert.equal(estimatedProgress('QUEUED', 999), 25);
  assert.equal(estimatedProgress('PROCESSING', 999), 90);
  assert.equal(estimatedProgress('QUEUED', 0, 80), 80);
  for (const stage of ['FAILED', 'PAUSED', 'CONNECTION_ERROR', 'LONG_WAIT']) {
    assert.equal(estimatedProgress(stage, 999, 80), 80);
  }
  assert.equal(estimatedProgress('COMPLETED', 0, 80), 100);
});
