import test from 'node:test';
import assert from 'node:assert/strict';
import { builderUrl, createDraftStorage, draftKey, DraftWriter, hasServerConflict, isMatchingDraft } from './builderDraftStorage.js';

const fixture = () => ({
  key: draftKey('admin-1', 'listening', 'draft-1'), schemaVersion: 1, userId: 'admin-1',
  skill: 'listening', draftId: 'draft-1', testId: null, dirty: true,
  test: { mode: 'full', purpose: 'PRACTICE', details: { title: 'Draft', pictureUrl: 'data:image/png;base64,QA==' }, parts: {} },
});

function memoryStorage() {
  const records = new Map();
  let fail = false;
  return {
    records,
    set fail(value) { fail = value; },
    async put(record, expected) {
      if (fail) throw new Error('Quota exceeded');
      if ((records.get(record.key)?.localRevision || 0) !== expected) throw new Error('Draft changed in another tab');
      records.set(record.key, structuredClone(record));
    },
    async move(oldKey, record, expected) {
      if (fail) throw new Error('Quota exceeded');
      if ((records.get(oldKey)?.localRevision || 0) !== expected) throw new Error('Draft changed in another tab');
      records.set(record.key, structuredClone(record));
      if (oldKey !== record.key) records.set(oldKey, { ...record, key: oldKey, testId: null, redirectTestId: record.testId });
    },
    async delete(key, expected) {
      if ((records.get(key)?.localRevision || 0) !== expected) throw new Error('Draft changed in another tab');
      records.delete(key);
    },
  };
}

test('navigation preserves purpose, mode and draft identity across every skill and part', () => {
  for (const skill of ['reading', 'listening', 'speaking', 'writing', 'grammar']) {
    for (const purpose of ['EXAM', 'PRACTICE']) {
      for (const mode of purpose === 'EXAM' ? ['full'] : ['full', 'part1', 'part2']) {
        const value = { mode, purpose };
        for (const part of [undefined, 1, 2]) {
          const url = new URL(builderUrl(skill, value, 'draft-123', part), 'https://example.com');
          assert.equal(url.searchParams.get('purpose'), purpose);
          assert.equal(url.searchParams.get('mode'), mode);
          assert.equal(url.searchParams.get('draftId'), 'draft-123');
          assert.equal(url.pathname, `/admin/tests/new/${skill}${part ? `/part/${part}` : ''}`);
        }
      }
    }
  }
});

test('saved test navigation uses the server id and never a new draft route', () => {
  const url = new URL(builderUrl('reading', { id: 'server-1', mode: 'part2', purpose: 'PRACTICE' }, 'draft-1', 2), 'https://example.com');
  assert.equal(url.pathname, '/admin/tests/reading/server-1/edit/part/2');
  assert.equal(url.searchParams.get('draftId'), null);
});

test('draft lookup is isolated by user, skill, test and schema', () => {
  const record = fixture();
  assert.equal(isMatchingDraft(record, { userId: 'admin-1', skill: 'listening', draftId: 'draft-1' }), true);
  assert.equal(isMatchingDraft(record, { userId: 'admin-2', skill: 'listening' }), false);
  assert.equal(isMatchingDraft(record, { userId: 'admin-1', skill: 'reading' }), false);
  assert.equal(isMatchingDraft(record, { userId: 'admin-1', skill: 'listening', draftId: 'another' }), false);
  assert.equal(isMatchingDraft({ ...record, schemaVersion: 99 }, { userId: 'admin-1', skill: 'listening' }), false);
  assert.equal(isMatchingDraft({ ...record, testId: 'test-1' }, { userId: 'admin-1', skill: 'listening' }), false);
});

test('writes preserve incomplete content and media and cannot race backwards', async () => {
  const storage = memoryStorage();
  const record = fixture();
  const writer = new DraftWriter(storage, record);
  const first = { ...record.test, details: { ...record.test.details, title: 'First' } };
  const last = { ...record.test, details: { ...record.test.details, title: '' }, parts: { 1: { questions: [{ text: '', audioUrl: 'data:audio/wav;base64,QA==' }] } } };
  writer.write(first);
  await writer.write(last);
  first.details.title = 'Changed after enqueue';
  assert.deepEqual(storage.records.get(record.key).test, last);
  assert.equal(storage.records.get(record.key).dirty, true);
});

test('a failed local save stays recoverable and can retry after storage becomes available', async () => {
  const storage = memoryStorage();
  const record = fixture();
  const writer = new DraftWriter(storage, record);
  storage.fail = true;
  await assert.rejects(writer.write(record.test), /Quota/);
  assert.equal(storage.records.size, 0);
  storage.fail = false;
  await writer.write(record.test);
  assert.equal(storage.records.get(record.key).test.details.title, 'Draft');
});

test('creating a server draft retains its id even if publishing later fails', async () => {
  const storage = memoryStorage();
  const record = fixture();
  const writer = new DraftWriter(storage, record);
  await writer.write(record.test);
  const saved = { ...record.test, id: 'test-1', version: 1, status: 'DRAFT' };
  const result = writer.serverSaved(saved, record.test, record.test);
  await result.persisted;
  const persisted = storage.records.get(draftKey('admin-1', 'listening', 'test-1'));
  assert.equal(persisted.test.id, 'test-1');
  assert.equal(persisted.serverVersion, 1);
  assert.equal(persisted.dirty, false);
  assert.equal(storage.records.get(record.key).redirectTestId, 'test-1');
  assert.equal(result.test, saved);
});

test('a delayed server save does not erase edits made during the request', async () => {
  const storage = memoryStorage();
  const record = fixture();
  const writer = new DraftWriter(storage, record);
  const submitted = record.test;
  await writer.write(submitted);
  const newer = { ...submitted, details: { ...submitted.details, title: 'Newer unsaved title' } };
  writer.write(newer);
  const result = writer.serverSaved({ ...submitted, id: 'test-1', version: 2 }, newer, submitted);
  await result.persisted;
  assert.equal(result.test.details.title, 'Newer unsaved title');
  assert.equal(result.test.version, 2);
  assert.equal(writer.record.dirty, true);
});

test('a failed server key migration retries the move with the latest edits', async () => {
  const storage = memoryStorage();
  const record = fixture();
  const writer = new DraftWriter(storage, record);
  await writer.write(record.test);
  storage.fail = true;
  const result = writer.serverSaved({ ...record.test, id: 'test-1', version: 1 }, record.test, record.test);
  await assert.rejects(result.persisted, /Quota/);
  assert.equal(writer.persistedKey, record.key);
  storage.fail = false;
  const edited = { ...result.test, details: { ...result.test.details, title: 'After failed move' } };
  await writer.write(edited);
  assert.equal(storage.records.get(draftKey('admin-1', 'listening', 'test-1')).test.details.title, 'After failed move');
  assert.equal(storage.records.get(record.key).redirectTestId, 'test-1');
  await writer.write({ ...edited, version: 2 });
  assert.equal(writer.persistedRevision, 3);
});

test('discard after a failed key migration deletes the durable old key', async () => {
  const storage = memoryStorage();
  const record = fixture();
  const writer = new DraftWriter(storage, record);
  await writer.write(record.test);
  storage.fail = true;
  const result = writer.serverSaved({ ...record.test, id: 'test-1' }, record.test, record.test);
  await assert.rejects(result.persisted, /Quota/);
  storage.fail = false;
  await writer.complete();
  assert.equal(storage.records.size, 0);
});

test('publishing/discarding deletes only this draft after all queued writes', async () => {
  const storage = memoryStorage();
  const record = fixture();
  const writer = new DraftWriter(storage, record);
  writer.write(record.test);
  await writer.complete();
  await writer.write(record.test);
  assert.equal(storage.records.has(record.key), false);
});

test('a second tab cannot silently overwrite or discard a newer draft', async () => {
  const storage = memoryStorage();
  const record = fixture();
  const first = new DraftWriter(storage, record);
  const second = new DraftWriter(storage, record);
  await first.write(record.test);
  await assert.rejects(second.write({ ...record.test, details: { title: 'Other tab' } }), /another tab/);
  await assert.rejects(second.complete(), /another tab/);
  assert.equal(storage.records.get(record.key).test.details.title, 'Draft');
});

test('only changed dirty drafts require a server conflict decision', () => {
  const record = { ...fixture(), serverVersion: 3 };
  assert.equal(hasServerConflict(record, { version: 4 }), true);
  assert.equal(hasServerConflict(record, { version: 3 }), false);
  assert.equal(hasServerConflict({ ...record, dirty: false }, { version: 4 }), false);
});

test('unavailable IndexedDB reports a storage error instead of a successful save', async () => {
  await assert.rejects(createDraftStorage(null).put(fixture()), /unavailable/);
});
