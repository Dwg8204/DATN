import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { transformSync } from 'esbuild';

const compiled = transformSync(readFileSync(new URL('./useStudyData.js', import.meta.url), 'utf8'), { format: 'cjs' }).code;
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const settle = async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); };
const snapshot = word => ({ topics: [], words: [{ id: word }], exercises: [], ratings: {}, progress: {} });
function harness() {
  let cursor = 0, effects = [];
  const slots = [], requests = [];
  const hooks = {
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = initial; return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }]; },
    useRef(value) { const index = cursor++; return slots[index] ??= { current: value }; },
    useCallback(callback, dependencies) { const index = cursor++; if (!slots[index] || dependencies.some((value, position) => value !== slots[index].dependencies[position])) slots[index] = { callback, dependencies }; return slots[index].callback; },
    useEffect(effect, dependencies) {
      const index = cursor++;
      if (!slots[index] || dependencies.some((value, position) => value !== slots[index].dependencies[position])) {
        effects.push(() => { slots[index]?.cleanup?.(); slots[index] = { dependencies, cleanup: effect() }; });
      }
    },
  };
  const api = { state: () => { const request = deferred(); requests.push(request); return request.promise; } };
  const module = { exports: {} };
  runInNewContext(compiled, { module, exports: module.exports, AbortController,
    require: path => path === 'react' ? hooks : { studyApi: api } });
  return { requests, render(userId) { cursor = 0; effects = []; const view = module.exports.useStudyData(userId); effects.forEach(effect => effect()); return view; },
    unmount() { slots.forEach(slot => slot?.cleanup?.()); } };
}
test('study API is not called until the user is authenticated', () => {
  const h = harness(); h.render(undefined); assert.equal(h.requests.length, 0);
});
test('switching accounts hides previous content and ignores stale responses', async () => {
  const h = harness(); h.render('A'); h.requests[0].resolve(snapshot('A')); await settle();
  assert.equal(h.render('A').data.words[0].id, 'A');
  const oldRead = h.render('A').refresh();
  assert.equal(h.render('B').data.words.length, 0);
  h.requests[1].resolve(snapshot('stale A')); await oldRead;
  assert.equal(h.render('B').data.words.length, 0);
  h.requests[2].resolve(snapshot('B')); await settle();
  assert.equal(h.render('B').data.words[0].id, 'B'); h.unmount();
});
test('a failed server write is not reported as saved and can be retried', async () => {
  const h = harness(); h.render('A'); h.requests[0].resolve(snapshot('original')); await settle();
  const cause = new Error('offline');
  await assert.rejects(h.render('A').mutate(() => Promise.reject(cause)), /offline/);
  const view = h.render('A'); assert.equal(view.saving, false); assert.equal(view.data.words[0].id, 'original'); h.unmount();
});
test('a successful write followed by failed refresh shows retry state, without duplicating the write', async () => {
  const h = harness(); h.render('A'); h.requests[0].resolve(snapshot('original')); await settle();
  let writes = 0;
  const pending = h.render('A').mutate(async () => { writes++; return { id: 'new' }; }); await settle();
  h.requests[1].reject(new Error('read offline'));
  assert.equal((await pending).id, 'new');
  assert.equal(writes, 1); assert.equal(h.render('A').error.message, 'read offline');
  const retry = h.render('A').refresh(); h.requests[2].resolve(snapshot('new')); await retry;
  assert.equal(h.render('A').error, null); assert.equal(h.render('A').data.words[0].id, 'new'); h.unmount();
});
test('late mutations cannot update another account, even after switching back', async () => {
  const h = harness(); h.render('A'); h.requests[0].resolve(snapshot('A')); await settle();
  const delayed = deferred(), pending = h.render('A').mutate(() => delayed.promise);
  h.render('B'); h.render('A'); delayed.resolve({ id: 'old mutation' });
  assert.equal(await pending, null); assert.equal(h.requests.length, 3); h.unmount();
});
