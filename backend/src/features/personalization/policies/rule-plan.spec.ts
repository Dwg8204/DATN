import { buildRulePlan, PlanCandidate } from './rule-plan';
import { allocatePlanProgress } from './plan-progress';
import { StudyPlanItemRow } from '../types/personalization.type';

const candidates: PlanCandidate[] = [
  'READING',
  'LISTENING',
  'WRITING',
  'SPEAKING',
  'GRAMMAR_VOCAB',
].map(
  (component, i) =>
    ({
      candidateId: `c${i}`,
      activityType: 'TEST',
      testId: `test${i}`,
      component,
      title: 'Test',
      purpose: 'PRACTICE',
    }) as PlanCandidate,
);
candidates.push(
  { candidateId: 'v', activityType: 'VOCAB_REVIEW', targetCount: 20 },
  {
    candidateId: 'm',
    activityType: 'MISTAKE_REVIEW',
    sourceAttemptId: 'a',
    component: 'READING',
    questionKeys: ['p1:q1', 'p1:q2', 'p1:q3'],
  },
);
const item = (
  id: string,
  day: string,
  patch: Partial<StudyPlanItemRow> = {},
): StudyPlanItemRow => ({
  id,
  plan_id: 'plan',
  scheduled_on: day,
  sort_order: 0,
  activity_type: 'TEST',
  component: 'READING',
  part_number: null,
  test_id: 't',
  topic_id: null,
  source_attempt_id: null,
  question_keys: null,
  target_count: 1,
  done_count: 0,
  completed_at: null,
  reason: null,
  ...patch,
});

describe('RULE plan and reconciliation', () => {
  it('rotates all five skills, respects pace and at most three activities/day', () => {
    const plan = buildRulePlan(candidates, '2026-10-01', '2026-10-07', 2, 40);
    expect(
      new Set(
        plan.filter((i) => i.activityType === 'TEST').map((i) => i.component),
      ).size,
    ).toBe(5);
    expect(
      plan
        .filter((i) => i.activityType === 'TEST')
        .reduce((sum, i) => sum + i.targetCount, 0),
    ).toBe(14);
    for (const day of new Set(plan.map((i) => i.scheduledOn)))
      expect(
        plan.filter((i) => i.scheduledOn === day).length,
      ).toBeLessThanOrEqual(3);
  });
  it('bundles a high pace without exceeding the remaining target', () => {
    const plan = buildRulePlan(
      candidates,
      '2026-10-01',
      '2026-10-07',
      167,
      500,
    );
    expect(
      plan.filter((i) => i.activityType === 'TEST').map((i) => i.targetCount),
    ).toEqual([167, 167, 166]);
  });
  it('limits the last partial week', () => {
    expect(
      new Set(
        buildRulePlan(candidates, '2026-10-29', '2026-10-30', 2, 10).map(
          (i) => i.scheduledOn,
        ),
      ).size,
    ).toBe(2);
  });
  it('keeps band practice after reaching the count target', () => {
    const plan = buildRulePlan(candidates, '2026-10-01', '2026-10-07', 0, 0);
    expect(plan.filter((i) => i.activityType === 'TEST')).toHaveLength(7);
    expect(plan[0].reason).toBe('BAND_PRACTICE');
  });
  it('does not invent unpublished tests', () => {
    expect(
      buildRulePlan(
        candidates.filter((i) => i.activityType !== 'TEST'),
        '2026-10-01',
        '2026-10-03',
        2,
        10,
      ).some((i) => i.activityType === 'TEST'),
    ).toBe(false);
  });
  it('does not assign the same mistake group on multiple days', () => {
    expect(
      buildRulePlan(candidates, '2026-10-01', '2026-10-07', 1, 10).filter(
        (i) => i.activityType === 'MISTAKE_REVIEW',
      ),
    ).toHaveLength(1);
  });
  it('uses an attempt only once and never for a future task', () => {
    const result = allocatePlanProgress(
      [item('a', '2026-10-01'), item('b', '2026-10-02')],
      [
        {
          id: 'x',
          component: 'READING',
          part_number: null,
          submitted_at: new Date('2026-10-01T05:00Z'),
        },
      ],
      [],
      '2026-10-07',
      'Asia/Bangkok',
    );
    expect(result.map((i) => i.doneCount)).toEqual([1, 0]);
  });
  it('matches component and requested Part, rejects attempts outside the week', () => {
    const result = allocatePlanProgress(
      [item('a', '2026-10-01', { part_number: 2 })],
      [
        {
          id: 'x',
          component: 'READING',
          part_number: 1,
          submitted_at: new Date('2026-10-01T05:00Z'),
        },
        {
          id: 'y',
          component: 'READING',
          part_number: 2,
          submitted_at: new Date('2026-10-08T05:00Z'),
        },
      ],
      [],
      '2026-10-07',
      'Asia/Bangkok',
    );
    expect(result[0].doneCount).toBe(0);
  });
  it('allows catchup through plan end in the goal timezone', () => {
    const result = allocatePlanProgress(
      [item('a', '2026-10-01')],
      [
        {
          id: 'x',
          component: 'READING',
          part_number: null,
          submitted_at: new Date('2026-10-07T16:59Z'),
        },
      ],
      [],
      '2026-10-07',
      'Asia/Bangkok',
    );
    expect(result[0].doneCount).toBe(1);
  });
  it('counts 20 events on their own local day without carrying over', () => {
    const tasks = [
      item('a', '2026-10-01', {
        activity_type: 'VOCAB_REVIEW',
        target_count: 20,
      }),
      item('b', '2026-10-02', {
        activity_type: 'VOCAB_REVIEW',
        target_count: 20,
      }),
    ];
    const events = Array.from(
      { length: 20 },
      () => new Date('2026-10-01T16:59Z'),
    );
    expect(
      allocatePlanProgress(tasks, [], events, '2026-10-07', 'Asia/Bangkok').map(
        (i) => i.doneCount,
      ),
    ).toEqual([20, 0]);
  });
  it('preserves manual review completion on every reconciliation', () => {
    const task = item('m', '2026-10-01', {
      activity_type: 'MISTAKE_REVIEW',
      done_count: 1,
      completed_at: new Date('2026-10-01T05:00Z'),
    });
    expect(
      allocatePlanProgress([task], [], [], '2026-10-07', 'Asia/Bangkok')[0],
    ).toMatchObject({ doneCount: 1, completedAt: task.completed_at });
  });
  it('produces deterministic allocation regardless of input order', () => {
    const tasks = [item('a', '2026-10-01'), item('b', '2026-10-01')];
    const attempts = [
      {
        id: 'x',
        component: 'READING',
        part_number: null,
        submitted_at: new Date('2026-10-01T05:00Z'),
      },
    ];
    expect(
      allocatePlanProgress(tasks, attempts, [], '2026-10-07', 'Asia/Bangkok'),
    ).toEqual(
      allocatePlanProgress(
        [...tasks].reverse(),
        attempts,
        [],
        '2026-10-07',
        'Asia/Bangkok',
      ),
    );
  });
});
