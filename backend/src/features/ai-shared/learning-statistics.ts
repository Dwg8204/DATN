import {
  LearningAttempt,
  LearningStatisticsGroup,
  PartStatistics,
  WritingCriterionStatistics,
} from './learning-statistics.types';

const EXCLUDED_METHODS = new Set(['SIMULATED', 'UNASSESSED', 'PENDING_AI']);
const ASSESSED_JUDGMENTS = new Set(['STRONG', 'ADEQUATE', 'NEEDS_IMPROVEMENT']);
const STATISTICS_LIMITATION =
  'Chỉ mô tả các bài được cung cấp; không gộp điểm khác kỹ năng/chế độ/phạm vi hoặc suy CEFR tổng thể.';

interface GroupAccumulator {
  summary: Omit<LearningStatisticsGroup, 'parts' | 'writingCriteria'>;
  parts: Map<number, PartStatistics>;
  writingCriteria: Map<string, WritingCriterionStatistics>;
}

/** Pure aggregation: callers own authorization, time windows and query limits. */
export function learningStats(
  rows: readonly LearningAttempt[],
  limitation = STATISTICS_LIMITATION,
) {
  const groups = new Map<string, GroupAccumulator>();

  for (const attempt of rows) {
    const key = [
      attempt.component,
      attempt.purpose,
      attempt.scope,
      attempt.part_number ?? 'full',
    ].join(':');
    let group = groups.get(key);
    if (!group) {
      group = createGroup(attempt);
      groups.set(key, group);
    }
    group.summary.sampleSize++;

    // Submitted attempts still count, but synthetic or unfinished assessments are not evidence.
    if (EXCLUDED_METHODS.has(attempt.result?.method ?? '')) continue;
    addScores(group, attempt);
    addWritingCriteria(group, attempt);
    if (attempt.result?.speaking?.provider === 'LLM') {
      group.summary.speakingCriteria.push({
        attemptId: attempt.id,
        version: attempt.result.speaking.version,
        date: attempt.submitted_at,
        percentages: attempt.result.speaking.criteria,
      });
    }
  }

  return {
    attemptsConsidered: rows.length,
    recentAttempts: rows.map((attempt) => ({
      attemptId: attempt.id,
      component: attempt.component,
      purpose: attempt.purpose,
      scope: attempt.scope,
      partNumber: attempt.part_number,
      date: attempt.submitted_at,
      method: attempt.result?.method,
    })),
    groups: [...groups.values()].map(toStatistics),
    limitation,
  };
}

function createGroup(attempt: LearningAttempt): GroupAccumulator {
  return {
    summary: {
      component: attempt.component,
      purpose: attempt.purpose,
      scope: attempt.scope,
      partNumber: attempt.part_number,
      sampleSize: 0,
      recentScores: [],
      speakingCriteria: [],
    },
    parts: new Map(),
    writingCriteria: new Map(),
  };
}

function addScores(group: GroupAccumulator, attempt: LearningAttempt) {
  if (attempt.score != null && Number(attempt.max_score) > 0) {
    group.summary.recentScores.push({
      attemptId: attempt.id,
      date: attempt.submitted_at,
      score: Number(attempt.score),
      maxScore: Number(attempt.max_score),
    });
  }
  for (const part of attempt.result?.parts ?? []) {
    if (!(part.maxScore > 0) || part.score == null) continue;
    const total = group.parts.get(part.partNumber) ?? {
      partNumber: part.partNumber,
      earned: 0,
      possible: 0,
      attempts: 0,
    };
    total.earned += part.score;
    total.possible += part.maxScore;
    total.attempts++;
    group.parts.set(part.partNumber, total);
  }
}

function addWritingCriteria(group: GroupAccumulator, attempt: LearningAttempt) {
  for (const part of attempt.result?.writing?.details?.parts ?? []) {
    for (const question of part.questions ?? []) {
      for (const criterion of question.criteria ?? []) {
        if (!ASSESSED_JUDGMENTS.has(criterion.judgment)) continue;
        const total = group.writingCriteria.get(criterion.criterion) ?? {
          criterion: criterion.criterion,
          observations: 0,
          needsImprovement: 0,
        };
        total.observations++;
        if (criterion.judgment === 'NEEDS_IMPROVEMENT')
          total.needsImprovement++;
        group.writingCriteria.set(criterion.criterion, total);
      }
    }
  }
}

function toStatistics(group: GroupAccumulator): LearningStatisticsGroup {
  return {
    ...group.summary,
    parts: [...group.parts.values()]
      .map((part) => ({
        ...part,
        percent: Math.round((part.earned / part.possible) * 100),
      }))
      .sort((a, b) => a.percent - b.percent),
    writingCriteria: [...group.writingCriteria.values()].sort(
      (a, b) =>
        b.needsImprovement / b.observations -
        a.needsImprovement / a.observations,
    ),
  };
}
