import { buildSampleTests } from '../../../database/seeds/seed-sample-tests';
import { AssessmentPaperFactory } from './assessment-paper.factory';
import { ObjectiveGraderService } from './objective-grader.service';
import { applyAnswerChanges } from './answer-policy';
import { presentAssessmentResult } from './result-presentation';
import { Answers, AssessmentPaper } from '../types/attempt.type';

describe('Reading Test and Practice result grading', () => {
  const samples = buildSampleTests().filter(sample => sample.component === 'READING');
  const factory = new AssessmentPaperFactory(), grader = new ObjectiveGraderService();

  it.each(samples.map(sample => [sample.test.purpose, sample.test.mode, sample.test] as const))(
    '%s %s grades every question and preserves private answer explanations', (_purpose, mode, snapshot) => {
      const paper = factory.build('READING', snapshot as unknown as Record<string, unknown>);
      const answers: Answers = Object.fromEntries(paper.items.map(item => [item.key, { kind: item.kind as 'CHOICE' | 'MATCH', optionId: item.correctOptionId! }]));
      const result = grader.grade(paper.items, applyAnswerChanges({}, answers, paper.items), 'READING');
      const partTotals: Record<string, number> = { part1: 5, part2: 10, part3: 7, part4: 7 };
      const total = mode === 'full' ? 29 : partTotals[mode];
      expect(result).toMatchObject({ method: 'OBJECTIVE', score: total, maxScore: total, counts: { correct: total, incorrect: 0, skipped: 0 } });
      expect(presentAssessmentResult(result, answers)?.items.every(item => item.selectedAnswer)).toBe(true);
      expect(JSON.stringify(paper.parts)).not.toContain('explanation');
      expect(paper.items.every(item => item.explanation)).toBe(true);
    },
  );

  it('counts incorrect, skipped and correct answers independently across all four parts', () => {
    const snapshot = samples.find(sample => sample.test.purpose === 'EXAM')!.test;
    const paper = factory.build('READING', snapshot as unknown as Record<string, unknown>);
    const answers: Answers = {};
    for (const part of [1, 2, 3, 4]) {
      const item = paper.items.find(item => item.partNumber === part)!;
      answers[item.key] = { kind: item.kind as 'CHOICE' | 'MATCH', optionId: part === 2
        ? item.optionIds!.find(id => id !== item.correctOptionId)! : item.correctOptionId! };
    }
    const result = grader.grade(paper.items, applyAnswerChanges({}, answers, paper.items), 'READING');
    expect(result).toMatchObject({ score: 3, maxScore: 29, counts: { correct: 3, incorrect: 1, skipped: 25 } });
    expect(result.parts.map(part => part.maxScore)).toEqual([5, 10, 7, 7]);
  });

  it('Part 2 rejects cross-text answers and grades each text by its own sentence identity', () => {
    const snapshot = samples.find(sample => sample.test.mode === 'part2')!.test;
    const paper = factory.build('READING', snapshot as unknown as Record<string, unknown>);
    expect(() => applyAnswerChanges({}, { 'p2:q1': { kind: 'MATCH', optionId: paper.items[5].correctOptionId! } }, paper.items)).toThrow();
    const answers: Answers = { 'p2:q1': { kind: 'MATCH', optionId: paper.items[0].correctOptionId! },
      'p2:q6': { kind: 'MATCH', optionId: paper.items[5].correctOptionId! } };
    expect(grader.grade(paper.items, answers, 'READING')).toMatchObject({ score: 2, maxScore: 10,
      counts: { correct: 2, incorrect: 0, skipped: 8 } });
  });

  it('resolves selected Part 2 sentences without changing grades or persisted results', () => {
    const snapshot = samples.find(sample => sample.test.mode === 'part2')!.test;
    const paper = factory.build('READING', snapshot as unknown as Record<string, unknown>);
    const answers: Answers = {
      'p2:q1': { kind: 'MATCH', optionId: paper.items[0].correctOptionId! },
      'p2:q2': { kind: 'MATCH', optionId: paper.items[2].correctOptionId! },
      'p2:q6': { kind: 'MATCH', optionId: paper.items[5].correctOptionId! },
    };
    const result = grader.grade(paper.items, answers, 'READING');
    const stored = JSON.stringify(result);
    const presented = presentAssessmentResult(result, answers, paper)!;
    const texts = (paper.parts['2'] as { texts: Array<{ options: Array<{ id: string; text: string }> }> }).texts;
    expect(presented.items[0]).toMatchObject({ outcome: 'CORRECT', selectedAnswerText: texts[0].options[0].text });
    expect(presented.items[1]).toMatchObject({ outcome: 'INCORRECT', selectedAnswerText: texts[0].options[2].text });
    expect(presented.items[2]).toMatchObject({ outcome: 'SKIPPED', selectedAnswer: null, selectedAnswerText: null });
    expect(presented.items[5].selectedAnswerText).toBe(texts[1].options[0].text);
    expect(presented.counts).toEqual(result.counts);
    expect(JSON.stringify(result)).toBe(stored);
    expect(JSON.stringify(presented)).not.toContain('explanation');
  });

  it('keeps repeated option IDs scoped to their text and supports legacy one-text papers', () => {
    const source = samples.find(sample => sample.test.mode === 'part2')!.test;
    const paper = factory.build('READING', source as unknown as Record<string, unknown>);
    const result = grader.grade(paper.items, {}, 'READING');
    const answers: Answers = { 'p2:q1': { kind: 'MATCH', optionId: 'same' }, 'p2:q6': { kind: 'MATCH', optionId: 'same' } };
    const texts = [
      { positions: [{ key: 'p2:q1' }], options: [{ id: 'same', text: 'First text sentence.' }] },
      { positions: [{ key: 'p2:q6' }], options: [{ id: 'same', text: 'Second text sentence.' }] },
    ];
    const scoped: AssessmentPaper = { ...paper, parts: { '2': { texts } } };
    const presented = presentAssessmentResult(result, answers, scoped)!;
    expect(presented.items[0].selectedAnswerText).toBe('First text sentence.');
    expect(presented.items[5].selectedAnswerText).toBe('Second text sentence.');
    const legacy = presentAssessmentResult(result, answers, { ...paper, parts: { '2': texts[0] } })!;
    expect(legacy.items[0].selectedAnswerText).toBe('First text sentence.');
  });

  it('resolves selected Part 3 speakers without exposing their IDs or changing grades', () => {
    const snapshot = samples.find(sample => sample.test.mode === 'part3')!.test;
    const paper = factory.build('READING', snapshot as unknown as Record<string, unknown>);
    const first = paper.items[0];
    const wrong = first.optionIds!.find(id => id !== first.correctOptionId)!;
    const answers: Answers = { [first.key]: { kind: 'MATCH', optionId: wrong },
      [paper.items[1].key]: { kind: 'MATCH', optionId: paper.items[1].correctOptionId! } };
    const result = grader.grade(paper.items, answers, 'READING');
    const stored = JSON.stringify(result);
    const presented = presentAssessmentResult(result, answers, paper)!;
    const speakers = (paper.parts['3'] as { speakers: Array<{ id: string; name: string }> }).speakers;
    expect(presented.items[0]).toMatchObject({ outcome: 'INCORRECT', selectedAnswerText: speakers.find(speaker => speaker.id === wrong)!.name });
    expect(presented.items[1]).toMatchObject({ outcome: 'CORRECT', selectedAnswerText: speakers.find(speaker => speaker.id === paper.items[1].correctOptionId)!.name });
    expect(presented.items[2]).toMatchObject({ outcome: 'SKIPPED', selectedAnswer: null, selectedAnswerText: null });
    expect(presented.counts).toEqual(result.counts);
    expect(JSON.stringify(result)).toBe(stored);
  });

  it('resolves selected Part 4 heading text while preserving correct, incorrect and skipped outcomes', () => {
    const snapshot = samples.find(sample => sample.test.mode === 'part4')!.test;
    const paper = factory.build('READING', snapshot as unknown as Record<string, unknown>);
    const answers: Answers = {
      [paper.items[0].key]: { kind: 'MATCH', optionId: paper.items[0].correctOptionId! },
      [paper.items[1].key]: { kind: 'MATCH', optionId: paper.items[1].optionIds!.find(id => id !== paper.items[1].correctOptionId)! },
    };
    const result = grader.grade(paper.items, answers, 'READING');
    const stored = JSON.stringify(result);
    const presented = presentAssessmentResult(result, answers, paper)!;
    const headings = (paper.parts['4'] as { headings: Array<{ id: string; text: string }> }).headings;
    expect(presented.items).toHaveLength(7);
    for (const item of presented.items.slice(0, 2)) {
      const answer = answers[item.key] as { kind: 'MATCH'; optionId: string };
      expect(item.selectedAnswerText).toBe(headings.find(heading => heading.id === answer.optionId)!.text);
    }
    expect(presented.items.map(item => item.outcome)).toEqual(['CORRECT', 'INCORRECT', 'SKIPPED', 'SKIPPED', 'SKIPPED', 'SKIPPED', 'SKIPPED']);
    expect(presented.items[2]).toMatchObject({ selectedAnswer: null, selectedAnswerText: null });
    expect(JSON.stringify(result)).toBe(stored);
  });

  it('resolves selected Part 1 words using each gap own options without modifying grades', () => {
    const snapshot = samples.find(sample => sample.test.mode === 'part1')!.test;
    const paper = factory.build('READING', snapshot as unknown as Record<string, unknown>);
    const answers: Answers = {
      [paper.items[0].key]: { kind: 'CHOICE', optionId: paper.items[0].correctOptionId! },
      [paper.items[1].key]: { kind: 'CHOICE', optionId: paper.items[1].optionIds!.find(id => id !== paper.items[1].correctOptionId)! },
    };
    const result = grader.grade(paper.items, answers, 'READING');
    const stored = JSON.stringify(result);
    const presented = presentAssessmentResult(result, answers, paper)!;
    const questions = (paper.parts['1'] as { questions: Array<{ key: string; options: Array<{ id: string; text: string }> }> }).questions;
    expect(presented.items).toHaveLength(5);
    for (const item of presented.items.slice(0, 2)) {
      const answer = answers[item.key] as { kind: 'CHOICE'; optionId: string };
      expect(item.selectedAnswerText).toBe(questions.find(question => question.key === item.key)!.options.find(option => option.id === answer.optionId)!.text);
    }
    expect(presented.items.map(item => item.outcome)).toEqual(['CORRECT', 'INCORRECT', 'SKIPPED', 'SKIPPED', 'SKIPPED']);
    expect(presented.items[2]).toMatchObject({ selectedAnswer: null, selectedAnswerText: null });
    expect(JSON.stringify(result)).toBe(stored);
  });
});
