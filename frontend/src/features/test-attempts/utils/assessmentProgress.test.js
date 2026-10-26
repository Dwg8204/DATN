import assert from 'node:assert/strict';
import test from 'node:test';
import { estimatedProgress, groqPartProgress, groqFailureReason, progressStage, progressStorageKey, readProgress, saveProgress } from './assessmentProgress.js';

test('Groq progress follows saved parts and only reaches 100 after final completion', () => {
  for (const [parts,expected] of [[[],0],[[1],25],[[1,2],36],[[1,2,3],67],[[1,2,3,4],90]]) {
    for (const stage of ['PROCESSING','RATE_WAIT','RETRY_WAIT','FAILED']) assert.equal(groqPartProgress(stage,parts),expected);
  }
  assert.equal(groqPartProgress('PROCESSING',[1,1,7]),25);
  assert.equal(groqPartProgress('COMPLETED',[1,2,3,4]),100);
  assert.equal(groqFailureReason('GROQ_JSON_GENERATION_FAILED'),'invalidOutput');
  assert.equal(groqFailureReason('GROQ_HTTP_503'),'unavailable');
  assert.equal(groqFailureReason('GROQ_HTTP_429'),'quota');
});

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

test('Groq quota waits differ from invalid-output retries and do not increase progress',()=>{
  const assessment={errorCode:'GROQ_RATE_WAIT',nextRetryAt:new Date(Date.now()+30000).toISOString()};
  assert.equal(progressStage({data:{gradingStatus:'QUEUED',assessment}}),'RATE_WAIT');
  assert.equal(estimatedProgress('RATE_WAIT',99,45),45);
  assessment.errorCode='AI_WRITING_EVIDENCE_INVALID';
  assert.equal(progressStage({data:{gradingStatus:'QUEUED',assessment}}),'RETRY_WAIT');
  assert.equal(progressStage({data:{gradingStatus:'FAILED',assessment}}),'FAILED');
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
