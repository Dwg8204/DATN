import assert from 'node:assert/strict';
import test from 'node:test';
import { readingPercentage, readingResultView, readingReviewPages, readingReviewAnswer } from './readingResultPresentation.js';

const text = id => ({ id, openingSentence: `Opening ${id}`, options: ['A', 'B', 'C', 'D', 'E'].map(label => ({ id: `${id}-${label}`, text: `${id} sentence ${label}` })),
  positions: [2, 3, 4, 5, 6].map((position, index) => ({ key: `${id}:q${index + 1}`, position })) });
const texts = [text('t1'), text('t2')];

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
