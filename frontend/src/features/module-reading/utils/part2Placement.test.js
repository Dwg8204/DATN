import assert from 'node:assert/strict';
import test from 'node:test';
import { part2AttemptChanges, part2PlacementChanges } from './part2Placement.js';
import { applyLocalChanges } from '../../test-attempts/utils/attemptSavePolicy.js';

const text = id => ({ id, options: ['A', 'B', 'C', 'D', 'E'].map(label => ({ id: `${id}-${label}` })),
  positions: [2, 3, 4, 5, 6].map(position => ({ key: `${id}:q${position}`, position })) });
const part = { texts: [text('t1'), text('t2')] };
const match = optionId => ({ kind: 'MATCH', optionId });
const sentences = [{ id: 'opening', correctPosition: 1 }, ...part.texts[0].options];

test('a bank answer stays in an empty gap and other text answers are preserved', () => {
  const initial = { 't2:q2': match('t2-A'), 'p1:q1': { kind: 'CHOICE', optionId: 'word' } };
  const changes = part2AttemptChanges(part, initial, 't1-A', 2);
  assert.deepEqual(changes, { 't1:q2': match('t1-A') });
  assert.deepEqual(applyLocalChanges(initial, changes), { ...initial, 't1:q2': match('t1-A') });
});

test('replacing an occupied gap keeps the new answer and returns only its old occupant to the bank', () => {
  const initial = { 't1:q2': match('t1-A'), 't1:q3': match('t1-C') };
  const changes = part2AttemptChanges(part, initial, 't1-B', 2);
  assert.deepEqual(changes, { 't1:q2': match('t1-B') });
  assert.deepEqual(applyLocalChanges(initial, changes), { 't1:q2': match('t1-B'), 't1:q3': match('t1-C') });
});

test('moving between two occupied gaps swaps both answers in one patch', () => {
  const initial = { 't1:q2': match('t1-A'), 't1:q3': match('t1-B') };
  assert.deepEqual(part2AttemptChanges(part, initial, 't1-A', 3), {
    't1:q2': match('t1-B'), 't1:q3': match('t1-A'),
  });
});

test('moving to an empty gap clears only the source gap', () => {
  const initial = { 't1:q2': match('t1-A'), 't2:q2': match('t2-A') };
  const changes = part2AttemptChanges(part, initial, 't1-A', 4);
  assert.deepEqual(changes, { 't1:q2': null, 't1:q4': match('t1-A') });
  assert.deepEqual(applyLocalChanges(initial, changes), { 't1:q4': match('t1-A'), 't2:q2': match('t2-A') });
});

test('dropping in the same position or an invalid destination makes no changes', () => {
  const initial = { 't1:q2': match('t1-A') };
  assert.deepEqual(part2AttemptChanges(part, initial, 't1-A', 2), {});
  for (const position of [1, 7, null, '2']) assert.deepEqual(part2AttemptChanges(part, initial, 't1-A', position), {});
  assert.deepEqual(part2AttemptChanges(part, initial, 'opening', 3), {});
});

test('legacy placement scopes occupied positions to the selected text', () => {
  assert.deepEqual(part2PlacementChanges(sentences, { 't2-A': 2 }, 't1-A', 2), { 't1-A': 2 });
  assert.deepEqual(part2PlacementChanges(sentences, { 't1-A': 2, 't1-B': 3 }, 't1-A', 3), { 't1-A': 3, 't1-B': 2 });
  assert.deepEqual(part2PlacementChanges(sentences, { 't1-A': 2 }, 't1-B', 2), { 't1-B': 2, 't1-A': null });
  assert.deepEqual(part2PlacementChanges(sentences, {}, 'opening', 2), {});
});

test('repeated replacements and swaps never duplicate or lose the selected answer', () => {
  let answers = { 't2:q2': match('t2-A') };
  for (let step = 0; step < 60; step += 1) {
    const sentenceId = `t1-${'ABCDE'[step % 5]}`, position = 2 + (step * 3) % 5;
    answers = applyLocalChanges(answers, part2AttemptChanges(part, answers, sentenceId, position));
    assert.deepEqual(answers[`t1:q${position}`], match(sentenceId));
    const placed = part.texts[0].positions.map(item => answers[item.key]?.optionId).filter(Boolean);
    assert.equal(new Set(placed).size, placed.length);
    assert.deepEqual(answers['t2:q2'], match('t2-A'));
  }
});
