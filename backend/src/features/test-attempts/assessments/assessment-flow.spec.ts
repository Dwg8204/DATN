import { ApplicationError } from '../../../common/errors/application.error';
import { AssessmentPaperFactory } from './assessment-paper.factory';
import { applyAnswerChanges } from './answer-policy';
import { ObjectiveGraderService } from './objective-grader.service';

describe('shared attempt assessment', () => {
  const factory = new AssessmentPaperFactory();
  const grader = new ObjectiveGraderService();

  it('keeps Grammar answer keys out of the learner paper and grades both parts', () => {
    const vocabularyOptions = 'ABCDEFGHIJ'.split('').map(label => ({ label, text: `Option ${label}` }));
    const paper = factory.build('GRAMMAR_VOCAB', {
      mode: 'full', details: { title: 'Mock' }, parts: {
        1: { instruction: 'Choose', questions: Array.from({ length: 25 }, (_, index) => ({
          id: index + 1, text: `Question ${index + 1}?`, options: ['A', 'B', 'C'], correctAnswer: 1,
          ...(index === 0 ? { explanation: 'Because B.' } : {}),
        })) },
        2: { sets: Array.from({ length: 5 }, (_, setIndex) => ({ setId: setIndex + 1, instruction: 'Match', options: vocabularyOptions,
          targetWords: Array.from({ length: 5 }, (_, targetIndex) => ({ id: 26 + setIndex * 5 + targetIndex,
            word: `Word ${setIndex + 1}-${targetIndex + 1}`, correctAnswer: String.fromCharCode(65 + targetIndex),
            ...(setIndex === 0 && targetIndex === 0 ? { explanation: 'Option A matches this word.' } : {}),
          })) })) },
      },
    });
    expect(JSON.stringify(paper.parts)).not.toContain('correctAnswer');
    expect(JSON.stringify(paper.parts)).not.toContain('explanation');
    const answers = applyAnswerChanges({}, {
      'p1:q1': { kind: 'CHOICE', optionId: 'o1' },
      'p2:q26': { kind: 'MATCH', optionId: 'B' },
    }, paper.items);
    const result = grader.grade(paper.items, answers);
    expect(result.method).toBe('OBJECTIVE');
    expect(result.score).toBe(1);
    expect(result.maxScore).toBe(50);
    expect(result.counts).toEqual({ correct: 1, incorrect: 1, skipped: 48 });
    expect(result.parts).toEqual([{ partNumber: 1, score: 1, maxScore: 25 }, { partNumber: 2, score: 0, maxScore: 25 }]);
    expect(paper.items[0].explanation).toBe('Because B.');
  });

  it('rejects unknown questions and options, and supports clearing an answer', () => {
    const items = [{ key: 'p1:q1', partNumber: 1, kind: 'CHOICE' as const, optionIds: ['o0', 'o1'], correctOptionId: 'o0', points: 1 }];
    expect(() => applyAnswerChanges({}, { 'p1:q2': { kind: 'CHOICE', optionId: 'o0' } }, items)).toThrow(ApplicationError);
    expect(() => applyAnswerChanges({}, { 'p1:q1': { kind: 'CHOICE', optionId: 'o2' } }, items)).toThrow(ApplicationError);
    const saved = applyAnswerChanges({}, { 'p1:q1': { kind: 'CHOICE', optionId: 'o0' } }, items);
    expect(applyAnswerChanges(saved, { 'p1:q1': null }, items)).toEqual({});
  });

  it('does not fabricate a score for Writing while assessment is pending', () => {
    const paper = factory.build('WRITING', { mode: 'part2', details: { title: 'Writing' }, parts: {
      2: { instruction: 'Write', prompt: 'A form', sampleAnswer: 'Secret sample answer' },
    } });
    expect(JSON.stringify(paper.parts)).not.toContain('Secret sample answer');
    const answers = applyAnswerChanges({}, { 'p2:q1': { kind: 'TEXT', text: 'My response' } }, paper.items);
    const result = grader.grade(paper.items, answers);
    expect(result).toMatchObject({ method: 'PENDING_AI', score: null, maxScore: null });
  });

  it('maps Listening statement text to stable option IDs', () => {
    const paper = factory.build('LISTENING', { mode: 'part2', details: { title: 'Listening' }, parts: {
      2: { instruction: 'Match', audioUrl: 'https://example.com/audio.mp3', speakers: ['One', 'Two', 'Three', 'Four'],
        options: ['First', 'Second', 'Third', 'Fourth', 'Fifth'], answers: ['Second', 'First', 'Third', 'Fourth'] },
    } });
    expect(paper.items[0].correctOptionId).toBe('B');
    expect(JSON.stringify(paper.parts)).not.toContain('answers');
  });

  it('keeps Listening explanations private and returns matching option IDs for Part 3', () => {
    const paper = factory.build('LISTENING', { mode: 'part3', details: { title: 'Listening' }, parts: {
      3: { context: 'Discussion', options: ['Man', 'Woman', 'Both'], audioUrl: 'https://example.com/audio.mp3',
        statements: Array.from({ length: 4 }, (_, index) => ({ id: `15${index}`, text: `Statement ${index}`,
          answer: 'Woman', explanation: `Reason ${index}` })) },
    } });
    expect((paper.parts['3'] as { options: Array<{ id: string }> }).options[1].id).toBe('o1');
    expect(paper.items[0]).toMatchObject({ correctOptionId: 'o1', explanation: 'Reason 0' });
    expect(JSON.stringify(paper.parts)).not.toContain('Reason 0');
  });

  it('rejects oversized accumulated answers and malformed snapshots', () => {
    const items = Array.from({ length: 20 }, (_, index) => ({ key: `p1:q${index}`, partNumber: 1, kind: 'TEXT' as const, points: 0 }));
    const current = Object.fromEntries(items.map(item => [item.key, { kind: 'TEXT' as const, text: 'a'.repeat(15_000) }]));
    expect(() => applyAnswerChanges(current, {}, items)).toThrow(ApplicationError);
    expect(() => factory.build('GRAMMAR_VOCAB', { mode: 'part1', details: { title: 'Broken' }, parts: {
      1: { instruction: 'Q', questions: null },
    } })).toThrow(ApplicationError);
  });
});
