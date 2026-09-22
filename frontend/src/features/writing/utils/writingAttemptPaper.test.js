import assert from 'node:assert/strict';
import test from 'node:test';
import { partsInWritingPaper, writingTaskFromPaper } from './writingAttemptPaper.js';

const paper = {
  title: 'Writing mock',
  mode: 'full',
  parts: {
    1: { context: 'Join a club.', questions: [{ key: 'p1:q1', text: 'Your name?' }] },
    2: { instruction: 'Write 20–30 words.', prompt: 'Describe your trip.', key: 'p2:q1' },
    3: { context: 'Chat room.', messages: [{ key: 'p3:q1', text: 'Why did you join?' }] },
    4: { context: 'Write two emails.', informalPrompt: 'Write to a friend.', informalKey: 'p4:q1', formalPrompt: 'Write to a manager.', formalKey: 'p4:q2' },
  },
};

test('maps every Writing part to stable answer keys', () => {
  assert.deepEqual(partsInWritingPaper(paper), ['part1', 'part2', 'part3', 'part4']);
  assert.deepEqual(writingTaskFromPaper(paper, 'part1').questions.map(item => item.key), ['p1:q1']);
  assert.deepEqual(writingTaskFromPaper(paper, 'part2').questions.map(item => item.key), ['p2:q1']);
  assert.deepEqual(writingTaskFromPaper(paper, 'part3').questions.map(item => item.key), ['p3:q1']);
  assert.deepEqual(writingTaskFromPaper(paper, 'part4').questions.map(item => item.key), ['p4:q1', 'p4:q2']);
});

test('returns null for a part that is outside the published snapshot', () => {
  assert.equal(writingTaskFromPaper({ ...paper, parts: { 2: paper.parts[2] } }, 'part1'), null);
});
