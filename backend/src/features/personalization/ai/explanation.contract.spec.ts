import {
  validateExplanation,
  ExplanationValidationError,
} from './explanation.contract';
import { explanationContext } from './explanation-context';
const content = {
  locale: 'vi',
  correctAnswer: 'on',
  explanation: 'Dùng on trước ngày trong tuần.',
  ruleSummary: 'On đi với ngày.',
  tip: 'Chú ý cụm on Monday.',
  citations: ['lesson'],
};
describe('Mistake explanation contract', () => {
  test('rejects a correct answer with the observed incorrect tense label', () => {
    expect(() =>
      validateExplanation(
        {
          locale: 'en',
          correctAnswer: 'had been working',
          explanation: 'The past continuous (had been working) is correct.',
          ruleSummary: 'Use had been + ing.',
          tip: 'Choose the past continuous form.',
          citations: ['lesson'],
        },
        'en',
        'had been working',
        ['lesson'],
      ),
    ).toThrow('EXPLANATION_INVALID');
  });
  test.each([
    {
      partNumber: 3,
      paper: {
        speakers: [
          { id: 'D', name: 'Speaker D', post: 'Booking should be easier.' },
        ],
        questions: [{ key: 'p3:q1', statement: 'Who wants easier booking?' }],
      },
      key: 'p3:q1',
      correct: 'D',
      expected: 'Speaker D',
    },
    {
      partNumber: 4,
      paper: {
        headings: [{ id: 'h1', text: 'How the club began' }],
        paragraphs: [
          { key: 'p4:q1', content: 'Four neighbours started the club.' },
        ],
      },
      key: 'p4:q1',
      correct: 'h1',
      expected: 'How the club began',
    },
  ])(
    'resolves shared reading options for part $partNumber',
    ({ partNumber, paper, key, correct, expected }) => {
      expect(
        explanationContext(
          { component: 'READING', partNumber, paper },
          { key, correctAnswer: correct },
        ).correctAnswer,
      ).toBe(expected);
    },
  );
  test('accepts a bounded grounded explanation', () =>
    expect(validateExplanation(content, 'vi', 'on', ['lesson'])).toEqual(
      content,
    ));
  test.each([
    { citations: ['foreign'] },
    { citations: [] },
    { citations: ['lesson', 'lesson'] },
    { explanation: 'x'.repeat(601) },
    { tip: '<script>alert(1)</script>' },
    { ruleSummary: 'https://evil.invalid' },
    { locale: 'en' },
    { correctAnswer: 'at' },
    {
      explanation: 'The correct answer is on.',
      ruleSummary: 'Use on.',
      tip: 'Practise on Monday.',
    },
    { explanation: 'Đáp án đúng là at.' },
  ])('rejects invalid or contradictory provider content %j', (patch) =>
    expect(() =>
      validateExplanation(
        { ...content, ...patch },
        'vi',
        'on',
        ['lesson'],
        ['at', 'on'],
      ),
    ).toThrow(ExplanationValidationError),
  );
  test('rejects Vietnamese prose labelled English', () =>
    expect(() =>
      validateExplanation({ ...content, locale: 'en' }, 'en', 'on', ['lesson']),
    ).toThrow());
  test('projects selected question from the immutable paper, excludes URLs and other answers', () => {
    const result = explanationContext(
      {
        component: 'READING',
        partNumber: 1,
        paper: {
          passage: 'Meet ___ Monday',
          audioUrl: 'https://private.invalid',
          questions: [
            {
              key: 'p1:q1',
              text: 'Choose',
              options: [
                { id: 'a', text: 'on' },
                { id: 'b', text: 'at' },
              ],
              answer: 'a',
            },
          ],
        },
      },
      {
        key: 'p1:q1',
        correctAnswer: 'a',
        selectedAnswer: { optionId: 'b' },
        outcome: { outcome: 'INCORRECT' },
      },
    );
    expect(result.correctAnswer).toBe('on');
    expect(result.selectedAnswer).toBe('at');
    expect(result.paper).not.toMatch(/private|answer|audio/);
  });
});
