import { Answers, AssessmentResult } from '../types/attempt.type';

type LegacyItem = {
  userAnswer?: string | number | null;
  isCorrect?: boolean;
  isSkipped?: boolean;
};

type LegacyResult = {
  score: number;
  maxScore: number;
  partBreakdown: Record<string, LegacyItem[]>;
};

export function isLegacyListeningResult(result: unknown): result is LegacyResult {
  return !!result && typeof result === 'object' && 'partBreakdown' in result &&
    !!(result as LegacyResult).partBreakdown && typeof (result as LegacyResult).partBreakdown === 'object';
}

export function normalizeLegacyListeningResult(result: LegacyResult): AssessmentResult {
  const items = Object.entries(result.partBreakdown).flatMap(([part, rows]) => {
    const partNumber = Number(part.replace('part', ''));
    return rows.map((row, index) => {
      const outcome = row.isSkipped ? 'SKIPPED' : row.isCorrect ? 'CORRECT' : 'INCORRECT';
      return { key: partNumber === 2 || partNumber === 3 ? `p${partNumber}:s${index + 1}` : `p${partNumber}:q${index + 1}`,
        partNumber, outcome, score: row.isCorrect ? 2 : 0, maxScore: 2 } as const;
    });
  });
  const partNumbers = [...new Set(items.map(item => item.partNumber))].sort((a, b) => a - b);
  return {
    schemaVersion: 1, method: 'OBJECTIVE', score: Number(result.score), maxScore: Number(result.maxScore),
    counts: {
      correct: items.filter(item => item.outcome === 'CORRECT').length,
      incorrect: items.filter(item => item.outcome === 'INCORRECT').length,
      skipped: items.filter(item => item.outcome === 'SKIPPED').length,
    },
    parts: partNumbers.map(partNumber => {
      const partItems = items.filter(item => item.partNumber === partNumber);
      return { partNumber, score: partItems.reduce((sum, item) => sum + item.score, 0), maxScore: partItems.length * 2 };
    }),
    items,
  };
}

export function legacyListeningAnswers(
  partNumber: number,
  result: LegacyResult,
  optionTexts: Array<{ id: string; text: string }>,
): Answers {
  const rows = result.partBreakdown[`part${partNumber}`] ?? [];
  return Object.fromEntries(rows.flatMap((row, index) => {
    if (row.userAnswer === null || row.userAnswer === undefined || row.userAnswer === '') return [];
    const key = partNumber === 2 || partNumber === 3 ? `p${partNumber}:s${index + 1}` : `p${partNumber}:q${index + 1}`;
    const optionId = typeof row.userAnswer === 'number'
      ? `o${row.userAnswer}` : optionTexts.find(option => option.text === row.userAnswer)?.id;
    if (!optionId) return [];
    return [[key, { kind: partNumber === 2 || partNumber === 3 ? 'MATCH' : 'CHOICE', optionId }]];
  }));
}
