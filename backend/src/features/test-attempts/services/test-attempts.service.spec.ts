import { AssessmentPaperFactory } from '../assessments/assessment-paper.factory';
import { ObjectiveGraderService } from '../assessments/objective-grader.service';
import { TestAttemptsRepository } from '../repositories/test-attempts.repository';
import { TestAttemptsService } from './test-attempts.service';
import { AuthUser } from '../../auth/types/auth-user.type';
import { Logger } from '@nestjs/common';

const actor = { id: 'student-1' } as AuthUser;
const grammarPart = { mode: 'part1', details: { title: 'Grammar' }, parts: {
  1: { instruction: 'Choose', questions: Array.from({ length: 25 }, (_, index) => ({
    id: index + 1, text: `Question ${index + 1}`, options: ['A', 'B', 'C'], correctAnswer: 1,
  })) },
} };

function service(repository: Record<string, unknown>) {
  return new TestAttemptsService(repository as unknown as TestAttemptsRepository,
    new AssessmentPaperFactory(), new ObjectiveGraderService());
}

describe('shared test attempt regressions', () => {
  it('uses immutable snapshot mode when mutable test metadata differs', async () => {
    const snapshot = { mode: 'full', details: { title: 'Full test' }, parts: {
      1: grammarPart.parts[1],
      2: { sets: Array.from({ length: 5 }, (_, setIndex) => ({ setId: setIndex + 1, instruction: 'Match',
        options: 'ABCDEFGHIJ'.split('').map(label => ({ label, text: `Option ${label}` })),
        targetWords: Array.from({ length: 5 }, (_, targetIndex) => ({ id: 26 + setIndex * 5 + targetIndex,
          word: `Word ${setIndex}-${targetIndex}`, correctAnswer: String.fromCharCode(65 + targetIndex) })) })) },
    } };
    let created: Record<string, unknown> | null = null;
    let inserted: unknown[] = [];
    const manager = { query: jest.fn(async (sql: string, values: unknown[]) => {
      if (sql.includes('INSERT INTO test_attempts')) {
        inserted = values;
        created = { id: 'attempt-1', snapshot_id: 'snapshot-1', component: 'GRAMMAR_VOCAB',
          scope: values[4], part_number: values[5], status: 'IN_PROGRESS', test_id: 'test-1', version: 1 };
      }
      return [];
    }) };
    const repository = {
      dataSource: { transaction: (fn: (value: unknown) => Promise<unknown>) => fn(manager) },
      find: jest.fn(async (id: string) => id === 'attempt-1' ? created : null), idExists: jest.fn(async () => false),
      published: jest.fn(async () => ({ component: 'GRAMMAR_VOCAB', snapshot_id: 'snapshot-1', schema_version: 1,
        scope: 'PART', part_number: 1 })),
      snapshot: jest.fn(async () => snapshot), active: jest.fn(async () => null),
      progress: jest.fn(async () => ({ answers: {}, progress: {}, revision: 0 })),
      serverTime: jest.fn(async () => new Date()),
    };
    const attempts = service(repository);
    const started = await attempts.start('test-1', 'attempt-1', actor);
    expect(inserted.slice(4, 6)).toEqual(['FULL_SKILL', null]);
    expect(started).toMatchObject({ scope: 'FULL_SKILL', partNumber: null, paper: { mode: 'full' } });
    await expect(attempts.start('test-1', 'attempt-2', actor, 'part1'))
      .rejects.toMatchObject({ code: 'ATTEMPT_MODE_MISMATCH' });
    await expect(attempts.start('test-1', 'attempt-3', actor, undefined, 'LISTENING'))
      .rejects.toMatchObject({ code: 'ATTEMPT_COMPONENT_MISMATCH' });
    expect(manager.query.mock.calls.filter(([sql]) => String(sql).includes('INSERT INTO test_attempts'))).toHaveLength(1);
  });

  it('continues finalizing other expired attempts after one invalid snapshot', async () => {
    const log = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const completed: string[] = [];
    const manager = { query: jest.fn(async () => []) };
    const repository = {
      dataSource: { transaction: (fn: (value: unknown) => Promise<unknown>) => fn(manager) },
      dueProgress: jest.fn(async (_manager: unknown, excluded: string[]) => {
        if (!excluded.includes('bad')) return [{ attempt_id: 'bad', student_id: actor.id, answers: {} }];
        if (!completed.includes('good')) return [{ attempt_id: 'good', student_id: actor.id, answers: {} }];
        return [];
      }),
      lockAttempt: jest.fn(async (id: string) => ({ id, snapshot_id: id, component: id === 'bad' ? 'READING' : 'GRAMMAR_VOCAB',
        status: 'IN_PROGRESS' })),
      snapshot: jest.fn(async () => grammarPart),
      complete: jest.fn(async (_manager: unknown, id: string) => { completed.push(id); }),
    };
    try {
      expect(await service(repository).finalizeExpiredBatch(3)).toBe(1);
      expect(completed).toEqual(['good']);
    } finally {
      log.mockRestore();
    }
  });

  it('reads detail from an existing Listening result with partBreakdown', async () => {
    const snapshot = { mode: 'part1', details: { title: 'Listening' }, parts: {
      1: { questions: Array.from({ length: 13 }, (_, index) => ({ id: String(index + 1), text: `Question ${index + 1}`,
        options: ['A', 'B', 'C'], correctAnswer: 1 })) },
    } };
    const result = { score: 2, maxScore: 26, partBreakdown: {
      part1: Array.from({ length: 13 }, (_, index) => ({ userAnswer: index === 0 ? 1 : undefined,
        isCorrect: index === 0, isSkipped: index !== 0 })),
    } };
    const repository = {
      find: jest.fn(async () => ({ id: 'old-attempt', snapshot_id: 'old-snapshot', component: 'LISTENING',
        status: 'SUBMITTED', result })),
      snapshot: jest.fn(async () => snapshot),
      progress: jest.fn(),
    };
    const detail = await service(repository).details('old-attempt', 1, actor);
    expect(detail.items[0]).toMatchObject({ selectedAnswer: { optionId: 'o1' }, correctAnswer: 'o1',
      outcome: { outcome: 'CORRECT' } });
    expect(repository.progress).not.toHaveBeenCalled();
  });
});
