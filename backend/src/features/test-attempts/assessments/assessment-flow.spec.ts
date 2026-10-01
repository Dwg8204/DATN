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
    expect(paper.items[0].maxCharacters).toBe(4_000);
    expect(JSON.stringify(paper.parts)).not.toContain('Secret sample answer');
    const answers = applyAnswerChanges({}, { 'p2:q1': { kind: 'TEXT', text: 'My response' } }, paper.items);
    const result = grader.grade(paper.items, answers);
    expect(result).toMatchObject({ method: 'PENDING_AI', score: null, maxScore: null });
    expect(result.items[0].outcome).toBe('PENDING');
    const blank = grader.grade(paper.items, {});
    expect(blank).toMatchObject({ method: 'PENDING_AI', score: null, maxScore: null,
      counts: { correct: 0, incorrect: 0, skipped: 1 } });
    expect(blank.items[0].outcome).toBe('SKIPPED');
  });

  it('enforces the Writing limits advertised in the learner paper', () => {
    const paper = factory.build('WRITING', { mode: 'part4', details: { title: 'Writing' }, parts: {
      4: { context: 'Write emails', informalPrompt: 'Friend', formalPrompt: 'Manager' },
    } });
    expect(paper.items.map(item => item.maxCharacters)).toEqual([4_000, 8_000]);
    expect(applyAnswerChanges({}, { 'p4:q1': { kind: 'TEXT', text: 'Đ'.repeat(4_000) } }, paper.items))
      .toMatchObject({ 'p4:q1': { text: 'Đ'.repeat(4_000) } });
    expect(() => applyAnswerChanges({}, { 'p4:q1': { kind: 'TEXT', text: 'Đ'.repeat(4_001) } }, paper.items))
      .toThrow(ApplicationError);
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

  it('builds and grades a Reading practice part without exposing its answer keys', () => {
    const paper = factory.build('READING', { mode: 'part1', details: { title: 'Reading' }, parts: {
      1: { passageHtml: '<p>A short passage</p>', questions: Array.from({ length: 5 }, (_, index) => ({
        position: index + 1, options: ['first', 'second', 'third'], answer: index === 0 ? 'second' : 'first',
        explanation: `Reading reason ${index + 1}`,
      })) },
    } });
    expect(JSON.stringify(paper.parts)).not.toContain('Reading reason');
    expect(paper.items[0]).toMatchObject({ correctOptionId: 'o1', explanation: 'Reading reason 1' });
    const result = grader.grade(paper.items, applyAnswerChanges({}, {
      'p1:q1': { kind: 'CHOICE', optionId: 'o1' },
    }, paper.items));
    expect(result).toMatchObject({ method: 'OBJECTIVE', score: 1, maxScore: 5,
      counts: { correct: 1, incorrect: 0, skipped: 4 } });
  });

  it('accepts both Reading Part 2 texts as ten ordering questions', () => {
    const texts = Array.from({ length: 2 }, (_, textIndex) => ({
      id: `text-${textIndex + 1}`,
      title: `Text ${textIndex + 1}`,
      sentences: Array.from({ length: 6 }, (_, sentenceIndex) => ({
        id: `t${textIndex + 1}-s${sentenceIndex + 1}`,
        content: `Sentence ${sentenceIndex + 1}`,
        correctPosition: sentenceIndex + 1,
        explanation: sentenceIndex === 1 ? `Reason ${textIndex + 1}` : '',
      })),
    }));
    const paper = factory.build('READING', { mode: 'part2', details: { title: 'Reading Part 2' }, parts: {
      2: { texts },
    } });

    expect(paper.items).toHaveLength(10);
    expect(paper.items[0]).toMatchObject({ key: 'p2:q1', partNumber: 2, explanation: 'Reason 1' });
    expect(paper.items[5]).toMatchObject({ key: 'p2:q6', partNumber: 2, explanation: 'Reason 2' });
    expect((paper.parts['2'] as { texts: unknown[] }).texts).toHaveLength(2);
    expect(JSON.stringify(paper.parts)).not.toContain('Reason 1');
  });

  it('treats one Speaking Part 4 recording as an unassessed response', () => {
    const paper = factory.build('SPEAKING', { mode: 'part4', details: { title: 'Speaking' }, parts: {
      4: { topic: 'Technology', imageUrl: 'https://example.com/image.jpg',
        questions: [{ text: 'Describe it.' }, { text: 'Why?' }, { text: 'What next?' }],
        sampleAnswer: 'Technology can make daily life more convenient.',
        explanation: 'Give a balanced opinion and support it with examples.',
      },
    } });
    expect(paper.items).toHaveLength(1);
    expect(paper.parts['4']).toMatchObject({ responseKey: 'p4:q1' });
    expect(JSON.stringify(paper.parts)).not.toContain('Technology can make daily life');
    expect(JSON.stringify(paper.parts)).not.toContain('balanced opinion');
    expect(paper.items[0]).toMatchObject({
      sampleAnswer: 'Technology can make daily life more convenient.',
      explanation: 'Give a balanced opinion and support it with examples.',
    });
    const result = grader.grade(paper.items, applyAnswerChanges({}, {
      'p4:q1': { kind: 'AUDIO', mediaKey: 'https://res.cloudinary.com/demo/video/upload/aptimate/test-covers/candidate-recordings/recording.webm' },
    }, paper.items));
    expect(result).toMatchObject({ method: 'PENDING_AI', score: null, maxScore: null });
    expect(result.items[0].outcome).toBe('PENDING');
  });
});
