import { Answers, AssessableItem, AssessmentResult } from '../types/attempt.type';

/** A replaceable provider for Speaking assessment. */
export function assessSpeaking(items: AssessableItem[], answers: Answers,
  percentage?: () => number): AssessmentResult {
  const recorded = items.filter(item => {
    const answer = answers[item.key];
    return answer?.kind === 'AUDIO' && answer.mediaKey.trim().length > 0;
  });
  if (!percentage) return {
    schemaVersion: 1, method: 'PENDING_AI', score: null, maxScore: 50,
    counts: { correct: 0, incorrect: 0, skipped: items.length - recorded.length },
    parts: [...new Set(items.map(item => item.partNumber))].map(partNumber => ({ partNumber, score: null, maxScore: 50 })),
    items: items.map(item => ({ key: item.key, partNumber: item.partNumber,
      outcome: recorded.some(value => value.key === item.key) ? 'PENDING' : 'SKIPPED', score: 0, maxScore: 50 })),
  };
  // Explicit injected providers are retained for legacy fixtures only. Live submissions never randomize.
  const criteria = {
    grammarVocabulary: recorded.length ? percentage() : 0,
    pronunciation: recorded.length ? percentage() : 0,
    fluency: recorded.length ? percentage() : 0,
    taskFulfillment: recorded.length ? percentage() : 0,
  };
  const averagePercentage = Object.values(criteria).reduce((sum, value) => sum + value, 0) / 4;
  const score = Math.round(averagePercentage * 50) / 100;
  const recordedKeys = new Set(recorded.map(item => item.key));
  return {
    schemaVersion: 1, method: 'SIMULATED', score, maxScore: 50,
    counts: { correct: 0, incorrect: 0, skipped: items.length - recorded.length },
    parts: [...new Set(items.map(item => item.partNumber))].map(partNumber => ({ partNumber, score: null, maxScore: null })),
    items: items.map(item => ({ key: item.key, partNumber: item.partNumber,
      outcome: recordedKeys.has(item.key) ? 'ASSESSED' : 'SKIPPED', score: 0, maxScore: 0 })),
    speaking: { provider: 'RANDOM', version: 'random-v1', assessedAt: new Date().toISOString(), criteria, averagePercentage },
  };
}
