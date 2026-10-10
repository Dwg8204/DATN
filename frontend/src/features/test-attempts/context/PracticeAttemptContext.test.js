import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { transformSync } from 'esbuild';
import { normalizeApiError } from '../../../services/apiError.js';
import { applyLocalChanges } from '../utils/attemptSavePolicy.js';
import { part2AttemptChanges } from '../../module-reading/utils/part2Placement.js';

const compiled = transformSync(readFileSync(new URL('./PracticeAttemptContext.jsx', import.meta.url), 'utf8'),
  { loader: 'jsx', format: 'cjs', jsx: 'automatic' }).code;
const settle = async () => { for (let step = 0; step < 20; step += 1) await Promise.resolve(); };
const match = optionId => ({ kind: 'MATCH', optionId });
const part = { texts: ['t1', 't2'].map(id => ({ id,
  options: 'ABCDE'.split('').map(label => ({ id: `${id}-${label}` })),
  positions: [2, 3, 4, 5, 6].map(position => ({ key: `${id}:q${position}`, position })),
})) };

function practiceHarness(initial = {}) {
  let cursor = 0;
  const slots = [], updates = [], effects = [];
  const toast = { showError() {} };
  const remote = { attemptId: 'practice-1', component: 'READING', status: 'IN_PROGRESS', canAnswer: true,
    paper: { parts: { 2: part } }, ...initial };
  const hooks = {
    useState(value) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof value === 'function' ? value() : value;
      return [slots[index], next => updates.push(() => {
        slots[index] = typeof next === 'function' ? next(slots[index]) : next;
      })];
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
        effects.push(() => {
          slots[index]?.cleanup?.();
          slots[index] = { dependencies, cleanup: effect() };
        });
      }
    },
  };
  const h = {
    completed: [],
    completeBehavior: async payload => { h.completed.push(structuredClone(payload)); return { status: 'COMPLETED' }; },
    render() {
      updates.splice(0).forEach(commit => commit());
      cursor = 0;
      const context = session.type(session.props).props.value;
      effects.splice(0).forEach(commit => commit());
      return context;
    },
  };
  const jsx = (type, props) => ({ type, props });
  const mocks = {
    react: hooks, 'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-router-dom': { useSearchParams: () => [new URLSearchParams('attemptId=practice-1&practice=true')] },
    '../../../context/ToastContext.jsx': { useToast: () => toast },
    '../../../services/apiError.js': { normalizeApiError },
    '../utils/attemptSavePolicy.js': { applyLocalChanges },
    '../services/practiceAttemptsApi.js': { practiceAttemptsApi: {
      get: async () => structuredClone(remote), complete: (_id, payload) => h.completeBehavior(payload),
      abandon: async () => ({ status: 'ABANDONED' }), reveal: async () => ({ correctAnswer: 'A' }),
    } },
    './testAttemptContextStore.js': { TestAttemptContext: { Provider: 'context' }, AttemptTimerContext: { Provider: 'timer' } },
  };
  const module = { exports: {} };
  runInNewContext(compiled, { module, require: name => mocks[name], AbortController });
  const session = module.exports.PracticeAttemptProvider({ expectedComponent: 'READING' });
  return h;
}

async function mounted(h) { h.render(); await settle(); return h.render(); }
const place = (context, optionId, position) => context.setAnswerBatch(latest => part2AttemptChanges(part, latest, optionId, position));

test('the actual Practice provider accepts a Part 2 drop into an empty gap', async () => {
  const h = practiceHarness(), context = await mounted(h);
  assert.equal(context.isPractice, true);
  assert.equal(typeof context.setAnswerBatch, 'function');
  place(context, 't1-A', 2);
  assert.deepEqual(h.render().answers, { 't1:q2': match('t1-A') });
});

test('Practice batches use the latest state for rapid drops, swaps and bank replacements', async () => {
  const h = practiceHarness(), context = await mounted(h);
  place(context, 't1-A', 2);
  place(context, 't1-B', 3);
  place(context, 't2-A', 2);
  place(context, 't1-A', 3);
  assert.deepEqual(h.render().answers, { 't1:q2': match('t1-B'), 't1:q3': match('t1-A'), 't2:q2': match('t2-A') });
  place(context, 't1-C', 3);
  assert.deepEqual(h.render().answers, { 't1:q2': match('t1-B'), 't1:q3': match('t1-C'), 't2:q2': match('t2-A') });
});

test('Practice moving to an empty gap clears the source and submits the final answers', async () => {
  const h = practiceHarness(), context = await mounted(h);
  place(context, 't1-A', 2);
  place(context, 't1-A', 4);
  const current = h.render();
  assert.deepEqual(current.answers, { 't1:q4': match('t1-A') });
  await current.submit();
  assert.deepEqual(h.completed, [{ answers: { 't1:q4': match('t1-A') }, revealedKeys: [] }]);
  const completed = h.render();
  place(completed, 't1-B', 2);
  assert.deepEqual(h.render().answers, current.answers);
});

test('Practice single-answer writes still work and null removes an answer', async () => {
  const h = practiceHarness(), context = await mounted(h);
  const answer = { kind: 'CHOICE', optionId: 'word' };
  context.setAnswer('p1:q1', answer);
  context.setAnswerBatch(latest => ({ 'p1:q2': latest['p1:q1'], 'p1:q1': null }));
  assert.deepEqual(h.render().answers, { 'p1:q2': answer });
});

test('Practice rejects batch updates while submitting or when it cannot be answered', async () => {
  const locked = practiceHarness({ canAnswer: false }), lockedContext = await mounted(locked);
  place(lockedContext, 't1-A', 2);
  assert.equal(Object.keys(locked.render().answers).length, 0);
  const h = practiceHarness(), context = await mounted(h);
  let finish;
  h.completeBehavior = () => new Promise(resolve => { finish = resolve; });
  const pending = context.submit();
  const submitting = h.render();
  assert.equal(submitting.submitting, true);
  place(submitting, 't1-A', 2);
  assert.equal(Object.keys(h.render().answers).length, 0);
  finish({ status: 'COMPLETED' });
  await pending;
});

test('Practice abandoned sessions cannot accept further drops', async () => {
  const h = practiceHarness(), context = await mounted(h);
  await context.abandon();
  place(h.render(), 't1-A', 2);
  assert.equal(Object.keys(h.render().answers).length, 0);
});
