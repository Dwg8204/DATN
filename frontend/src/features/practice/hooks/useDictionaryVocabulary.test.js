import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { transformSync } from 'esbuild';
import { DEFAULT_VOCABULARY_FOLDER, hasDictionaryWord } from '../utils/dictionaryVocabulary.js';

const compiled = transformSync(readFileSync(new URL('./useDictionaryVocabulary.js', import.meta.url), 'utf8'), { format: 'cjs' }).code;
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const settle = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
const snapshot = (words = []) => ({ topics: [{ id: 'folder', name: 'Private' }], words });
const item = { kind: 'WORD', word: 'correct', meaning: 'đúng', pronunciation: '/kəˈrekt/', type: 'adjective', example: 'Correct answer.' };
function harness() {
  let cursor = 0, effects = [];
  const slots = [], reads = [], writes = [], folders = [];
  const hooks = {
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = initial; return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }]; },
    useRef(value) { const index = cursor++; return slots[index] ??= { current: value }; },
    useEffect(effect, dependencies) {
      const index = cursor++;
      if (!slots[index] || dependencies.some((value, position) => value !== slots[index].dependencies[position])) {
        effects.push(() => { slots[index]?.cleanup?.(); slots[index] = { dependencies, cleanup: effect() }; });
      }
    },
  };
  const api = {
    state: () => { const request = deferred(); reads.push(request); return request.promise; },
    create: dto => { const request = deferred(); writes.push({ ...request, dto }); return request.promise; },
    createTopic: dto => { const request = deferred(); folders.push({ ...request, dto }); return request.promise; },
  };
  const module = { exports: {} };
  runInNewContext(compiled, { module, exports: module.exports, AbortController, crypto: { randomUUID },
    require: path => path === 'react' ? hooks : path.includes('studyApi') ? { studyApi: api } : { DEFAULT_VOCABULARY_FOLDER, hasDictionaryWord } });
  return { reads, writes, folders,
    render(owner = 'A', open = true) { cursor = 0; effects = []; const view = module.exports.useDictionaryVocabulary(owner, open); effects.forEach(effect => effect()); return view; },
    async ready() { this.render(); reads[0].resolve(snapshot()); await settle(); return this.render(); },
    unmount() { slots.forEach(slot => slot?.cleanup?.()); },
  };
}

test('folder reads only start for an authenticated user when the list is open', () => {
  const h = harness(); h.render(null); h.render('A', false); assert.equal(h.reads.length, 0); h.unmount();
});
test('one pending save blocks rapid duplicate clicks and becomes saved only after the server responds', async () => {
  const h = harness(); await h.ready();
  const pending = h.render().save('folder', item);
  assert.equal(await h.render().save('folder', item), null); assert.equal(h.writes.length, 1);
  assert.equal(h.render().feedback, null);
  h.writes[0].resolve({ id: 'saved' }); await pending;
  assert.equal(h.render().words[0].word, 'correct'); assert.equal(h.render().feedback.kind, 'saved'); h.unmount();
});
test('failed save retries the same UUID but re-adding a deleted word uses a new UUID', async () => {
  const h = harness(); await h.ready();
  const first = h.render().save('folder', item); h.writes[0].reject(new Error('offline')); await first;
  assert.equal(h.render().feedback.kind, 'error'); assert.equal(h.render().words.length, 0);
  const retry = h.render().save('folder', item);
  assert.equal(h.writes[0].dto.clientRequestId, h.writes[1].dto.clientRequestId);
  h.writes[1].resolve({ id: 'saved' }); await retry;
  h.render('A', false); h.render(); h.reads[1].resolve(snapshot()); await settle();
  const again = h.render().save('folder', item);
  assert.notEqual(h.writes[2].dto.clientRequestId, h.writes[1].dto.clientRequestId);
  h.writes[2].resolve({ id: 'new' }); await again; h.unmount();
});
test('a read started during a write cannot overwrite the newly saved word', async () => {
  const h = harness(); await h.ready(); const pending = h.render().save('folder', item);
  h.render('A', false); h.render(); h.writes[0].resolve({ id: 'saved' }); await pending;
  h.reads[1].resolve(snapshot()); await settle();
  assert.equal(h.render().words[0].id, 'saved'); h.unmount();
});
test('a late save never leaks data or invalidates reads after changing accounts', async () => {
  const h = harness(); await h.ready(); const pending = h.render().save('folder', item);
  assert.equal(h.render('B').words.length, 0);
  h.writes[0].resolve({ id: 'old A' }); assert.equal(await pending, null);
  h.reads[1].resolve(snapshot([{ id: 'B', word: 'other', folderId: 'folder' }])); await settle();
  assert.equal(h.render('B').words[0].id, 'B'); assert.equal(h.render('B').feedback, null); h.unmount();
});
