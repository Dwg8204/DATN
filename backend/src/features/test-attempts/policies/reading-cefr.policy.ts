import { SkillComponent } from '../types/attempt.type';

type ReadingCefrInput = {
  component: SkillComponent; scope?: string; status: string;
  score?: string | number | null; max_score?: string | number | null;
  result?: { method?: string; parts?: Array<{ partNumber: number; maxScore: number | null }> } | null;
};

// AptiMate's existing Reading practice bands, NOT British Council cut scores.
// Raw correct-answer percentages are not official Aptis scaled scores /50.
const BANDS = [
  { level: 'A1', minimumPercentage: 0 },
  { level: 'A2', minimumPercentage: 30 },
  { level: 'B1', minimumPercentage: 50 },
  { level: 'B2', minimumPercentage: 70 },
  { level: 'C', minimumPercentage: 90 },
] as const;

/** Response-only estimate, also available for old saved attempts. No regrading. */
export function readingCefrEstimate(attempt: ReadingCefrInput) {
  if (attempt.component !== 'READING' || attempt.scope !== 'FULL_SKILL' || attempt.status !== 'SUBMITTED'
    || attempt.result?.method !== 'OBJECTIVE' || attempt.score == null || attempt.max_score == null) return null;
  const parts = attempt.result.parts;
  if (!Array.isArray(parts) || ![1, 2, 3, 4].every(number => parts.some(part => part.partNumber === number && (part.maxScore ?? 0) > 0))) return null;
  const score = Number(attempt.score), maximum = Number(attempt.max_score);
  if (!Number.isFinite(score) || !Number.isFinite(maximum) || maximum <= 0 || score < 0 || score > maximum) return null;
  const percentage = score / maximum * 100;
  const band = [...BANDS].reverse().find(candidate => percentage >= candidate.minimumPercentage)!;
  return {
    kind: 'PRACTICE_ESTIMATE' as const, policyVersion: 'APTIMATE_READING_V1', level: band.level,
    bands: BANDS.map(item => ({ ...item })),
  };
}
