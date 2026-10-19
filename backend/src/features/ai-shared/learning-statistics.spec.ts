import { learningStats } from './learning-statistics';
import { LearningAttempt } from './learning-statistics.types';

const attempt: LearningAttempt = {
  id: 'reading-1',
  component: 'READING',
  purpose: 'PRACTICE',
  scope: 'FULL_SKILL',
  part_number: null,
  score: '12',
  max_score: '20',
  submitted_at: '2026-10-19T00:00:00Z',
  result: {
    method: 'OBJECTIVE',
    parts: [{ partNumber: 1, score: 3, maxScore: 5 }],
  },
};

describe('Shared learning statistics', () => {
  test('accepts an arbitrary caller-selected window without truncating or mutating rows', () => {
    const rows = Array.from({ length: 35 }, (_, i) => ({
      ...attempt,
      id: `attempt-${i}`,
    }));
    const before = JSON.stringify(rows);
    const stats = learningStats(rows);
    expect(stats.attemptsConsidered).toBe(35);
    expect(stats.groups[0].sampleSize).toBe(35);
    expect(stats.groups[0].recentScores).toHaveLength(35);
    expect(stats.limitation).not.toContain('20');
    expect(JSON.stringify(rows)).toBe(before);
  });

  test.each(['SIMULATED', 'UNASSESSED', 'PENDING_AI'])(
    'counts %s attempts but excludes every assessment field',
    (method) => {
      const stats = learningStats([
        {
          ...attempt,
          result: {
            ...attempt.result,
            method,
            writing: {
              details: {
                parts: [
                  {
                    questions: [
                      {
                        criteria: [
                          { criterion: 'TASK', judgment: 'NEEDS_IMPROVEMENT' },
                        ],
                      },
                    ],
                  },
                ],
              },
            },
            speaking: { provider: 'LLM', criteria: { fluency: 90 } },
          },
        },
      ]);
      expect(stats.attemptsConsidered).toBe(1);
      expect(stats.groups[0]).toMatchObject({
        sampleSize: 1,
        recentScores: [],
        parts: [],
        writingCriteria: [],
        speakingCriteria: [],
      });
    },
  );

  test('uses weighted part percentages and keeps skill, purpose, scope and part groups separate', () => {
    const stats = learningStats([
      attempt,
      {
        ...attempt,
        result: {
          parts: [
            { partNumber: 1, score: 1, maxScore: 15 },
            { partNumber: 2, score: 4, maxScore: 5 },
          ],
        },
      },
      { ...attempt, purpose: 'EXAM' },
      { ...attempt, scope: 'PART', part_number: 1 },
      { ...attempt, scope: 'PART', part_number: 2 },
      { ...attempt, component: 'LISTENING' },
    ]);
    expect(stats.groups).toHaveLength(5);
    expect(stats.groups[0].parts).toEqual([
      { partNumber: 1, earned: 4, possible: 20, attempts: 2, percent: 20 },
      { partNumber: 2, earned: 4, possible: 5, attempts: 1, percent: 80 },
    ]);
    expect(stats.groups[0].recentScores[0]).toMatchObject({
      score: 12,
      maxScore: 20,
    });
  });

  test('does not invent scores or aggregate CEFR for empty/unassessed input', () => {
    expect(learningStats([])).toMatchObject({
      attemptsConsidered: 0,
      recentAttempts: [],
      groups: [],
    });
    const stats = learningStats([
      { component: 'WRITING', score: null, max_score: null, result: null },
    ]);
    expect(stats.groups[0]).toMatchObject({
      recentScores: [],
      parts: [],
      writingCriteria: [],
      speakingCriteria: [],
    });
    expect(stats).not.toHaveProperty('estimatedCefr');
  });

  test('keeps Writing observations in their own group and ranks by improvement ratio', () => {
    const result = {
      writing: {
        details: {
          parts: [
            {
              questions: [
                {
                  criteria: [
                    { criterion: 'TASK', judgment: 'NEEDS_IMPROVEMENT' },
                    { criterion: 'GRAMMAR', judgment: 'ADEQUATE' },
                    { criterion: 'GRAMMAR', judgment: 'NEEDS_IMPROVEMENT' },
                    { criterion: 'EMPTY', judgment: 'NOT_ASSESSABLE' },
                  ],
                },
              ],
            },
          ],
        },
      },
    };
    const stats = learningStats([
      { ...attempt, component: 'WRITING', result },
      { ...attempt, component: 'WRITING', purpose: 'EXAM', result },
    ]);
    for (const group of stats.groups) {
      expect(group.writingCriteria).toEqual([
        { criterion: 'TASK', observations: 1, needsImprovement: 1 },
        { criterion: 'GRAMMAR', observations: 2, needsImprovement: 1 },
      ]);
    }
  });

  test('includes Speaking criteria only from LLM assessments', () => {
    const stats = learningStats([
      {
        ...attempt,
        component: 'SPEAKING',
        result: {
          speaking: {
            provider: 'LLM',
            version: 'v2',
            criteria: { fluency: 60 },
          },
        },
      },
      {
        ...attempt,
        component: 'SPEAKING',
        result: {
          speaking: { provider: 'SIMULATED', criteria: { fluency: 100 } },
        },
      },
    ]);
    expect(stats.groups[0].speakingCriteria).toEqual([
      {
        attemptId: attempt.id,
        date: attempt.submitted_at,
        version: 'v2',
        percentages: { fluency: 60 },
      },
    ]);
  });
});
