import test from 'node:test';
import assert from 'node:assert/strict';
import { hasLegacyStudyData, readLegacyStudyData } from './legacyStudyImport.js';

const storage = values => ({ getItem: key => values[key] ?? null });
test('no legacy data is detected on a fresh browser', () => {
  assert.equal(hasLegacyStudyData(storage({})), false);
});
test('imports custom content, overrides, saved/deleted state and latest scores without writing to storage', () => {
  const values = {
    'aptimate.dictation.customWords': JSON.stringify([{ id: 'custom-1', word: 'achievement', topic: 'Daily life', meaning: 'thành tựu' }]),
    'aptimate.dictation.itemOverrides': JSON.stringify({ usually: { word: 'normally' } }),
    'aptimate.dictation.savedWords': JSON.stringify(['usually', 'custom-1']),
    'aptimate.dictation.deletedSentences': JSON.stringify(['weekend-plans']),
    'aptimate.dictation.progress': JSON.stringify({ 'daily-routine': { attempts: 2, lastAccuracy: 0, bestAccuracy: 100 } }),
    'aptimate.dictation.flashcards': JSON.stringify({ usually: 'know' }),
  };
  const before = JSON.stringify(values), s = storage(values);
  assert.equal(hasLegacyStudyData(s), true);
  const result = readLegacyStudyData(s);
  assert.equal(result.items.find(i => i.legacyId === 'custom-1').meaning, 'thành tựu');
  assert.equal(result.items.find(i => i.legacyId === 'usually').word, 'normally');
  assert.equal(result.items.find(i => i.legacyId === 'usually').rating, 'KNOWN');
  assert.equal(result.items.find(i => i.legacyId === 'planning').hidden, true);
  assert.equal(result.items.find(i => i.legacyId === 'weekend-plans').hidden, true);
  assert.deepEqual(result.items.find(i => i.legacyId === 'daily-routine').progress, { attempts: 2, lastAccuracy: 0, bestAccuracy: 100 });
  assert.equal(JSON.stringify(values), before);
});
test('malformed legacy values are ignored, duplicate ids cannot produce duplicate import rows', () => {
  const s = storage({ 'aptimate.dictation.customWords': '[{"id":"usually","word":"duplicate"},null]',
    'aptimate.dictation.customTopics': 'not JSON', 'aptimate.dictation.savedWords': '{}',
    'aptimate.dictation.progress': '[1,2,3]' });
  const result = readLegacyStudyData(s);
  assert.equal(result.items.length, 15);
  assert.equal(result.items.filter(i => i.legacyId === 'usually').length, 1);
  assert.equal(result.items.some(i => i.hidden), false);
});
