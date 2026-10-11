import assert from 'node:assert/strict';
import test from 'node:test';
import { readingPercentage, readingResultView, readingOverviewColumns, readingReviewPages, readingReviewAnswer, readingAnswerText } from './readingResultPresentation.js';

const text = id => ({ id, openingSentence: `Opening ${id}`, options: ['A', 'B', 'C', 'D', 'E'].map(label => ({ id: `${id}-${label}`, text: `${id} sentence ${label}` })),
  positions: [2, 3, 4, 5, 6].map((position, index) => ({ key: `${id}:q${index + 1}`, position })) });
const texts = [text('t1'), text('t2')];

test('compact Full Practice overview groups all 29 answers into five columns without changing grades or targets', () => {
  const items = [1, 2, 3, 4].flatMap(partNumber => Array.from({ length: { 1: 5, 2: 10, 3: 7, 4: 7 }[partNumber] }, (_, index) => ({
    key: `p${partNumber}:q${index + 1}`, partNumber, outcome: index === 0 ? 'SKIPPED' : index % 2 ? 'CORRECT' : 'INCORRECT',
    selectedAnswer: index === 0 ? null : { kind: partNumber === 1 ? 'CHOICE' : 'MATCH', optionId: 'internal-id' },
    selectedAnswerText: partNumber === 1 ? 'sunny' : partNumber === 2 ? '<b>(E)</b> A selected sentence.' : partNumber === 3 ? 'Antonio' : 'An overview of the Mars simulation project',
  })));
  const view = readingResultView({ result: { parts: [1, 2, 3, 4].map(partNumber => ({ partNumber })), items } });
  const columns = readingOverviewColumns(view, { compact: true });
  assert.deepEqual(columns.map(column => column.partNumber), [1, 2, 2, 3, 4]);
  assert.deepEqual(columns.map(column => column.items.length), [5, 5, 5, 7, 7]);
  assert.deepEqual(columns.map(column => column.items.map(item => item.number)), [
    [1, 2, 3, 4, 5], [6, 7, 8, 9, 10], [11, 12, 13, 14, 15], [16, 17, 18, 19, 20, 21, 22], [23, 24, 25, 26, 27, 28, 29],
  ]);
  assert.equal(columns[1].items[0].answer, '—');
  assert.equal(columns[1].items[1].answer, 'E');
  assert.equal(columns[2].items[0].key, 'p2:q6');
  assert.equal(columns[3].items[1].answer, 'Antonio');
  assert.equal(columns[4].items[1].answer, 'An overview of the Mars simulation project');
  assert.deepEqual(columns.flatMap(column => column.items.map(item => item.status)), view.items.map(item => item.status));
  assert.equal(view.items[6].answer, '(E) A selected sentence.');
  const normal = readingOverviewColumns(view);
  assert.equal(normal.length, 4);
  assert.equal(normal[1].items[1].answer, '(E) A selected sentence.');
});

test('compact Part 2 only abbreviates explicit answer labels, not internal IDs or unlabelled sentences', () => {
  const view = { parts: [{ partNumber: 2 }], items: ['(C) Chosen sentence', 'D. Another sentence', 'E) Last sentence', 'A day at work', 'Answer unavailable']
    .map((answer, index) => ({ partNumber: 2, key: String(index), answer })) };
  assert.deepEqual(readingOverviewColumns(view, { compact: true })[0].items.map(item => item.answer), ['C', 'D', 'E', 'A day at work', 'Answer unavailable']);
  assert.deepEqual(readingOverviewColumns({ parts: [], items: [] }, { compact: true }), []);
});

test('Reading score presentation uses backend grades rather than recalculating from answers', () => {
  const view = readingResultView({ score: '17', maxScore: '29', result: { counts: { correct: 17, incorrect: 10, skipped: 2 },
    parts: [{ partNumber: 2, score: 7, maxScore: 10 }, { partNumber: 1, score: 5, maxScore: 5 }],
    items: [{ key: 'p1:q1', partNumber: 1, outcome: 'CORRECT', selectedAnswer: { kind: 'CHOICE', optionId: 'o1' } },
      { key: 'p2:q1', partNumber: 2, outcome: 'INCORRECT', selectedAnswer: { kind: 'MATCH', optionId: 'internal-id' } },
      { key: 'p2:q2', partNumber: 2, outcome: 'SKIPPED' }],
  } });
  assert.equal(view.score, 17); assert.equal(view.maximum, 29); assert.equal(view.percentage, 59);
  assert.deepEqual(view.parts.map(part => part.partNumber), [1, 2]);
  assert.deepEqual(view.items.map(item => [item.number, item.status, item.answer]), [[1, 'correct', 'B'], [2, 'wrong', 'Answered'], [3, 'skipped', '—']]);
  assert.deepEqual(view.counts, { correct: 17, incorrect: 10, skipped: 2 });
});

test('partial practice and zero scores do not assume a full test or divide by zero', () => {
  assert.equal(readingResultView(null), null);
  const view = readingResultView({ score: 0, maxScore: 10, result: { items: [], parts: [{ partNumber: 2, score: 0, maxScore: 10 }] } });
  assert.equal(view.percentage, 0); assert.equal(view.parts.length, 1);
  assert.equal(readingPercentage(0, 0), 0); assert.equal(readingPercentage(12, 10), 100);
});

test('Part 2 overview displays selected sentences and keeps server correctness and skips', () => {
  const view = readingResultView({ result: { items: [
    { key: 'p2:q1', partNumber: 2, outcome: 'CORRECT', selectedAnswer: { kind: 'MATCH', optionId: 's1' }, selectedAnswerText: 'I started working at the library.' },
    { key: 'p2:q2', partNumber: 2, outcome: 'INCORRECT', selectedAnswer: { kind: 'MATCH', optionId: 's2' }, selectedAnswerText: 'The library closes at six.' },
    { key: 'p2:q3', partNumber: 2, outcome: 'SKIPPED', selectedAnswer: null, selectedAnswerText: null },
    { key: 'p2:q4', partNumber: 2, outcome: 'INCORRECT', selectedAnswer: { kind: 'MATCH', optionId: 'unknown' }, selectedAnswerText: null },
  ] } });
  assert.deepEqual(view.items.map(item => [item.answer, item.status]), [
    ['I started working at the library.', 'correct'], ['The library closes at six.', 'wrong'],
    ['—', 'skipped'], ['Answer unavailable', 'wrong'],
  ]);
});

test('overview removes editor markup while preserving the selected answer label and sentence', () => {
  const sentence = '<b>(E)</b> The next day, he spent most of the morning walking along the peaceful beach.';
  const result = readingResultView({ result: { items: [{ partNumber: 2, outcome: 'INCORRECT',
    selectedAnswer: { kind: 'MATCH', optionId: 's5' }, selectedAnswerText: sentence }] } });
  assert.equal(result.items[0].answer, '(E) The next day, he spent most of the morning walking along the peaceful beach.');
  assert.equal(result.items[0].status, 'wrong');
  assert.equal(readingAnswerText('<p><strong>(A)</strong>&nbsp;Tom &amp; Jane<br>arrived at &#56;&#x3A;00.</p>'), '(A) Tom & Jane arrived at 8:00.');
  assert.equal(readingAnswerText('<!-- hidden --><script>alert(1)</script><i>Selected sentence</i>'), 'Selected sentence');
  assert.equal(readingAnswerText('The value is 2 < 3.'), 'The value is 2 < 3.');
  assert.equal(readingAnswerText(null), '');
});

test('Part 3 overview resolves speaker labels as plain text and retains server outcomes', () => {
  const view = readingResultView({ result: { items: [
    { partNumber: 3, outcome: 'INCORRECT', selectedAnswer: { kind: 'MATCH', optionId: 'speaker2' }, selectedAnswerText: '<b>B</b>' },
    { partNumber: 3, outcome: 'CORRECT', selectedAnswer: { kind: 'MATCH', optionId: 'speaker1' }, selectedAnswerText: 'A' },
    { partNumber: 3, outcome: 'SKIPPED', selectedAnswer: null, selectedAnswerText: null },
  ] } });
  assert.deepEqual(view.items.map(item => [item.answer, item.status]), [['B', 'wrong'], ['A', 'correct'], ['—', 'skipped']]);
});

test('Part 4 overview displays selected headings with no HTML and keeps correctness', () => {
  const view = readingResultView({ result: { items: [
    { partNumber: 4, outcome: 'INCORRECT', selectedAnswer: { kind: 'MATCH', optionId: 'h2' }, selectedAnswerText: '<b>(B)</b> A day at work' },
    { partNumber: 4, outcome: 'CORRECT', selectedAnswer: { kind: 'MATCH', optionId: 'h1' }, selectedAnswerText: '(A) A new beginning' },
    { partNumber: 4, outcome: 'SKIPPED', selectedAnswer: null, selectedAnswerText: null },
  ] } });
  assert.deepEqual(view.items.map(item => [item.answer, item.status]), [
    ['(B) A day at work', 'wrong'], ['(A) A new beginning', 'correct'], ['—', 'skipped'],
  ]);
});

test('Part 1 practice overview shows actual selected words instead of internal option letters', () => {
  const view = readingResultView({ result: { items: [
    { partNumber: 1, outcome: 'CORRECT', selectedAnswer: { kind: 'CHOICE', optionId: 'o0' }, selectedAnswerText: '<b>happy</b>' },
    { partNumber: 1, outcome: 'INCORRECT', selectedAnswer: { kind: 'CHOICE', optionId: 'o1' }, selectedAnswerText: 'bring' },
    { partNumber: 1, outcome: 'SKIPPED', selectedAnswer: null, selectedAnswerText: null },
  ] } });
  assert.deepEqual(view.items.map(item => [item.answer, item.status]), [['happy', 'correct'], ['bring', 'wrong'], ['—', 'skipped']]);
});

test('Part 4 practice single-page option combines seven questions without changing exam pagination', () => {
  const paragraphs = Array.from({ length: 7 }, (_, index) => ({ key: `p4:q${index + 1}`, label: `Paragraph ${index + 1}`, content: `Text ${index + 1}` }));
  const paper = { paragraphs, headings: [{ id: 'h1', text: 'Heading' }] };
  const items = [...Array.from({ length: 5 }, (_, i) => ({ key: `p1:q${i + 1}` })), ...paragraphs];
  const pages = readingReviewPages(paper, 4, items, { singlePage: true });
  assert.equal(pages.length, 1);
  assert.equal(pages[0].rows.length, 7);
  assert.deepEqual(pages[0].rows.map(row => row.number), [6, 7, 8, 9, 10, 11, 12]);
  assert.equal(pages[0].rows[6].label, 'Paragraph 7');
  assert.equal(readingReviewPages(paper, 4, items).length, 7);
  assert.deepEqual(readingReviewPages({}, 4, [], { singlePage: true }), []);
});

test('Part 2 review paginates both texts and preserves global question numbers and own options', () => {
  const items = [...Array.from({ length: 5 }, (_, i) => ({ key: `p1:q${i + 1}` })), ...texts.flatMap(text => text.positions)];
  const pages = readingReviewPages({ texts }, 2, items);
  assert.equal(pages.length, 2);
  assert.deepEqual(pages.map(page => page.rows.map(row => row.number)), [[6, 7, 8, 9, 10], [11, 12, 13, 14, 15]]);
  for (const [index, page] of pages.entries()) {
    const row = page.rows[0];
    const review = readingReviewAnswer(row, { selectedAnswer: { kind: 'MATCH', optionId: `${texts[index].id}-B` },
      correctAnswer: `${texts[index].id}-A`, outcome: { outcome: 'INCORRECT' } });
    assert.equal(review.selected.text, `${texts[index].id} sentence B`);
    assert.equal(review.correct.text, `${texts[index].id} sentence A`);
  }
});

test('all Reading parts produce valid review pages including legacy and missing data', () => {
  assert.equal(readingReviewPages(texts[0], 2).length, 1);
  assert.deepEqual(readingReviewPages({}, 2), []);
  const pages = readingReviewPages({ title: 'Article', paragraphs: [{ key: 'p4:q1', content: 'First' }, { key: 'p4:q2', content: 'Second' }],
    headings: [{ id: 'h1', text: 'Heading' }] }, 4);
  assert.equal(pages.length, 2); assert.equal(pages[1].rows[0].number, 2);
  const review = readingReviewAnswer(pages[0].rows[0], { correctAnswer: 'h1', outcome: { outcome: 'SKIPPED' } });
  assert.equal(review.status, 'skipped'); assert.equal(review.selected, undefined); assert.equal(review.correct.text, 'Heading');
});
