import { createHash } from 'node:crypto';
import { learningStats } from '../../ai-shared/learning-statistics';
import { readingCefrEstimate } from '../../test-attempts/policies/reading-cefr.policy';
import { LearningGoalRow } from '../types/personalization.type';
import {
  SnapshotAttempt,
  SnapshotRows,
  SnapshotWindow,
} from '../types/snapshot.type';
import { addDays, dayNumber, localDay } from './calendar';

export const SNAPSHOT_VERSION = 1;
export const SNAPSHOT_SKILLS = [
  'GRAMMAR_VOCAB',
  'READING',
  'LISTENING',
  'WRITING',
  'SPEAKING',
] as const;
const BANDS: Record<string, number> = {
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C: 5,
  C1: 5,
  C2: 6,
};
const LABELS = ['', 'A1', 'A2', 'B1', 'B2', 'C', 'C2'];
const average = (values: number[]) =>
  values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;

export function goalProgress(
  goal: LearningGoalRow,
  completed: number,
  asOf: Date,
) {
  const elapsedDays = Math.max(
    0,
    Math.min(
      goal.duration_days,
      dayNumber(localDay(asOf, goal.timezone)) - dayNumber(goal.start_date) + 1,
    ),
  );
  // Today remains available for learning, including the last calendar day.
  const remainingDays = Math.max(
    0,
    Math.min(
      goal.duration_days,
      goal.duration_days -
        Math.max(
          0,
          dayNumber(localDay(asOf, goal.timezone)) - dayNumber(goal.start_date),
        ),
    ),
  );
  const expected = (goal.target_test_count * elapsedDays) / goal.duration_days;
  const status =
    completed >= expected * 1.1 && completed - expected >= 1
      ? 'AHEAD'
      : completed <= expected * 0.9 && expected - completed >= 1
        ? 'BEHIND'
        : 'ON_TRACK';
  return {
    targetCefr: goal.target_cefr,
    targetTests: goal.target_test_count,
    durationDays: goal.duration_days,
    week: Math.min(
      Math.ceil(goal.duration_days / 7),
      Math.max(1, Math.ceil(elapsedDays / 7)),
    ),
    elapsedDays,
    remainingDays,
    completed,
    expected: Math.round(expected * 10) / 10,
    status,
    requiredPace: Math.ceil(
      Math.max(0, goal.target_test_count - completed) /
        Math.max(1, remainingDays),
    ),
    targetReached: completed >= goal.target_test_count,
    lifecycle: goal.status,
  };
}

export function learningStreak(
  dates: Array<Date | string>,
  asOf: Date,
  timezone: string,
) {
  const today = dayNumber(localDay(asOf, timezone));
  const days = new Set(
    dates
      .filter((date) => new Date(date) <= asOf)
      .map((date) => dayNumber(localDay(new Date(date), timezone))),
  );
  let day = days.has(today) ? today : today - 1,
    count = 0;
  while (days.has(day--)) count++;
  return count;
}

/** Pure: data access and ownership checks belong to SnapshotService. */
export function buildLearnerSnapshot(
  userId: string,
  goal: LearningGoalRow | null,
  window: SnapshotWindow,
  asOf: Date,
  rows: SnapshotRows,
  timezone = goal?.timezone ?? 'UTC',
) {
  const today = localDay(asOf, timezone);
  const inGoal = (row: SnapshotAttempt) =>
    row.student_id === userId &&
    row.status === 'SUBMITTED' &&
    new Date(row.submitted_at) <= asOf &&
    (!goal ||
      (localDay(new Date(row.submitted_at), timezone) >= goal.start_date &&
        localDay(new Date(row.submitted_at), timezone) <
          addDays(goal.start_date, goal.duration_days) &&
        (!goal.ended_at || new Date(row.submitted_at) <= goal.ended_at)));
  const attempts = rows.attempts
    .filter(inGoal)
    .sort(
      (a, b) =>
        new Date(b.submitted_at).getTime() -
          new Date(a.submitted_at).getTime() || a.id.localeCompare(b.id),
    );
  const scores = rows.scoredAttempts
    .filter(inGoal)
    .sort(
      (a, b) =>
        new Date(b.submitted_at).getTime() -
          new Date(a.submitted_at).getTime() || a.id.localeCompare(b.id),
    );
  const selected =
    window.kind === 'COMMENT'
      ? scores.slice(0, 20)
      : window.kind === 'WEEKLY' || window.kind === 'MIDTERM'
        ? scores
            .filter((row) => {
              const day = localDay(new Date(row.submitted_at), timezone);
              return day >= window.from && day <= window.to;
            })
            .slice(0, 200)
        : scores.slice(0, 200);
  const real = selected.filter(
    (row) => row.result?.method === 'OBJECTIVE' || row.result?.method === 'AI',
  );
  const statistics = learningStats(
    real.map((row) =>
      row.result?.method === 'AI'
        ? row
        : {
            ...row,
            result: { ...row.result, writing: undefined, speaking: undefined },
          },
    ),
  );
  const progress = goal ? goalProgress(goal, attempts.length, asOf) : null;
  const weekStart = goal
    ? addDays(goal.start_date, ((progress?.week ?? 1) - 1) * 7)
    : addDays(today, -6);
  const weekEnd = goal
    ? [
        addDays(weekStart, 6),
        addDays(goal.start_date, goal.duration_days - 1),
      ].sort()[0]
    : today;
  const cumulativeScores = scores.slice(
    0,
    window.kind === 'COMMENT' ? 20 : 200,
  );
  const full = cumulativeScores
    .map((row) => ({
      ...row,
      estimated_cefr: readingCefrEstimate(row)?.level ?? row.estimated_cefr,
    }))
    .filter(
      (row) =>
        row.scope === 'FULL_SKILL' &&
        (row.result?.method === 'OBJECTIVE' || row.result?.method === 'AI') &&
        BANDS[row.estimated_cefr ?? ''],
    );
  const eligible: number[] = [];
  const bySkill = SNAPSHOT_SKILLS.map((skill) => {
    const values = full
      .filter((row) => row.component === skill)
      .map((row) => BANDS[row.estimated_cefr!]);
    if (values.length < 2)
      return {
        skill,
        band: null,
        reason: 'INSUFFICIENT_DATA',
        sampleSize: values.length,
      };
    if (skill !== 'WRITING') eligible.push(...values);
    return {
      skill,
      band: LABELS[Math.round(average(values)!)],
      reason: null,
      sampleSize: values.length,
    };
  });
  const parts = statistics.groups.flatMap((group) => {
    const weakest = group.parts
      .filter((part) => part.attempts >= 2)
      .sort((a, b) => a.percent - b.percent || a.partNumber - b.partNumber)[0];
    return weakest
      ? [
          {
            skill: group.component,
            purpose: group.purpose,
            scope: group.scope,
            partNumber: group.partNumber,
            part: weakest.partNumber,
            percent: weakest.percent,
            attempts: weakest.attempts,
          },
        ]
      : [];
  });
  const reviewDates = rows.reviewDates.filter(
    (date) =>
      new Date(date) <= asOf &&
      (!goal ||
        (localDay(new Date(date), timezone) >= goal.start_date &&
          localDay(new Date(date), timezone) <
            addDays(goal.start_date, goal.duration_days) &&
          (!goal.ended_at || new Date(date) <= goal.ended_at))),
  );
  const activityDates = [
    ...attempts.map((row) => row.submitted_at),
    ...reviewDates,
  ];
  const inWeek = (day: string) => day >= weekStart && day <= weekEnd;
  const planItems = rows.planItems.filter((item) => inWeek(item.scheduledOn));
  const totalTarget = planItems.reduce(
    (sum, item) => sum + item.targetCount,
    0,
  );
  const mistakes = rows.mistakes.slice(0, 30);
  return {
    snapshotVersion: SNAPSHOT_VERSION,
    asOf: asOf.toISOString(),
    timezone,
    window,
    goal: progress,
    band: {
      overallEstimate: eligible.length
        ? LABELS[Math.round(average(eligible)!)]
        : null,
      target: goal?.target_cefr ?? null,
      bySkill,
    },
    statistics,
    cumulative: {
      completed: attempts.length,
      statistics: learningStats(
        cumulativeScores.filter(
          (row) =>
            row.result?.method === 'OBJECTIVE' || row.result?.method === 'AI',
        ),
      ),
    },
    weak: {
      parts,
      writingCriteria: statistics.groups.flatMap((group) =>
        group.writingCriteria.map((criterion) => ({
          ...criterion,
          purpose: group.purpose,
          scope: group.scope,
          partNumber: group.partNumber,
        })),
      ),
      speakingCriteria: statistics.groups.flatMap((group) => {
        const criteria = new Map<string, number[]>();
        for (const assessment of group.speakingCriteria)
          for (const [key, value] of Object.entries(
            assessment.percentages ?? {},
          )) {
            if (Number.isFinite(value))
              criteria.set(key, [...(criteria.get(key) ?? []), value]);
          }
        return [...criteria]
          .map(([criterion, values]) => ({
            criterion,
            percent: Math.round(average(values)!),
            observations: values.length,
            purpose: group.purpose,
            scope: group.scope,
            partNumber: group.partNumber,
          }))
          .sort((a, b) => a.percent - b.percent);
      }),
      topics: [],
    },
    mistakes: {
      count: mistakes.length,
      references: mistakes,
      byComponent: Object.fromEntries(
        SNAPSHOT_SKILLS.map((skill) => [
          skill,
          mistakes.filter((item) => item.component === skill).length,
        ]),
      ),
    },
    vocab: {
      reviewedThisWeek: reviewDates.filter((date) =>
        inWeek(localDay(new Date(date), timezone)),
      ).length,
      learningCount: rows.learningCount,
    },
    habit: {
      streak: learningStreak(activityDates, asOf, timezone),
      activeDaysThisWeek: new Set(
        activityDates
          .map((date) => localDay(new Date(date), timezone))
          .filter(inWeek),
      ).size,
      planDoneRatio: totalTarget
        ? Math.round(
            (100 *
              planItems.reduce(
                (sum, item) => sum + Math.min(item.doneCount, item.targetCount),
                0,
              )) /
              totalTarget,
          ) / 100
        : 0,
    },
    limitation:
      'CEFR_ESTIMATE_FULL_SKILL_ONLY; SCORES_LATEST_200; COMMENT_LATEST_20',
  };
}

function canonical(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key, entry]) => key !== 'asOf' && entry !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => [key, canonical(entry)]),
    );
  return value;
}
export function snapshotHash(snapshot: unknown) {
  return createHash('sha256')
    .update(JSON.stringify(canonical(snapshot)))
    .digest('hex');
}
