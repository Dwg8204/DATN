import {
  buildLearnerSnapshot,
  goalProgress,
  learningStreak,
  snapshotHash,
} from './learner-snapshot';
import { LearningGoalRow } from '../types/personalization.type';
import { SnapshotAttempt, SnapshotRows } from '../types/snapshot.type';

const goal: LearningGoalRow = {
  id: 'goal',
  user_id: 'alice',
  target_cefr: 'B2',
  target_test_count: 30,
  duration_days: 30,
  start_date: '2026-10-01',
  timezone: 'Asia/Bangkok',
  status: 'ACTIVE',
  target_reached_at: null,
  ended_at: null,
  replaced_by_goal_id: null,
  created_at: new Date('2026-10-01'),
  updated_at: new Date('2026-10-01'),
};
const now = new Date('2026-10-14T05:00:00Z');
const attempt = (
  id: string,
  patch: Partial<SnapshotAttempt> = {},
): SnapshotAttempt => ({
  id,
  student_id: 'alice',
  status: 'SUBMITTED',
  component: 'READING',
  purpose: 'EXAM',
  scope: 'FULL_SKILL',
  part_number: null,
  submitted_at: '2026-10-14T04:00:00Z',
  score: 7,
  max_score: 10,
  estimated_cefr: 'B2',
  result: {
    method: 'OBJECTIVE',
    parts: [{ partNumber: 1, score: 7, maxScore: 10 }],
  },
  ...patch,
});
const rows = (
  attempts: SnapshotAttempt[],
  extra: Partial<SnapshotRows> = {},
): SnapshotRows => ({
  attempts,
  scoredAttempts: attempts,
  reviewDates: [],
  learningCount: 0,
  mistakes: [],
  planItems: [],
  ...extra,
});
const build = (
  attempts: SnapshotAttempt[],
  extra: Partial<SnapshotRows> = {},
) =>
  buildLearnerSnapshot(
    'alice',
    goal,
    { kind: 'GOAL' },
    now,
    rows(attempts, extra),
  );

describe('learner snapshot', () => {
  it('includes day one and leaves all days available', () => {
    const p = goalProgress(goal, 0, new Date('2026-10-01T05:00Z'));
    expect(p).toMatchObject({
      elapsedDays: 1,
      remainingDays: 30,
      expected: 1,
      requiredPace: 1,
      status: 'BEHIND',
    });
  });
  it('avoids early behind labels for fractional expected below one', () => {
    expect(
      goalProgress(
        { ...goal, target_test_count: 10 },
        0,
        new Date('2026-10-01T05:00Z'),
      ).status,
    ).toBe('ON_TRACK');
  });
  it('classifies ahead only after a whole test difference', () => {
    expect(goalProgress(goal, 15, now).status).toBe('ON_TRACK');
    expect(goalProgress(goal, 16, now).status).toBe('AHEAD');
  });
  it('classifies behind using unrounded expectation', () => {
    expect(goalProgress(goal, 12, now).status).toBe('BEHIND');
  });
  it('includes the last day in required pace', () => {
    expect(goalProgress(goal, 27, new Date('2026-10-30T16:59Z'))).toMatchObject(
      { remainingDays: 1, expected: 30, requiredPace: 3 },
    );
  });
  it('clamps overdue expected and remaining days', () => {
    expect(goalProgress(goal, 25, new Date('2026-11-10T05:00Z'))).toMatchObject(
      { remainingDays: 0, elapsedDays: 30, expected: 30, requiredPace: 5 },
    );
  });
  it('never turns ACTIVE into COMPLETED when target reached', () => {
    expect(goalProgress(goal, 40, now)).toMatchObject({
      lifecycle: 'ACTIVE',
      targetReached: true,
      requiredPace: 0,
    });
  });
  it('counts pending, simulated and practice attempts without scoring them', () => {
    const s = build(
      ['PENDING_AI', 'SIMULATED', 'UNASSESSED'].map((method, i) =>
        attempt(String(i), { purpose: 'PRACTICE', result: { method } }),
      ),
    );
    expect(s.goal?.completed).toBe(3);
    expect(s.statistics.groups).toEqual([]);
  });
  it('filters other owners, incomplete, future and out of goal rows', () => {
    expect(
      build([
        attempt('other', { student_id: 'bob' }),
        attempt('future', { submitted_at: '2026-10-15T05:00Z' }),
        attempt('early', { submitted_at: '2026-09-30T16:59Z' }),
        attempt('draft', { status: 'IN_PROGRESS' }),
      ]).goal?.completed,
    ).toBe(0);
  });
  it('uses local midnight and frozen goal timezone', () => {
    expect(
      build([attempt('one', { submitted_at: '2026-09-30T17:00Z' })]).goal
        ?.completed,
    ).toBe(1);
  });
  it('does not infer CEFR from PART or fewer than two FULL_SKILL attempts', () => {
    expect(
      build([attempt('a'), attempt('b', { scope: 'PART', part_number: 1 })])
        .band.overallEstimate,
    ).toBeNull();
  });
  it('uses real full-skill bands and excludes Writing from overall', () => {
    const s = build([
      attempt('a'),
      attempt('b'),
      attempt('w1', {
        component: 'WRITING',
        estimated_cefr: 'A1',
        result: { method: 'AI' },
      }),
      attempt('w2', {
        component: 'WRITING',
        estimated_cefr: 'A1',
        result: { method: 'AI' },
      }),
    ]);
    expect(s.band.overallEstimate).toBe('B2');
    expect(s.band.bySkill.find((s) => s.skill === 'WRITING')?.band).toBe('A1');
  });
  it('keeps purposes and scopes separate and needs two part observations', () => {
    const s = build([
      attempt('a'),
      attempt('b'),
      attempt('c', { purpose: 'PRACTICE' }),
    ]);
    expect(s.statistics.groups).toHaveLength(2);
    expect(s.weak.parts).toHaveLength(1);
    expect(s.weak.parts[0].attempts).toBe(2);
  });
  it('has an empty, nonfabricated cold start', () => {
    const s = build([]);
    expect(s.band.overallEstimate).toBeNull();
    expect(s.weak.topics).toEqual([]);
    expect(s.habit.streak).toBe(0);
  });
  it('streak spans local midnight and tolerates yesterday as latest activity', () => {
    const dates = ['2026-10-12T17:01Z', '2026-10-13T17:01Z'];
    expect(learningStreak(dates, now, 'Asia/Bangkok')).toBe(2);
    expect(learningStreak(dates, now, 'America/New_York')).toBe(2);
  });
  it('streak breaks on a missing local day and ignores future events', () => {
    expect(
      learningStreak(
        ['2026-10-11T05:00Z', '2026-10-15T05:00Z'],
        now,
        goal.timezone,
      ),
    ).toBe(0);
  });
  it('handles DST without assuming that a local day is 24 hours', () => {
    expect(
      learningStreak(
        ['2026-11-01T05:30Z', '2026-11-01T06:30Z', '2026-11-02T06:30Z'],
        new Date('2026-11-02T15:00Z'),
        'America/New_York',
      ),
    ).toBe(2);
  });
  it('counts vocabulary in goal-relative week and bounds plan progress', () => {
    const s = build([], {
      reviewDates: ['2026-10-08T05:00Z', '2026-10-07T05:00Z'],
      planItems: [{ scheduledOn: '2026-10-08', doneCount: 4, targetCount: 2 }],
    });
    expect(s.vocab.reviewedThisWeek).toBe(1);
    expect(s.habit.planDoneRatio).toBe(1);
  });
  it('caps final score payloads at 200 without truncating goal count', () => {
    const s = build(Array.from({ length: 230 }, (_, i) => attempt(String(i))));
    expect(s.goal?.completed).toBe(230);
    expect(s.statistics.attemptsConsidered).toBe(200);
  });
  it('limits COMMENT to twenty latest attempts', () => {
    expect(
      buildLearnerSnapshot(
        'alice',
        null,
        { kind: 'COMMENT' },
        now,
        rows(Array.from({ length: 25 }, (_, i) => attempt(String(i)))),
      ).statistics.attemptsConsidered,
    ).toBe(20);
  });
  it('separates weekly period from cumulative count', () => {
    const s = buildLearnerSnapshot(
      'alice',
      goal,
      { kind: 'WEEKLY', from: '2026-10-01', to: '2026-10-07' },
      now,
      rows([attempt('a'), attempt('b', { submitted_at: '2026-10-02T05:00Z' })]),
    );
    expect(s.statistics.attemptsConsidered).toBe(1);
    expect(s.cumulative.completed).toBe(2);
  });
  it('hash ignores object key order and asOf but includes version and attempts', () => {
    expect(snapshotHash({ a: 1, b: 2, asOf: 'one' })).toBe(
      snapshotHash({ asOf: 'two', b: 2, a: 1 }),
    );
    expect(snapshotHash(build([]))).not.toBe(
      snapshotHash(build([attempt('new')])),
    );
    expect(snapshotHash({ snapshotVersion: 1 })).not.toBe(
      snapshotHash({ snapshotVersion: 2 }),
    );
  });
  it('does not change the same-day hash without changed learning data', () => {
    expect(snapshotHash(build([]))).toBe(
      snapshotHash(
        buildLearnerSnapshot(
          'alice',
          goal,
          { kind: 'GOAL' },
          new Date('2026-10-14T06:00Z'),
          rows([]),
        ),
      ),
    );
  });
  it('does not leak prompts or answers in mistake references', () => {
    const s = build([], {
      mistakes: [
        {
          attemptId: 'a',
          questionKey: 'p1:q1',
          component: 'READING',
          partNumber: 1,
        },
      ],
    });
    expect(Object.keys(s.mistakes.references[0]).sort()).toEqual([
      'attemptId',
      'component',
      'partNumber',
      'questionKey',
    ]);
  });
});
