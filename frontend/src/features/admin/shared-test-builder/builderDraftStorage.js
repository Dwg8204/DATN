const DATABASE = 'aptimate.admin-builder-drafts';
const STORE = 'drafts';
export const DRAFT_SCHEMA_VERSION = 1;

export function draftKey(userId, skill, id) {
  return JSON.stringify([String(userId), skill, id]);
}

export function isMatchingDraft(record, { userId, skill, testId, draftId }) {
  return record?.schemaVersion === DRAFT_SCHEMA_VERSION
    && record.userId === String(userId) && record.skill === skill
    && (testId ? record.testId === testId : !record.testId && (!draftId || record.draftId === draftId))
    && record.test?.details && typeof record.test.details === 'object' && !Array.isArray(record.test.details)
    && ['EXAM', 'PRACTICE'].includes(record.test.purpose)
    && ['full', 'part1', 'part2', ...(skill === 'grammar' ? [] : ['part3', 'part4'])].includes(record.test.mode);
}

export function builderUrl(skill, test, draftId, partNumber) {
  const path = test.id ? `/admin/tests/${skill}/${test.id}/edit` : `/admin/tests/new/${skill}`;
  const query = new URLSearchParams({ purpose: test.purpose, mode: test.mode });
  if (!test.id && draftId) query.set('draftId', draftId);
  return `${path}${partNumber ? `/part/${partNumber}` : ''}?${query}`;
}

export function hasServerConflict(record, server) {
  if (!record?.dirty || !server) return false;
  if (record.serverVersion != null && server.version != null) return record.serverVersion !== server.version;
  return Boolean(record.serverUpdatedAt && server.updatedAt && record.serverUpdatedAt !== server.updatedAt);
}

// IndexedDB stores large image/audio drafts without localStorage's small synchronous quota.
export function createDraftStorage(indexedDB = globalThis.indexedDB) {
  let opening;
  const open = () => {
    if (!indexedDB) return Promise.reject(new Error('Local draft storage is unavailable in this browser.'));
    opening ??= new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'key' });
      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => { database.close(); opening = null; };
        resolve(database);
      };
      request.onerror = () => { opening = null; reject(request.error); };
      request.onblocked = () => { opening = null; reject(new Error('Close other tabs to enable local draft storage.')); };
    });
    return opening;
  };
  const transaction = async (mode, operation) => {
    const database = await open();
    return new Promise((resolve, reject) => {
      const tx = database.transaction(STORE, mode);
      let result;
      let failure;
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error || new Error('Unable to save the local draft.'));
      tx.onabort = () => reject(failure || tx.error || new Error('Local draft transaction was interrupted.'));
      const fail = error => { failure = error; tx.abort(); };
      operation(tx.objectStore(STORE), value => { result = value; }, fail);
    });
  };
  return {
    get: key => transaction('readonly', (store, done) => { store.get(key).onsuccess = event => done(event.target.result); }),
    list: () => transaction('readonly', (store, done) => { store.getAll().onsuccess = event => done(event.target.result); }),
    put: (record, expectedRevision) => transaction('readwrite', (store, done, fail) => {
      store.get(record.key).onsuccess = event => {
        const existing = event.target.result;
        if (expectedRevision != null && (existing?.localRevision || 0) !== expectedRevision) {
          fail(new Error('This draft changed in another tab. Keep this tab open and reload the other tab before continuing.'));
          return;
        }
        store.put(record);
      };
    }),
    delete: (key, expectedRevision) => transaction('readwrite', (store, done, fail) => {
      store.get(key).onsuccess = event => {
        if (expectedRevision != null && (event.target.result?.localRevision || 0) !== expectedRevision) {
          fail(new Error('This draft changed in another tab. It has not been discarded.'));
          return;
        }
        store.delete(key);
      };
    }),
    // Move from a new draft to a server id atomically, so reload cannot create the test twice.
    move: (oldKey, record, expectedRevision) => transaction('readwrite', (store, done, fail) => {
      store.get(oldKey).onsuccess = event => {
        if (expectedRevision != null && (event.target.result?.localRevision || 0) !== expectedRevision) {
          fail(new Error('This draft changed in another tab. The test was saved to the server, but the local draft could not be updated.'));
          return;
        }
        store.put(record);
        // Keep a small redirect for the old URL in browser history, never another editable draft.
        if (oldKey !== record.key) store.put({
          ...record, key: oldKey, testId: null, redirectTestId: record.testId, dirty: false,
          test: { id: record.testId, purpose: record.test.purpose, mode: record.test.mode, details: { title: record.test.details.title } },
        });
      };
    }),
  };
}

export const builderDraftStorage = createDraftStorage();

// Writes are serialized; a delayed older save must never overwrite a newer snapshot.
export class DraftWriter {
  constructor(storage, record) {
    this.sessionId = Symbol('builder-session');
    this.storage = storage;
    this.record = record;
    this.pending = Promise.resolve();
    this.revision = 0;
    this.completed = false;
    this.persistedRevision = record.localRevision || 0;
    this.persistedKey = record.key;
  }

  async persist(record) {
    record.localRevision = this.persistedRevision + 1;
    // A failed move leaves the durable identity unchanged. Retry that same move
    // with the newest snapshot before treating the server key as persisted.
    if (this.persistedKey !== record.key) await this.storage.move(this.persistedKey, record, this.persistedRevision);
    else await this.storage.put(record, this.persistedRevision);
    this.persistedKey = record.key;
    this.persistedRevision = record.localRevision;
  }

  write(test, dirty = true) {
    if (this.completed) return this.pending;
    const record = { ...this.record, test: structuredClone(test), dirty, updatedAt: new Date().toISOString() };
    this.record = record;
    this.revision += 1;
    this.pending = this.pending.catch(() => {}).then(async () => {
      await this.persist(record);
    });
    return this.pending;
  }

  serverSaved(saved, current, submitted) {
    const unchanged = current === submitted;
    const test = unchanged ? saved : { ...current, id: saved.id, version: saved.version, status: saved.status };
    this.record = {
      ...this.record, key: draftKey(this.record.userId, this.record.skill, saved.id), testId: saved.id,
      serverVersion: saved.version, serverUpdatedAt: saved.updatedAt,
      test: structuredClone(test), dirty: !unchanged, updatedAt: new Date().toISOString(),
    };
    const record = this.record;
    this.revision += 1;
    this.pending = this.pending.catch(() => {}).then(async () => {
      await this.persist(record);
    });
    return { test, persisted: this.pending };
  }

  complete() {
    this.completed = true;
    this.pending = this.pending.catch(() => {}).then(() => this.storage.delete(this.persistedKey, this.persistedRevision));
    this.pending.catch(() => { this.completed = false; });
    return this.pending;
  }
}
