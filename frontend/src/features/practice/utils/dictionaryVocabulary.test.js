import test from 'node:test';
import assert from 'node:assert/strict';
import { dictionaryWordItem, hasDictionaryWord } from './dictionaryVocabulary.js';

test('dictionary saves the selected word with Vietnamese meanings, phonetic, part of speech and example', () => {
  assert.deepEqual(dictionaryWordItem(' Correct ', { entries: [{ phonetics: [{ text: '/kəˈrekt/' }],
    meanings: [{ partOfSpeech: 'adjective', definitions: [{ definition: 'English definition', example: 'Your answer is correct.' }] }] }],
    translations: [{ partOfSpeech: 'adjective', terms: ['đúng', '正确', 'đúng'] }, { partOfSpeech: 'verb', terms: ['sửa'] }] }),
  { kind: 'WORD', word: 'correct', meaning: 'đúng; sửa', pronunciation: '/kəˈrekt/', type: 'adjective', example: 'Your answer is correct.' });
});
test('missing Vietnamese translations cannot silently save an English definition as Vietnamese', () => {
  assert.equal(dictionaryWordItem('high', { entries: [{ meanings: [{ definitions: [{ definition: 'Above average.' }] }] }] }).meaning, '');
  assert.equal(dictionaryWordItem('high', null).meaning, '');
});
test('dictionary metadata supports fallback examples and respects study DTO field limits', () => {
  const item = dictionaryWordItem('high', { examples: ['An example.'], entries: [{ phonetic: '/haɪ/' }],
    translations: [{ partOfSpeech: 'adjective', terms: ['cao'] }] });
  assert.equal(item.example, 'An example.'); assert.equal(item.pronunciation, '/haɪ/');
  assert.equal(dictionaryWordItem('word', { translations: [{ terms: ['a'.repeat(6000)] }] }).meaning.length, 5000);
});
test('already-saved checks are case-insensitive and scoped to the selected folder', () => {
  const words = [{ word: 'Correct', folderId: 'folder-a' }];
  assert.equal(hasDictionaryWord(words, 'folder-a', ' correct '), true);
  assert.equal(hasDictionaryWord(words, 'folder-b', 'correct'), false);
});
