import test from 'node:test';
import { shuffleSentences } from '../src/features/module-reading/utils/shuffleSentences.js';
import { countWords, withinTextLimit } from '../src/features/admin/reading/utils/textLimits.js';
import { buildPassage, getPassageSegments } from '../src/features/admin/reading/utils/passageSegments.js';
import assert from 'node:assert/strict';
import {calculateScore} from '../src/features/module-reading/services/gradingService.js';
import {readFileSync} from 'node:fs';
import {createReadingDraft} from '../src/features/admin/reading/data/readingTestModel.js';
import {validateReadingTest,validateReadingPart} from '../src/features/admin/reading/validation/readingValidation.js';
import {saveStoredReadingTest,getStoredReadingTests,deleteStoredReadingTest,normalizeReadingTest} from '../src/features/admin/reading/data/readingTestStorage.js';
const fixture=JSON.parse(readFileSync(new URL('../src/features/module-reading/services/mockData/testData.json',import.meta.url),'utf8'));
function validDraft(mode='full'){const draft={...createReadingDraft(mode),...structuredClone(fixture),id:undefined,mode,details:{title:'QA Reading',source:'Unit test'}};draft.part3.posts=['First opinion','Second opinion','Third opinion','Fourth opinion'];return draft}
test('empty draft cannot be published',()=>assert.ok(validateReadingTest(createReadingDraft()).length));
test('legacy Part 4 data keeps seven assigned headings and removes the old extra heading', () => {
  const legacy = validDraft();
  legacy.part4.headings.push({ id: 'h8', text: 'Old extra heading', correctParagraph: '' });
  const normalized = normalizeReadingTest(legacy);
  assert.equal(normalized.part4.headings.length, 7);
  assert.ok(normalized.part4.headings.every(heading => heading.correctParagraph));
  assert.equal(legacy.part4.headings.length, 8);
});
test('passage segments hide markers from admins without changing the test schema', () => {
  const segments = ['Before ', ' between 1 ', ' between 2 ', ' between 3 ', ' between 4 ', ' after'];
  const passage = buildPassage(segments);
  assert.equal(passage, 'Before [1] between 1 [2] between 2 [3] between 3 [4] between 4 [5] after');
  assert.deepEqual(getPassageSegments(passage), segments);
});
test('shuffle excludes the example, preserves IDs and correct answers, and leaves source unchanged', () => {
  const original = structuredClone(fixture.part2.sentences);
  const shuffled = shuffleSentences(original, () => 0.99);
  assert.equal(shuffled.length, 5);
  assert.ok(shuffled.every(s => s.correctPosition !== 1));
  assert.notDeepEqual(shuffled.map(s => s.id), original.slice(1).map(s => s.id));
  assert.deepEqual(original, fixture.part2.sentences);
  assert.deepEqual([...shuffled].sort((a,b) => a.correctPosition-b.correctPosition), original.slice(1).sort((a,b) => a.correctPosition-b.correctPosition));
});
test('word limits handle multiline and reject oversized content', () => {
  assert.equal(countWords(' first\nsecond   third '), 3);
  assert.equal(withinTextLimit('first\nsecond', 2), true);
  assert.equal(withinTextLimit('first second third', 2), false);
  const draft = validDraft();
  draft.part4.headings[0].text = 'word '.repeat(51);
  assert.ok(validateReadingPart(4, draft.part4).some(error => error.includes('50 words')));
});
test('created test answer schema is compatible with scoring for every mode', () => {
  const draft = validDraft();
  const answers = {};
  draft.part1.questions.forEach(q => { answers[q.id] = q.answer; });
  draft.part2.sentences.forEach(s => { if (s.correctPosition > 1) answers[s.id] = s.correctPosition; });
  draft.part3.questions.forEach(q => { answers[q.id] = q.answer; });
  draft.part4.headings.forEach(h => { if (h.correctParagraph) answers[h.correctParagraph] = h.id; });
  for (const [mode, count] of [['part1', 5], ['part2', 5], ['part3', 7], ['part4', 7], ['full', 24]]) {
    const result = calculateScore(answers, draft, mode);
    assert.equal(result.overall.total, count);
    assert.equal(result.overall.score, count);
    assert.equal(calculateScore({}, draft, mode).overall.score, 0);
  }
});
test('all part modes and full test accept valid data',()=>{for(const mode of ['part1','part2','part3','part4','full'])assert.deepEqual(validateReadingTest(validDraft(mode)),[])});
test('part-only validation ignores incomplete other parts',()=>{const draft=createReadingDraft('part1');draft.details={title:'Part 1',source:'QA'};draft.part1=fixture.part1;assert.deepEqual(validateReadingTest(draft),[])});
test('gap markers and duplicate options rejected',()=>{const draft=validDraft();draft.part1.passage+=' [1]';assert.ok(validateReadingPart(1,draft.part1).length);draft.part1=structuredClone(fixture.part1);draft.part1.questions[0].options[1]=draft.part1.questions[0].options[0];assert.ok(validateReadingPart(1,draft.part1).length)});
test('duplicate sentence positions rejected',()=>{const draft=validDraft();draft.part2.sentences[2].correctPosition=2;assert.ok(validateReadingPart(2,draft.part2).length)});
test('invalid speaker and duplicate heading assignments rejected',()=>{const draft=validDraft();draft.part3.questions[0].answer='Missing';assert.ok(validateReadingPart(3,draft.part3).length);draft.part4.headings[1].correctParagraph=draft.part4.headings[0].correctParagraph;assert.ok(validateReadingPart(4,draft.part4).length)});
test('storage creates, updates same id and deletes without browser data',()=>{const memory=new Map();globalThis.localStorage={getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)};globalThis.window={dispatchEvent:()=>{}};const first=saveStoredReadingTest(validDraft('part2'));assert.equal(first.section,'Part 2');assert.equal(getStoredReadingTests().length,1);const edited=saveStoredReadingTest({...first,details:{...first.details,title:'Updated'}});assert.equal(first.id,edited.id);assert.equal(getStoredReadingTests().length,1);assert.equal(getStoredReadingTests()[0].name,'Updated');deleteStoredReadingTest(first.id);assert.equal(getStoredReadingTests().length,0)});
