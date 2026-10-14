import assert from 'node:assert/strict';
import test from 'node:test';
import { estimatedProgress, progressStage } from './assessmentProgress.js';

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
