import { Injectable } from '@nestjs/common';
import { localDay } from '../../personalization/policies/calendar';
import { AuthUser } from '../../auth/types/auth-user.type';
import { StudentDashboardQueryDto } from '../dto/student-dashboard-query.dto';
import { DashboardAttemptRow, TestAttemptsRepository } from '../repositories/test-attempts.repository';

const SKILLS = {
  GRAMMAR_VOCAB: 'grammar', READING: 'reading', LISTENING: 'listening',
  WRITING: 'writing', SPEAKING: 'speaking',
} as const;
const BANDS: Record<string, number> = { A1: 1, A2: 2, B1: 3, B2: 4, C: 5, C1: 5, C2: 6 };
const BAND_LABELS: Record<number, string> = { 1: 'A1', 2: 'A2', 3: 'B1', 4: 'B2', 5: 'C', 6: 'C2' };
function dayNumber(key: string): number {
  return Math.floor(Date.parse(`${key}T00:00:00Z`) / 86_400_000);
}

function roundedAverage(values: number[]): number | null {
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
}

function validPercentage(row: DashboardAttemptRow, part: string): number | null {
  if (row.result?.method !== 'OBJECTIVE' && row.result?.method !== 'AI') return null;
  const partNumber = /^part[1-4]$/.test(part) ? Number(part.slice(4)) : null;
  const partResult = partNumber == null ? null : row.result.parts?.find(item => item.partNumber === partNumber);
  if (partNumber != null && !partResult) return null;
  const score = Number(partResult ? partResult.score : row.score);
  const maximum = Number(partResult ? partResult.maxScore : row.maxScore);
  if ((partResult ? partResult.score : row.score) == null || !Number.isFinite(score) || !Number.isFinite(maximum) || maximum <= 0) return null;
  return Math.max(0, Math.min(100, (score / maximum) * 100));
}

function bandStats(rows: DashboardAttemptRow[]) {
  const bySkill = new Map<string, number[]>();
  const scoresBySkill = new Map<string, number[]>();
  for (const row of rows) {
    const skill = SKILLS[row.component];
    const score = validPercentage(row, 'full');
    if (score != null) scoresBySkill.set(skill, [...(scoresBySkill.get(skill) ?? []), score]);
    // Writing AI has no calibrated numeric score; keep its experimental CEFR out of the cross-skill average.
    if (row.component !== 'WRITING' && (row.result?.method === 'OBJECTIVE' || row.result?.method === 'AI') && row.estimatedCefr && BANDS[row.estimatedCefr]) {
      bySkill.set(skill, [...(bySkill.get(skill) ?? []), BANDS[row.estimatedCefr]]);
    }
  }
  const all = [...bySkill.values()].flat();
  const avgBand = all.length ? BAND_LABELS[Math.round(all.reduce((sum, value) => sum + value, 0) / all.length)] : null;
  const ranked = [...scoresBySkill.entries()].map(([name, values]) => ({
    name, average: values.reduce((sum, value) => sum + value, 0) / values.length,
  })).sort((a, b) => a.average - b.average);
  const skillBand = (entry?: { name: string; average: number }) => entry
    ? { name: entry.name, band: bySkill.has(entry.name)
      ? BAND_LABELS[Math.round(bySkill.get(entry.name)!.reduce((sum, value) => sum + value, 0) / bySkill.get(entry.name)!.length)]
      : null } : { name: null, band: null };
  return { avgBand, bestSkill: skillBand(ranked.at(-1)),
    weakSkill: skillBand(ranked.length > 1 ? ranked[0] : undefined) };
}

function streak(rows: DashboardAttemptRow[], now: Date, timezone: string): number {
  const days = [...new Set(rows.map(row => dayNumber(localDay(new Date(row.submittedAt), timezone))))]
    .sort((a, b) => b - a);
  if (!days.length) return 0;
  const today = dayNumber(localDay(now, timezone));
  if (days[0] < today - 1) return 0;
  let count = 1;
  while (count < days.length && days[count] === days[count - 1] - 1) count += 1;
  return count;
}

export function buildStudentDashboard(rows: DashboardAttemptRow[], query: StudentDashboardQueryDto, now = new Date(), timezone = 'Asia/Ho_Chi_Minh') {
  const skillCounts: Record<string, number> = { all: rows.length, listening: 0, reading: 0, writing: 0, speaking: 0, grammar: 0 };
  const partCounts: Record<string, number> = { full: 0, part1: 0, part2: 0, part3: 0, part4: 0 };
  for (const row of rows) {
    const skill = SKILLS[row.component];
    skillCounts[skill] += 1;
    if (query.skill !== 'all' && query.skill !== skill) continue;
    partCounts.full += 1;
    for (const part of row.result?.parts ?? []) {
      if (part.partNumber >= 1 && part.partNumber <= 4) partCounts[`part${part.partNumber}`] += 1;
    }
  }

  const realScores = rows.map(row => validPercentage(row, 'full')).filter((value): value is number => value != null);
  const { avgBand, bestSkill, weakSkill } = bandStats(rows);
  const earliestDay = query.range === 'all' ? -Infinity : dayNumber(localDay(now, timezone)) - Number(query.range) + 1;
  const dated = rows.filter(row => dayNumber(localDay(new Date(row.submittedAt), timezone)) >= earliestDay);
  const distribution = Object.entries(SKILLS).map(([component, name]) => ({
    name, value: dated.filter(row => row.component === component).length,
  }));
  const chartRows = dated.filter(row => query.skill === 'all' || SKILLS[row.component] === query.skill);
  const grouped = new Map<string, Record<string, number[]>>();
  for (const row of chartRows) {
    const percentage = validPercentage(row, query.part);
    if (percentage == null) continue;
    const key = localDay(new Date(row.submittedAt), timezone);
    const values = grouped.get(key) ?? {};
    const skill = SKILLS[row.component];
    (values[skill] ??= []).push(percentage);
    grouped.set(key, values);
  }
  const scoreOverTime = [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b))
    .map(([key, values]) => ({ date: `${key.slice(8, 10)}/${key.slice(5, 7)}`, day: key,
      ...Object.fromEntries(Object.entries(values).map(([skill, scores]) => [skill, roundedAverage(scores)])) }));

  return {
    totalTests: rows.length, averageScore: roundedAverage(realScores), averageBand: avgBand,
    streak: streak(rows, now, timezone), bestSkill, weakSkill,
    skillCounts, partCounts, scoreOverTime, skillDistribution: distribution,
    excludedSimulatedScores: rows.filter(row => row.result?.method === 'SIMULATED').length,
  };
}

@Injectable()
export class StudentDashboardService {
  constructor(private readonly repository: TestAttemptsRepository) {}

  async get(actor: AuthUser, query: StudentDashboardQueryDto) {
    const [user] = await this.repository.dataSource.query<Array<{ timezone: string }>>('SELECT timezone FROM users WHERE id=$1', [actor.id]);
    return buildStudentDashboard(await this.repository.dashboardAttempts(actor.id), query, new Date(), user?.timezone ?? 'UTC');
  }
}
