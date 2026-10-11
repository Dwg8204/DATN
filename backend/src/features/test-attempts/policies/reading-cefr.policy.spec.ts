import { readingCefrEstimate } from './reading-cefr.policy';
import { AssessmentResult, LockedAttemptRow } from '../types/attempt.type';

const result = { method: 'OBJECTIVE', parts: [1, 2, 3, 4].map(partNumber => ({ partNumber, maxScore: 5 })) } as AssessmentResult;
const attempt = { component: 'READING', scope: 'FULL_SKILL', status: 'SUBMITTED', score: '0', max_score: '29', result } as LockedAttemptRow;

describe('AptiMate Reading practice CEFR estimate (not official Aptis conversion)', () => {
  it.each([[0, 'A1'], [8, 'A1'], [9, 'A2'], [14, 'A2'], [15, 'B1'], [20, 'B1'],
    [21, 'B2'], [26, 'B2'], [27, 'C'], [29, 'C']])('estimates %s/29 as %s', (score, level) => {
    expect(readingCefrEstimate({ ...attempt, score: String(score) })).toMatchObject({
      kind: 'PRACTICE_ESTIMATE', policyVersion: 'APTIMATE_READING_V1', level,
    });
  });

  it.each([[29.999, 'A1'], [30, 'A2'], [49.999, 'A2'], [50, 'B1'], [69.999, 'B1'],
    [70, 'B2'], [89.999, 'B2'], [90, 'C']])('does not round %s percent across a boundary', (score, level) => {
    expect(readingCefrEstimate({ ...attempt, score: String(score), max_score: '100' })?.level).toBe(level);
  });

  it('only estimates completed full Reading papers with all four parts', () => {
    for (const patch of [{ component: 'LISTENING' }, { scope: 'PART' }, { status: 'IN_PROGRESS' },
      { result: null }, { result: { ...result, method: 'PENDING_AI' } },
      { result: { ...result, parts: result.parts.slice(0, 3) } }]) {
      expect(readingCefrEstimate({ ...attempt, ...patch } as LockedAttemptRow)).toBeNull();
    }
  });

  it.each([[null, '29'], ['0', null], ['NaN', '29'], ['Infinity', '29'], ['1', '0'],
    ['-1', '29'], ['30', '29'], ['1', '-29']])('rejects invalid scores %s/%s', (score, max_score) => {
    expect(readingCefrEstimate({ ...attempt, score, max_score })).toBeNull();
  });

  it('leaves the saved grade unchanged and returns independent display metadata', () => {
    const stored = JSON.stringify(attempt);
    const estimate = readingCefrEstimate(attempt)!;
    estimate.bands.pop();
    expect(JSON.stringify(attempt)).toBe(stored);
    expect(readingCefrEstimate(attempt)!.bands.map(band => band.minimumPercentage)).toEqual([0, 30, 50, 70, 90]);
  });
});
