import { buildSampleTests } from '../../../database/seeds/seed-sample-tests';
import { AssessmentPaperFactory } from './assessment-paper.factory';
import { ObjectiveGraderService } from './objective-grader.service';
import { applyAnswerChanges } from './answer-policy';
import { presentAssessmentResult } from './result-presentation';
import { Answers } from '../types/attempt.type';

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
});
