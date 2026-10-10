import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { transformSync } from 'esbuild';
import { normalizeApiError } from '../../../services/apiError.js';
import * as savePolicy from '../utils/attemptSavePolicy.js';
import { remainingSeconds } from '../utils/attemptTime.js';

const source = readFileSync(new URL('./TestAttemptContext.jsx', import.meta.url), 'utf8');
const compiled = transformSync(source, { loader: 'jsx', format: 'cjs', jsx: 'automatic' }).code;
const autosaveSource = readFileSync(new URL('./useAttemptAutosave.js', import.meta.url), 'utf8');
const autosaveCompiled = transformSync(autosaveSource, { loader: 'js', format: 'cjs' }).code;
const answer = text => ({ kind: 'TEXT', text });
const networkError = () => ({ code: 'ERR_NETWORK', request: {} });
const conflictError = () => ({ response: { status: 409, data: { error: { code: 'ATTEMPT_REVISION_CONFLICT' } } } });
const submittedConflictError = () => ({ response: { status: 409, data: { error: { code: 'ATTEMPT_CONFLICT' } } } });
const settle = async () => { for (let step = 0; step < 30; step += 1) await Promise.resolve(); };

function attemptHarness(initial = {}) {
  let cursor = 0;
  let slots = [];
  let pendingEffects = [];
  let timerId = 0;
  const timers = new Map();
  const intervals = new Map();
  let clientNow = Date.now();
  class ClockDate extends Date {
    static now() { return clientNow; }
  }
  const notices = [];
  const toast = { showError: message => notices.push(message) };
  const remote = {
    revision: 0, answers: {}, progress: {}, component: 'WRITING', status: 'IN_PROGRESS',
    canAnswer: true, attemptId: 'attempt-1', ...initial,
  };
  const hooks = {
    useState(value) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof value === 'function' ? value() : value;
      return [slots[index], next => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }];
    },
    useRef(value) { const index = cursor++; return slots[index] ??= { current: value }; },
    useMemo(factory, dependencies) {
      const index = cursor++;
      if (!slots[index] || dependencies.some((value, position) => value !== slots[index].dependencies[position])) {
        slots[index] = { value: factory(), dependencies };
      }
      return slots[index].value;
    },
    useCallback(callback, dependencies) { return hooks.useMemo(() => callback, dependencies); },
    useEffect(effect, dependencies) {
      const index = cursor++;
      if (!slots[index] || dependencies.some((value, position) => value !== slots[index].dependencies[position])) {
        pendingEffects.push(() => {
          slots[index]?.cleanup?.();
          slots[index] = { dependencies, cleanup: effect() };
        });
      }
    },
  };
  const clone = value => structuredClone(value);
  const harness = {
    remote, notices, timers, intervals,
    advance(milliseconds) {
      clientNow += milliseconds;
      for (const callback of intervals.values()) callback();
    },
    getBehavior: async () => clone(remote),
    saveBehavior: async payload => {
      remote.revision += 1;
      remote.answers = savePolicy.applyLocalChanges(remote.answers, payload.changes);
      remote.progress = { currentQuestionKey: payload.currentQuestionKey };
      return { revision: remote.revision, progress: clone(remote.progress) };
    },
    submitBehavior: async () => {
      remote.status = 'SUBMITTED';
      remote.canAnswer = false;
      return { status: 'SUBMITTED' };
    },
    render() {
      cursor = 0;
      const tree = session.type(session.props);
      const context = tree.props.value;
      harness.timerSeconds = tree.props.children.props.value;
      const effects = pendingEffects;
      pendingEffects = [];
      effects.forEach(commit => commit());
      return context;
    },
    unmount() { slots.forEach(slot => slot?.cleanup?.()); },
  };
  const api = {
    get: (...args) => harness.getBehavior(...args),
    saveProgress: (...args) => harness.saveBehavior(args[1]),
    submit: (...args) => harness.submitBehavior(args[1]),
    result: async () => ({ status: 'SUBMITTED', attemptId: remote.attemptId }),
  };
  const mockWindow = {
    setTimeout: (callback, delay) => { timers.set(++timerId, { callback, delay }); return timerId; },
    clearTimeout: id => timers.delete(id),
    setInterval: callback => { intervals.set(++timerId, callback); return timerId; },
    clearInterval: id => intervals.delete(id),
    addEventListener: () => {}, removeEventListener: () => {},
  };
  const jsx = (type, props) => ({ type, props });
  const mocks = {
    react: hooks,
    'react-router-dom': { useSearchParams: () => [new URLSearchParams('attemptId=attempt-1')] },
    '../../../context/ToastContext.jsx': { useToast: () => toast },
    '../../../services/apiError.js': { normalizeApiError },
    '../services/testAttemptsApi.js': { testAttemptsApi: api },
    '../utils/attemptTime.js': { remainingSeconds },
    '../utils/attemptSavePolicy.js': savePolicy,
    './testAttemptContextStore.js': { AttemptTimerContext: { Provider: 'timer' }, TestAttemptContext: { Provider: 'context' } },
    'react/jsx-runtime': { jsx, jsxs: jsx },
  };
  const autosaveModule = { exports: {} };
  runInNewContext(autosaveCompiled, { module: autosaveModule, require: name => mocks[name], window: mockWindow });
  mocks['./useAttemptAutosave.js'] = autosaveModule.exports;
  const module = { exports: {} };
  runInNewContext(compiled, { module, require: name => mocks[name], window: mockWindow,
    document: { addEventListener() {}, removeEventListener() {} }, AbortController, Date: ClockDate, URLSearchParams });
  const session = module.exports.TestAttemptProvider({ expectedComponent: remote.component });
  return harness;
}

async function mounted(harness) {
  harness.render();
  await settle();
  return harness.render();
}

test('Reading countdown uses the server deadline, continues through Part changes and locks at zero', async () => {
  const harness = attemptHarness({ component: 'READING', expiresAt: '2026-10-11T10:35:00Z', serverTime: '2026-10-11T10:00:00Z' });
  await mounted(harness);
  let context = harness.render();
  assert.equal(harness.timerSeconds, 35 * 60);
  harness.advance(65_000);
  context = harness.render();
  assert.equal(harness.timerSeconds, 35 * 60 - 65);
  context.setAnswer('p2:q1', { kind: 'MATCH', optionId: 'A' });
  harness.render();
  assert.equal(harness.timerSeconds, 35 * 60 - 65, 'changing Part does not restart the timer');
  harness.advance(40 * 60_000);
  context = harness.render();
  assert.equal(harness.timerSeconds, 0);
  assert.equal(context.timeExpired, true);
  context.setAnswer('p2:q1', { kind: 'MATCH', optionId: 'B' });
  assert.equal(harness.render().answers['p2:q1'].optionId, 'A', 'expired answers stay locked');
  harness.unmount();
  assert.equal(harness.intervals.size, 0);
});

test('reloading a Reading attempt keeps only the remaining server time, not a fresh 35 minutes', async () => {
  const harness = attemptHarness({ component: 'READING', expiresAt: '2026-10-11T10:35:00Z', serverTime: '2026-10-11T10:12:00Z' });
  await mounted(harness);
  harness.render();
  assert.equal(harness.timerSeconds, 23 * 60);
  harness.unmount();
});

test('batch swaps update and autosave both positions together for exam and practice', async () => {
  for (const purpose of ['EXAM', 'PRACTICE']) {
    const match = optionId => ({ kind: 'MATCH', optionId });
    const harness = attemptHarness({ purpose, answers: { 'p2:q2': match('A'), 'p2:q3': match('B') } });
    const context = await mounted(harness);
    context.setAnswerBatch({ 'p2:q2': match('B'), 'p2:q3': match('A') });
    assert.deepEqual(harness.render().answers, { 'p2:q2': match('B'), 'p2:q3': match('A') });
    let saved;
    const save = harness.saveBehavior;
    harness.saveBehavior = async payload => { saved = payload; return save(payload); };
    await context.flush();
    assert.deepEqual(saved.changes, { 'p2:q2': match('B'), 'p2:q3': match('A') });
    assert.deepEqual(harness.remote.answers, { 'p2:q2': match('B'), 'p2:q3': match('A') });
    harness.unmount();
  }
});

test('batch functional updates see latest answers even before another render', async () => {
  const harness = attemptHarness();
  const context = await mounted(harness);
  context.setAnswer('q2', answer('A'));
  context.setAnswerBatch(latest => ({ q3: latest.q2, q2: null }));
  assert.deepEqual(harness.render().answers, { q3: answer('A') });
  await context.flush();
  assert.deepEqual(harness.remote.answers, { q3: answer('A') });
  harness.unmount();
});

test('batch updates cannot change a submitted or non-answerable attempt', async () => {
  for (const initial of [{ canAnswer: false }, { status: 'SUBMITTED', canAnswer: false }]) {
    const harness = attemptHarness(initial), context = await mounted(harness);
    context.setAnswerBatch({ q2: answer('A'), q3: answer('B') });
    assert.deepEqual(harness.render().answers, {});
    harness.unmount();
  }
});

test('a lost save response followed by more typing does not create a false conflict', async () => {
  const harness = attemptHarness();
  let context = await mounted(harness);
  const save = harness.saveBehavior;
  harness.saveBehavior = async payload => { await save(payload); throw networkError(); };
  context.setAnswer('p2:q1', answer('A'));
  await assert.rejects(context.flush());
  context = harness.render();
  context.setAnswer('p2:q1', answer('B'));
  harness.saveBehavior = save;
  await context.flush();
  context = harness.render();
  assert.equal(context.saveStatus, 'saved');
  assert.equal(context.answers['p2:q1'].text, 'B');
  assert.equal(harness.remote.answers['p2:q1'].text, 'B');
  harness.unmount();
});

test('keep my version saves the entire local version shown to the learner', async () => {
  const harness = attemptHarness({ answers: { 'p4:q1': answer('old informal'), 'p4:q2': answer('old formal') } });
  let context = await mounted(harness);
  harness.remote.answers['p4:q2'] = answer('remote formal');
  harness.remote.revision = 1;
  context.setAnswer('p4:q1', answer('my informal'));
  const save = harness.saveBehavior;
  harness.saveBehavior = async () => { throw conflictError(); };
  await assert.rejects(context.flush());
  context = harness.render();
  assert.equal(context.saveStatus, 'conflict');
  context.resolveSaveConflict('local');
  context = harness.render();
  assert.equal(context.answers['p4:q2'].text, 'old formal', 'the local selection must remain visible before it is saved');
  harness.saveBehavior = save;
  await context.flush();
  assert.equal(harness.remote.answers['p4:q2'].text, 'old formal', 'server after keeping the local version');
  context = harness.render();
  assert.equal(context.saveStatus, 'saved');
  assert.equal(context.answers['p4:q2'].text, 'old formal');
  assert.equal(harness.remote.answers['p4:q2'].text, 'old formal');
  harness.unmount();
});

test('an in-flight failure after unmount cannot schedule another retry', async () => {
  const harness = attemptHarness();
  const context = await mounted(harness);
  let rejectSave;
  harness.saveBehavior = () => new Promise((resolve, reject) => { rejectSave = reject; });
  context.setAnswer('p2:q1', answer('text'));
  const flushing = context.flush();
  await settle();
  harness.unmount();
  rejectSave(networkError());
  await flushing;
  assert.equal(harness.timers.size, 0);
  assert.equal(harness.notices.length, 0);
});

test('a lost submit response is checked against the server before editing resumes', async () => {
  const harness = attemptHarness();
  let context = await mounted(harness);
  harness.submitBehavior = async () => {
    harness.remote.status = 'SUBMITTED';
    harness.remote.canAnswer = false;
    throw networkError();
  };
  assert.equal((await context.submit()).status, 'SUBMITTED');
  context = harness.render();
  assert.equal(context.submissionState, 'submitted');
  context.setAnswer('p2:q1', answer('late edit'));
  assert.equal(context.answers['p2:q1'], undefined);
  harness.unmount();
});

test('submit waits until every answer typed during an active save is persisted', async () => {
  const harness = attemptHarness();
  const context = await mounted(harness);
  let finishFirstSave;
  const save = harness.saveBehavior;
  let saveCount = 0;
  harness.saveBehavior = payload => {
    saveCount += 1;
    if (saveCount === 1) return new Promise(resolve => { finishFirstSave = () => void save(payload).then(resolve); });
    return save(payload);
  };
  context.setAnswer('p2:q1', answer('A'));
  const first = context.flush();
  await settle();
  context.setAnswer('p2:q1', answer('B'));
  const submission = context.submit();
  await settle();
  assert.equal(harness.remote.status, 'IN_PROGRESS');
  finishFirstSave();
  await first;
  await submission;
  assert.equal(harness.remote.answers['p2:q1'].text, 'B');
  assert.equal(saveCount, 2);
  harness.unmount();
});

test('a worker submission observed during recovery locks the local attempt', async () => {
  const harness = attemptHarness();
  let context = await mounted(harness);
  context.setAnswer('p2:q1', answer('before deadline'));
  harness.saveBehavior = async () => {
    harness.remote.status = 'SUBMITTED';
    harness.remote.canAnswer = false;
    throw conflictError();
  };
  await context.flush();
  context = harness.render();
  assert.equal(context.submissionState, 'submitted');
  assert.equal(context.attempt.status, 'SUBMITTED');
  harness.unmount();
});

test('expiry during a revision conflict discards unsaved edits and allows server finalization', async () => {
  const harness = attemptHarness();
  let context = await mounted(harness);
  context.setAnswer('p2:q1', answer('too late'));
  harness.saveBehavior = async () => {
    harness.remote.canAnswer = false;
    harness.remote.revision += 1;
    throw conflictError();
  };
  await context.flush();
  context = harness.render();
  assert.equal(context.timeExpired, true);
  assert.notEqual(context.saveStatus, 'conflict');
  assert.equal(context.answers['p2:q1'], undefined);
  const result = await context.submit({ expired: true });
  assert.equal(result.status, 'SUBMITTED');
  harness.unmount();
});

test('uncertain submit keeps editing locked until a later server check succeeds', async () => {
  const harness = attemptHarness();
  let context = await mounted(harness);
  harness.submitBehavior = async () => { throw networkError(); };
  harness.getBehavior = async () => { throw networkError(); };
  await assert.rejects(context.submit());
  context = harness.render();
  assert.equal(context.submissionState, 'verifying');
  context.setAnswer('p2:q1', answer('must remain locked'));
  assert.equal(context.answers['p2:q1'], undefined);
  harness.remote.status = 'SUBMITTED';
  harness.remote.canAnswer = false;
  harness.getBehavior = async () => structuredClone(harness.remote);
  assert.equal((await context.reconcileSubmission()).status, 'SUBMITTED');
  context = harness.render();
  assert.equal(context.submissionState, 'submitted');
  harness.unmount();
});

test('an ambiguous submit with a changed server draft requires explicit conflict resolution', async () => {
  const harness = attemptHarness({ answers: { 'p2:q1': answer('local answer') } });
  let context = await mounted(harness);
  harness.submitBehavior = async () => {
    harness.remote.revision += 1;
    harness.remote.answers['p2:q1'] = answer('another tab');
    throw networkError();
  };
  await assert.rejects(context.submit());
  context = harness.render();
  assert.equal(context.submissionState, 'idle');
  assert.equal(context.saveStatus, 'conflict');
  context.setAnswer('p2:q1', answer('must not overwrite unseen changes'));
  assert.equal(context.answers['p2:q1'].text, 'local answer');
  context.resolveSaveConflict('server');
  context = harness.render();
  assert.equal(context.answers['p2:q1'].text, 'another tab');
  assert.equal(context.saveStatus, 'saved');
  harness.unmount();
});

test('large valid Writing answers are saved in bounded sequential batches', async () => {
  const harness = attemptHarness();
  const save = harness.saveBehavior;
  const batches = [];
  harness.saveBehavior = async payload => {
    batches.push(payload);
    return save(payload);
  };
  const context = await mounted(harness);
  context.setAnswer('p4:q1', answer('\u0001'.repeat(4_000)));
  context.setAnswer('p4:q2', answer('\u0001'.repeat(8_000)));
  await context.flush();
  assert.equal(batches.length, 2);
  assert.deepEqual(batches.map(batch => batch.expectedRevision), [0, 1]);
  assert.equal(harness.remote.answers['p4:q1'].text.length, 4_000);
  assert.equal(harness.remote.answers['p4:q2'].text.length, 8_000);
  harness.unmount();
});

test('a late in-progress check cannot reopen a submitted attempt', async () => {
  const harness = attemptHarness();
  let context = await mounted(harness);
  const stale = structuredClone(harness.remote);
  let resolveCheck;
  let checks = 0;
  harness.getBehavior = () => {
    checks += 1;
    return new Promise(resolve => { resolveCheck = () => resolve(stale); });
  };
  const firstCheck = context.reconcileSubmission();
  const secondCheck = context.reconcileSubmission();
  assert.equal(checks, 1, 'concurrent callers share one status request');
  assert.equal(firstCheck, secondCheck);
  await context.submit();
  resolveCheck();
  await firstCheck;
  context = harness.render();
  assert.equal(context.submissionState, 'submitted');
  assert.equal(context.attempt.status, 'SUBMITTED');
  context.setAnswer('p2:q1', answer('late edit'));
  assert.equal(context.answers['p2:q1'], undefined);
  harness.unmount();
});

test('an open save conflict can be finalized after expiry by the worker', async () => {
  const harness = attemptHarness();
  let context = await mounted(harness);
  context.setAnswer('p2:q1', answer('local'));
  harness.remote.revision = 1;
  harness.remote.answers['p2:q1'] = answer('server');
  harness.saveBehavior = async () => { throw conflictError(); };
  await assert.rejects(context.flush());
  assert.equal(harness.render().saveStatus, 'conflict');
  harness.remote.status = 'SUBMITTED';
  harness.remote.canAnswer = false;
  const result = await context.submit({ expired: true });
  assert.equal(result.status, 'SUBMITTED');
  context = harness.render();
  assert.equal(context.attempt.status, 'SUBMITTED');
  harness.unmount();
});

test('an open save conflict submits only server-saved answers after expiry', async () => {
  const harness = attemptHarness();
  let context = await mounted(harness);
  context.setAnswer('p2:q1', answer('unsaved local'));
  harness.remote.revision = 1;
  harness.remote.answers['p2:q1'] = answer('saved on server');
  harness.saveBehavior = async () => { throw conflictError(); };
  await assert.rejects(context.flush());
  harness.remote.canAnswer = false;
  let submitted = 0;
  harness.submitBehavior = async () => {
    submitted += 1;
    assert.equal(harness.remote.answers['p2:q1'].text, 'saved on server');
    harness.remote.status = 'SUBMITTED';
    return { status: 'SUBMITTED' };
  };
  assert.equal((await context.submit({ expired: true })).status, 'SUBMITTED');
  assert.equal(submitted, 1);
  context = harness.render();
  assert.equal(context.saveStatus, 'saved');
  harness.unmount();
});

test('autosave checks the server after another tab submits the attempt', async () => {
  const harness = attemptHarness();
  let context = await mounted(harness);
  context.setAnswer('p2:q1', answer('local'));
  harness.saveBehavior = async () => {
    harness.remote.status = 'SUBMITTED';
    harness.remote.canAnswer = false;
    throw submittedConflictError();
  };
  await context.flush();
  context = harness.render();
  assert.equal(context.attempt.status, 'SUBMITTED');
  assert.equal(context.submissionState, 'submitted');
  harness.unmount();
});

test('unmount while submit waits for autosave does not send a late submit request', async () => {
  const harness = attemptHarness();
  const context = await mounted(harness);
  const save = harness.saveBehavior;
  let releaseSave;
  let submitCount = 0;
  harness.saveBehavior = payload => new Promise(resolve => {
    releaseSave = () => void save(payload).then(resolve);
  });
  harness.submitBehavior = async () => {
    submitCount += 1;
    return { status: 'SUBMITTED' };
  };
  context.setAnswer('p2:q1', answer('local'));
  const saving = context.flush();
  await settle();
  const submitting = context.submit();
  harness.unmount();
  releaseSave();
  await saving;
  assert.equal(await submitting, null);
  assert.equal(submitCount, 0);
});
