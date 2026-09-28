import assert from 'node:assert/strict';
import test from 'node:test';
import { partsInWritingPaper, resumableQuestionKey, resumePartFromAttempt, writingTaskFromPaper } from './writingAttemptPaper.js';
import { wouldExceedAnswerLimit, writingAnswerCharacterLimit } from './writingAnswerLimits.js';

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
  assert.equal(writingTaskFromPaper(paper, 'part1.5'), null);
});

test('resumes a full Writing attempt at the last saved part', () => {
  assert.equal(resumePartFromAttempt({ paper, progress: { currentQuestionKey: 'p3:q1' } }, 'full'), 'part3');
  assert.equal(resumePartFromAttempt({ paper, progress: { currentQuestionKey: 'unknown' } }, 'full'), 'part1');
});

test('resumes the saved question within a Writing part', () => {
  const task = { questions: [{ key: 'p3:q1' }, { key: 'p3:q2' }, { key: 'p3:q3' }] };
  assert.equal(resumableQuestionKey(task, 'p3:q3'), 'p3:q3');
  assert.equal(resumableQuestionKey(task, 'p4:q1'), 'p3:q1');
});

test('uses the Writing limits for each response without silently accepting a long paste', () => {
  assert.equal(writingAnswerCharacterLimit('part4', 0), 4_000);
  assert.equal(writingAnswerCharacterLimit('part4', 1), 8_000);
  assert.equal(wouldExceedAnswerLimit('A'.repeat(3_999), 3_999, 3_999, 'ĐĐ', 4_000), true);
  assert.equal(wouldExceedAnswerLimit('A'.repeat(4_000), 3_999, 4_000, 'Đ', 4_000), false);
});
