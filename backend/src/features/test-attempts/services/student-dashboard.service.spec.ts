import { buildStudentDashboard } from './student-dashboard.service';
import { DashboardAttemptRow } from '../repositories/test-attempts.repository';
import { StudentDashboardQueryDto } from '../dto/student-dashboard-query.dto';

const row = (component: DashboardAttemptRow['component'], submittedAt: string,
  score: number | null, maxScore: number | null, method: 'OBJECTIVE' | 'SIMULATED' | 'UNASSESSED',
  estimatedCefr: string | null = null): DashboardAttemptRow => ({
  component, submittedAt: new Date(submittedAt), score, maxScore, estimatedCefr,
  result: { method, parts: [{ partNumber: 1, score, maxScore }] },
});

describe('student dashboard summary', () => {
  const now = new Date('2026-10-01T05:00:00Z');
  const rows = [
    row('LISTENING', '2026-10-01T04:00:00Z', 40, 50, 'OBJECTIVE', 'B2'),
    row('READING', '2026-09-30T04:00:00Z', 30, 50, 'OBJECTIVE'),
    row('SPEAKING', '2026-09-30T04:00:00Z', 49, 50, 'SIMULATED', 'C'),
    row('WRITING', '2026-09-30T04:00:00Z', null, null, 'UNASSESSED'),
  ];

  it('counts all submitted exams but excludes simulated and unassessed scores from averages', () => {
    const result = buildStudentDashboard(rows, new StudentDashboardQueryDto(), now);
    expect(result.totalTests).toBe(4);
    expect(result.averageScore).toBe(70);
    expect(result.averageBand).toBe('B2');
    expect(result.bestSkill.name).toBe('listening');
    expect(result.weakSkill.name).toBe('reading');
    expect(result.skillCounts.speaking).toBe(1);
    expect(result.excludedSimulatedScores).toBe(1);
    expect(result.streak).toBe(2);
    expect(result.scoreOverTime).toHaveLength(2);
    expect(result.scoreOverTime[0]).not.toHaveProperty('speaking');
  });

  it('applies chart filters without changing overall KPIs', () => {
    const query = Object.assign(new StudentDashboardQueryDto(), { skill: 'reading', part: 'part1', range: '7' });
    const result = buildStudentDashboard(rows, query, now);
    expect(result.totalTests).toBe(4);
    expect(result.averageScore).toBe(70);
    expect(result.scoreOverTime).toEqual([{ day: '2026-09-30', date: '30/09', reading: 60 }]);
    expect(result.skillDistribution.find(item => item.name === 'speaking')?.value).toBe(1);
  });
});
