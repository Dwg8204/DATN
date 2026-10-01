import test from 'node:test';
import assert from 'node:assert/strict';
import { validateExplanations } from '../src/features/admin/shared-test-builder/explanationValidation.js';
import { createGrammarTestDraft } from '../src/features/admin/grammar/data/grammarTestData.js';
import { saveStoredGrammarTest, getStoredGrammarTest } from '../src/features/admin/grammar/data/grammarTestStorage.js';
import { validateGrammarPart } from '../src/features/admin/grammar/data/grammarTestValidation.js';
import { createListeningDraft } from '../src/features/admin/listening/data/listeningTestModel.js';
import { saveStoredListeningTest, getStoredListeningTests } from '../src/features/admin/listening/data/listeningTestStorage.js';
import { validateListeningPart } from '../src/features/admin/listening/validation/listeningValidation.js';
import { createReadingDraft } from '../src/features/admin/reading/data/readingTestModel.js';
import { saveStoredReadingTest, getStoredReadingTests } from '../src/features/admin/reading/data/readingTestStorage.js';
import { validateReadingPart } from '../src/features/admin/reading/validation/readingValidation.js';
import { calculateScore } from '../src/features/module-reading/services/gradingService.js';

function resetStorage() {
  const memory = new Map();
  globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
  globalThis.window = { dispatchEvent() {} };
}

test('optional explanation validation is shared by all objective builders', () => {
  assert.equal(validateExplanations({ questions: [{ id: 1 }] }), '');
  assert.equal(validateExplanations({ explanation: 'Word '.repeat(300) }), '');
  assert.ok(validateExplanations({ explanations: { 'speaker-0': 'word '.repeat(301) } }));
  for (const validate of [validateGrammarPart, validateReadingPart, validateListeningPart]) {
    assert.match(validate(1, { questions: [{ explanation: 'word '.repeat(301) }] })[0], /Explanation/);
  }
});

test('Grammar saves explanations per MCQ and per matching target', () => {
  resetStorage();
  const draft = createGrammarTestDraft();
  draft.details.title = 'Explanation QA';
  draft.parts[1].questions[0].explanation = 'Third-person singular takes goes.';
  draft.parts[2].sets[0].targetWords[0].explanation = 'These two words have the same meaning.';
  const saved = saveStoredGrammarTest(draft);
  const loaded = getStoredGrammarTest(saved.id);
  assert.equal(loaded.parts[1].questions[0].explanation, draft.parts[1].questions[0].explanation);
  assert.equal(loaded.parts[2].sets[0].targetWords[0].explanation, draft.parts[2].sets[0].targetWords[0].explanation);
});

test('Listening saves all four explanation shapes, preserving speaker slot after rename', () => {
  resetStorage();
  const draft = createListeningDraft();
  draft.details.title = 'Explanation QA';
  draft.parts[1].questions[0].explanation = 'Part one evidence.';
  draft.parts[2].explanations = { 'speaker-0': 'Part two evidence.' };
  draft.parts[2].speakers[0] = 'Renamed speaker';
  draft.parts[3].statements[0].explanation = 'Part three evidence.';
  draft.parts[4].recordings[0].subQuestions[0].explanation = 'Part four evidence.';
  saveStoredListeningTest(draft);
  const loaded = getStoredListeningTests()[0];
  assert.equal(loaded.parts[1].questions[0].explanation, 'Part one evidence.');
  assert.equal(loaded.parts[2].explanations['speaker-0'], 'Part two evidence.');
  assert.equal(loaded.parts[3].statements[0].explanation, 'Part three evidence.');
  assert.equal(loaded.parts[4].recordings[0].subQuestions[0].explanation, 'Part four evidence.');
});

test('Reading explanations survive storage and feed all four result details', () => {
  resetStorage();
  const draft = createReadingDraft();
  draft.details.title = 'Explanation QA';
  draft.part1.questions[0].explanation = 'Gap explanation.';
  draft.part2.sentences[1].explanation = 'Ordering explanation.';
  draft.part3.questions[0].explanation = 'Opinion explanation.';
  draft.part4.headings[0].correctParagraph = draft.part4.paragraphs[0].id;
  draft.part4.headings[0].explanation = 'Heading explanation.';
  saveStoredReadingTest(draft);
  const loaded = getStoredReadingTests()[0];
  const results = calculateScore({}, loaded);
  assert.equal(results.part1.details[0].explanation, 'Gap explanation.');
  assert.equal(results.part2.details[0].explanation, 'Ordering explanation.');
  assert.equal(results.part3.details[0].explanation, 'Opinion explanation.');
  assert.equal(results.part4.details[0].explanation, 'Heading explanation.');
  assert.equal(results.part1.details[1].explanation, '');
});
