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
          purpose: 'EXAM', scope: values[4], part_number: values[5], status: 'IN_PROGRESS', test_id: 'test-1', version: 1 };
      }
      return [];
    }) };
    const repository = {
      dataSource: { transaction: (fn: (value: unknown) => Promise<unknown>) => fn(manager) },
      find: jest.fn(async (id: string) => id === 'attempt-1' ? created : null), idExists: jest.fn(async () => false),
      published: jest.fn(async () => ({ component: 'GRAMMAR_VOCAB', purpose: 'EXAM', snapshot_id: 'snapshot-1', schema_version: 1,
        scope: 'FULL_SKILL', part_number: null })),
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
    const estimates: Array<string | null | undefined> = [];
    const submittedTimes: Array<Date | undefined> = [];
    const deadline = new Date('2026-01-01T10:00:00.000Z');
    const manager = { query: jest.fn(async () => []) };
    const repository = {
      dataSource: { transaction: (fn: (value: unknown) => Promise<unknown>) => fn(manager) },
      dueProgress: jest.fn(async (_manager: unknown, excluded: string[]) => {
        if (!excluded.includes('bad')) return [{ attempt_id: 'bad', student_id: actor.id, answers: {} }];
        if (!completed.includes('good')) return [{ attempt_id: 'good', student_id: actor.id, answers: {} }];
        return [];
      }),
      lockAttempt: jest.fn(async (id: string) => ({ id, snapshot_id: id, component: id === 'bad' ? 'READING' : 'LISTENING',
        status: 'IN_PROGRESS', expires_at: deadline })),
      snapshot: jest.fn(async (id: string) => id === 'good'
        ? { mode: 'part1', details: { title: 'Listening' }, parts: { 1: { questions: Array.from({ length: 13 }, (_, index) => ({
          id: index + 1, text: `Question ${index + 1}`, options: ['A', 'B', 'C'], correctAnswer: 1,
        })) } } }
        : grammarPart),
      complete: jest.fn(async (_manager: unknown, id: string, _result: unknown, submittedAt: Date | undefined, cefr: string | null | undefined) => {
        completed.push(id);
        submittedTimes.push(submittedAt);
        estimates.push(cefr);
      }),
    };
    try {
      expect(await service(repository).finalizeExpiredBatch(3)).toBe(1);
      expect(completed).toEqual(['good']);
      expect(estimates[0]).toBe('A1');
      expect(submittedTimes[0]).toEqual(deadline);
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

  it('seals an expired attempt even when the client revision is stale', async () => {
    const expiredAt = new Date('2026-01-01T10:00:00.000Z');
    const serverTime = new Date('2026-01-01T10:00:01.000Z');
    const answers = { 'p2:q1': { kind: 'TEXT', text: 'The last answer saved by the server.' } };
    const locked = {
      id: 'attempt-1', student_id: actor.id, snapshot_id: 'snapshot-1', component: 'WRITING',
      purpose: 'EXAM',
      scope: 'PART', part_number: 2, status: 'IN_PROGRESS', grading_status: 'NOT_STARTED',
      assessment_revision: 0, result: null, score: null, max_score: null, estimated_cefr: null,
      started_at: new Date('2026-01-01T09:00:00.000Z'), expires_at: expiredAt,
      submitted_at: null, completed_at: null,
    };
    const manager = { query: jest.fn(async () => []) };
    const repository = {
      dataSource: { transaction: (fn: (value: unknown) => Promise<unknown>) => fn(manager) },
      metadata: jest.fn(async () => ({ id: locked.id, snapshot_id: locked.snapshot_id, component: locked.component, purpose: locked.purpose })),
      snapshot: jest.fn(async () => ({ mode: 'part2', details: { title: 'Writing' }, parts: {
        2: { instruction: 'Write', prompt: 'Tell us about your trip.', sampleAnswer: 'A sample.' },
      } })),
      progress: jest.fn(async () => ({ attempt_id: locked.id, answers, progress: {}, revision: 4,
        saved_at: serverTime, sealed_at: null })),
      lockAttempt: jest.fn(async () => locked),
      serverTime: jest.fn(async () => serverTime),
      saveProgress: jest.fn(),
      complete: jest.fn(async (_manager: unknown, _attemptId: string, result: unknown) => ({
        ...locked, status: 'SUBMITTED', grading_status: 'QUEUED', result, submitted_at: serverTime,
      })),
    };

    const attempts = service(repository);
    await expect(attempts.save(locked.id, actor, { expectedRevision: 3, changes: {} }))
      .rejects.toMatchObject({ code: 'ATTEMPT_EXPIRED' });
    const result = await attempts.submit(locked.id, actor, { expectedRevision: 3,
      finalChanges: { 'p2:q1': { kind: 'TEXT', text: 'Late client text must be ignored.' } } });

    expect(result).toMatchObject({ status: 'SUBMITTED', gradingStatus: 'QUEUED' });
    expect(repository.saveProgress).not.toHaveBeenCalled();
    expect(repository.complete.mock.calls[0][2]).toMatchObject({ method: 'PENDING_AI' });
  });
});
