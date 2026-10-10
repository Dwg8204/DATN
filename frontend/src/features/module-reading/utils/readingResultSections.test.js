import assert from 'node:assert/strict';
import test from 'node:test';
import { readingResultSections } from './readingResultSections.js';

const texts = [0, 1].map(index => ({
  id: `text${index + 1}`, title: `Story ${index + 1}`, openingSentence: `Opening ${index + 1}`,
  options: [0, 1, 2, 3, 4].map(i => ({ id: `t${index + 1}-s${i + 2}`, text: `Text ${index + 1} sentence ${i + 2}` })),
  positions: [0, 1, 2, 3, 4].map(i => ({ key: `p2:q${index * 5 + i + 1}`, position: i + 2 })),
}));

test('Reading Part 2 result renders both texts with ten stable answer keys', () => {
  const sections = readingResultSections({ texts }, 2);
  assert.equal(sections.length, 2);
  assert.deepEqual(sections.map(section => section.openingSentence), ['Opening 1', 'Opening 2']);
  assert.deepEqual(sections.map(section => section.title), ['Text 1 · Story 1', 'Text 2 · Story 2']);
  assert.deepEqual(sections.flatMap(section => section.rows.map(row => row.key)),
    Array.from({ length: 10 }, (_, i) => `p2:q${i + 1}`));
  assert.deepEqual(sections.map(section => section.rows[0].prompt), ['Position 2', 'Position 2']);
});

test('each Part 2 question uses options from its own text', () => {
  const sections = readingResultSections({ texts }, 2);
  for (const [index, section] of sections.entries()) {
    for (const row of section.rows) assert.deepEqual(row.options, texts[index].options);
  }
  assert.ok(!sections[0].rows[0].options.some(option => option.id === texts[1].options[0].id));
});

test('legacy one-text Part 2 result is still supported', () => {
  const [section] = readingResultSections(texts[0], 2);
  assert.equal(section.rows.length, 5);
  assert.equal(section.openingSentence, 'Opening 1');
});

test('missing result arrays cannot cause undefined.map crashes', () => {
  for (const part of [1, 2, 3, 4]) {
    assert.deepEqual(readingResultSections(null, part), []);
    assert.equal(readingResultSections({}, part).flatMap(section => section.rows).length, 0);
  }
  assert.deepEqual(readingResultSections({ texts: [] }, 2), []);
  assert.deepEqual(readingResultSections({ texts: [null, { options: null, positions: null }] }, 2)[0].rows, []);
});

test('other Reading parts retain their question keys and options', () => {
  const [p1] = readingResultSections({ questions: [{ key: 'p1:q1', position: 1, options: [{ id: 'o0', text: 'hello' }] }] }, 1);
  assert.deepEqual(p1.rows[0], { key: 'p1:q1', prompt: 'Gap 1', options: [{ id: 'o0', text: 'hello' }] });
  const [p3] = readingResultSections({ questions: [{ key: 'p3:q1', statement: 'Who likes tea?' }], speakers: [{ id: 'speaker1', name: 'Ann' }] }, 3);
  assert.deepEqual(p3.rows[0], { key: 'p3:q1', prompt: 'Who likes tea?', options: [{ id: 'speaker1', text: 'Ann' }] });
  const [p4] = readingResultSections({ paragraphs: [{ key: 'p4:q1', content: 'Paragraph' }], headings: [{ id: 'h1', text: 'Heading' }] }, 4);
  assert.deepEqual(p4.rows[0], { key: 'p4:q1', prompt: 'Paragraph', options: [{ id: 'h1', text: 'Heading' }] });
});
