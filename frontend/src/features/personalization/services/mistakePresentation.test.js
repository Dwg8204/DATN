import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mistakeSections } from './mistakePresentation.js';
import { resultContext } from '../../ai-chatbot/services/chatPolicy.js';

test('review renders only scheduled questions, preserving matching option banks', () => {
  const sections = mistakeSections({
    component: 'LISTENING',
    partNumber: 2,
    paper: {
      speakers: [
        { key: 'p2:s1', name: 'Speaker 1' },
        { key: 'p2:s2', name: 'Speaker 2' },
      ],
      options: [
        { id: 'A', text: 'Airport' },
        { id: 'B', text: 'Library' },
      ],
    },
    items: [
      { key: 'p2:s1', selectedAnswer: { optionId: 'B' }, correctAnswer: 'A' },
    ],
  });
  assert.equal(sections[0].rows.length, 1);
  assert.equal(sections[0].rows[0].selected, 'Library');
  assert.equal(sections[0].rows[0].correct, 'Airport');
});
test('reading matching resolves sentence text, not internal IDs', () => {
  const sections = mistakeSections({
    component: 'READING',
    partNumber: 2,
    paper: {
      texts: [
        {
          id: 'text1',
          openingSentence: 'Opening',
          positions: [{ key: 'p2:q1', position: 2 }],
          options: [{ id: 'sentence-a', text: 'The next sentence' }],
        },
      ],
    },
    items: [{ key: 'p2:q1', correctAnswer: 'sentence-a' }],
  });
  assert.equal(sections[0].rows[0].correct, 'The next sentence');
});
test('mistake chatbot context includes Listening speaker key and validates IDs', () => {
  assert.deepEqual(
    resultContext(
      '/profile/mistakes',
      '?attemptId=00000000-0000-4000-8000-000000000001&questionKey=p2:s1',
    ),
    { attemptId: '00000000-0000-4000-8000-000000000001', questionKey: 'p2:s1' },
  );
  assert.equal(
    resultContext('/profile/mistakes', '?attemptId=invalid&questionKey=p2:s1'),
    null,
  );
});
