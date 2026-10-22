import { withUiTranslationMocks } from "../../../../tests/helpers/mockUiTranslation.js";
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { transformSync } from 'esbuild';

const source = transformSync(readFileSync(new URL('./useAssessmentPolling.js', import.meta.url), 'utf8'), { format: 'cjs' }).code;
const settle = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };
function harness(component = 'WRITING') {
  const slots = [], effects = [], timers = new Map(), listeners = new Map();
  let cursor = 0, now = 0, id = 0, response = { component, gradingStatus: 'QUEUED' }, failure = false, calls = 0;
  const document = { hidden: false, addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) };
  const hooks = {
    useState(initial) { const n = cursor++; if (!(n in slots)) slots[n] = initial;
      return [slots[n], next => { slots[n] = typeof next === 'function' ? next(slots[n]) : next; }]; },
    useCallback(fn) { cursor++; return fn; },
    useEffect(fn, deps) { const n = cursor++; if (!slots[n] || deps.some((v, i) => v !== slots[n].deps[i])) {
      effects.push(() => { slots[n]?.cleanup?.(); slots[n] = { deps, cleanup: fn() }; });
    } },
  };
  const api = { result: async () => { calls++; if (failure) throw new Error('offline'); return response; } };
  const module = { exports: {} };
  runInNewContext(source, { module, AbortController, Date: { now: () => now, parse: Date.parse }, document,
    window: { setTimeout: fn => { timers.set(++id, fn); return id; }, clearTimeout: n => timers.delete(n) },
    require: withUiTranslationMocks(name => name === 'react' ? hooks : { normalizeApiError: e => ({ message: e.message }) }) });
  function render(attempt = 'one', practice = false) {
    cursor = 0;
    const result = module.exports.useAssessmentPolling(attempt, api, component, practice);
    effects.splice(0).forEach(fn => fn());
    return result;
  }
  return { render, timers, listeners, document, set response(v) { response = v; }, set failure(v) { failure = v; },
    set now(v) { now = v; }, get calls() { return calls; },
    async tick() { const [n, fn] = timers.entries().next().value; timers.delete(n); await fn(); await settle(); },
    dispose() { slots.forEach(slot => slot?.cleanup?.()); } };
}

test('Writing and Speaking stop polling on completion and preserve data with a visible network error', async () => {
  for (const component of ['WRITING', 'SPEAKING']) {
    const h = harness(component);
    assert.equal(h.render().loading, true); await settle();
    assert.equal(h.render().data.gradingStatus, 'QUEUED');
    h.failure = true; await h.tick();
    assert.equal(h.render().error, 'offline');
    assert.equal(h.render().data.gradingStatus, 'QUEUED');
    h.failure = false; h.response = { component, gradingStatus: 'COMPLETED', result: { method: 'AI' } };
    await h.tick(); assert.equal(h.render().error, ''); assert.equal(h.timers.size, 0);
    h.dispose(); assert.equal(h.listeners.size, 0);
  }
});

test('long wait is explicit, refresh starts a new session, hidden tabs pause and attempt keys isolate data', async () => {
  const h = harness(); h.render(); await settle();
  h.now = 300001; await h.tick();
  assert.equal(h.render().paused, true); assert.equal(h.timers.size, 0);
  h.render().refresh(); h.render(); await settle();
  assert.equal(h.render().paused, false);
  const calls = h.calls; h.document.hidden = true; await h.tick(); assert.equal(h.calls, calls);
  h.document.hidden = false; h.listeners.get('visibilitychange')(); await settle(); assert.equal(h.calls, calls + 1);
  assert.equal(h.render('two', true).data, null); await settle();
  assert.equal(h.render('two', true).data.component, 'WRITING');
  h.dispose(); assert.equal(h.timers.size, 0);
});

test('scheduled retry extends polling, and returning to a paused tab rechecks without a submission', async () => {
  const h = harness('SPEAKING');
  h.response = { component: 'SPEAKING', gradingStatus: 'QUEUED', assessment: { nextRetryAt: new Date(600000).toISOString() } };
  h.render(); await settle();
  h.now = 300001; await h.tick();
  assert.equal(h.render().paused, false);
  h.now = 900001; await h.tick();
  assert.equal(h.render().paused, true);
  h.response = { component: 'SPEAKING', gradingStatus: 'COMPLETED' };
  const before = h.calls;
  h.listeners.get('visibilitychange')(); await settle();
  assert.equal(h.calls, before + 1);
  assert.equal(h.render().data.gradingStatus, 'COMPLETED');
  assert.equal(h.timers.size, 0);
  h.dispose();
});
