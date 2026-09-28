import { AssessmentPaperFactory } from '../assessments/assessment-paper.factory';
import { ObjectiveGraderService } from '../assessments/objective-grader.service';
import { TestAttemptsRepository } from '../repositories/test-attempts.repository';
import { AuthUser } from '../../auth/types/auth-user.type';
import { PracticeAttemptsService } from './practice-attempts.service';
import { Answers } from '../types/attempt.type';

const actor = { id: 'student-1' } as AuthUser;
const testId = '11111111-1111-4111-8111-111111111111';
const attemptId = '22222222-2222-4222-8222-222222222222';
const snapshot = {
  mode: 'part1', details: { title: 'Grammar practice' }, parts: {
    1: { instruction: 'Choose one answer.', questions: Array.from({ length: 25 }, (_, index) => ({
      id: index + 1, text: `Question ${index + 1}`, options: ['A', 'B', 'C'], correctAnswer: 1,
      explanation: `Explanation ${index + 1}`,
    })) },
  },
};

function createService(repository: Record<string, unknown>) {
  return new PracticeAttemptsService(
    repository as unknown as TestAttemptsRepository,
    new AssessmentPaperFactory(),
    new ObjectiveGraderService(),
  );
}

describe('PracticeAttemptsService', () => {
  it('starts a fresh practice attempt without creating autosave progress', async () => {
    let created: Record<string, unknown> | null = null;
    const manager = { query: jest.fn(async (sql: string) => {
      if (sql.includes('INSERT INTO test_attempts')) {
        created = {
          id: attemptId, student_id: actor.id, snapshot_id: 'snapshot-1', test_id: testId, version: 1,
          component: 'GRAMMAR_VOCAB', purpose: 'PRACTICE', scope: 'PART', part_number: 1,
          status: 'IN_PROGRESS', grading_status: 'NOT_STARTED', started_at: new Date(), expires_at: null,
        };
      }
      return [];
    }) };
    const repository = {
      dataSource: { transaction: (callback: (value: unknown) => Promise<unknown>) => callback(manager) },
      find: jest.fn(async () => created), idExists: jest.fn(async () => false),
      published: jest.fn(async () => ({ id: testId, component: 'GRAMMAR_VOCAB', purpose: 'PRACTICE',
        scope: 'PART', part_number: 1, snapshot_id: 'snapshot-1', version: 1, schema_version: 1 })),
      snapshot: jest.fn(async () => snapshot),
    };

    const started = await createService(repository).start({ testId, attemptId, mode: 'part1' }, actor);

    expect(started).toMatchObject({ purpose: 'PRACTICE', scope: 'PART', partNumber: 1, answers: {} });
    expect(JSON.stringify(started.paper)).not.toContain('correctAnswer');
    expect(JSON.stringify(started.paper)).not.toContain('Explanation 1');
    expect(manager.query.mock.calls.some(([sql]) => String(sql).includes('attempt_progress'))).toBe(false);
  });

  it('reveals only one requested answer and its explanation', async () => {
    const repository = {
      find: jest.fn(async () => ({ id: attemptId, snapshot_id: 'snapshot-1', component: 'GRAMMAR_VOCAB',
        purpose: 'PRACTICE', status: 'IN_PROGRESS' })),
      snapshot: jest.fn(async () => snapshot),
    };

    await expect(createService(repository).reveal(attemptId, 'p1:q1', actor)).resolves.toEqual({
      attemptId, key: 'p1:q1', correctAnswer: 'o1', explanation: 'Explanation 1', sampleAnswer: null,
    });
  });

  it('stores final answers once and marks revealed questions as assisted', async () => {
    const attempt = {
      id: attemptId, student_id: actor.id, snapshot_id: 'snapshot-1', component: 'GRAMMAR_VOCAB',
      purpose: 'PRACTICE', scope: 'PART', part_number: 1, status: 'IN_PROGRESS',
      grading_status: 'NOT_STARTED', assessment_revision: 0, result: null, score: null, max_score: null,
      estimated_cefr: null, started_at: new Date(), expires_at: null, submitted_at: null, completed_at: null,
    };
    const manager = { query: jest.fn(async () => []) };
    const repository = {
      dataSource: { transaction: (callback: (value: unknown) => Promise<unknown>) => callback(manager) },
      metadata: jest.fn(async () => ({ id: attemptId, snapshot_id: 'snapshot-1', component: 'GRAMMAR_VOCAB', purpose: 'PRACTICE' })),
      snapshot: jest.fn(async () => snapshot), lockAttempt: jest.fn(async () => attempt),
      complete: jest.fn(async (_manager: unknown, _id: string, result: unknown) => ({
        ...attempt, status: 'SUBMITTED', grading_status: 'COMPLETED', result, score: '2', max_score: '50',
        submitted_at: new Date(), completed_at: new Date(),
      })),
    };
    const answers: Answers = Object.fromEntries(Array.from({ length: 25 }, (_, index) => [
      `p1:q${index + 1}`, { kind: 'CHOICE', optionId: index === 0 ? 'o1' : 'o0' },
    ]));

    const completed = await createService(repository).complete(attemptId, {
      answers, revealedKeys: ['p1:q1', 'not-in-paper'],
    }, actor);

    expect(completed).toMatchObject({ purpose: 'PRACTICE', status: 'SUBMITTED', estimatedCefr: null });
    expect(manager.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO attempt_progress'),
      expect.arrayContaining([attemptId]));
    expect(repository.complete.mock.calls[0][2]).toMatchObject({ assistance: { revealedKeys: ['p1:q1'] } });
  });
});
