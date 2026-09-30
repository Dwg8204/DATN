import { assessSpeaking } from './speaking-assessment';
import { estimateCefr } from '../policies/exam-cefr.policy';
import { AssessableItem } from '../types/attempt.type';

const items: AssessableItem[] = [{ key: 'p1:q1', partNumber: 1, kind: 'AUDIO', points: 0 }];
describe('Speaking simulated assessment', () => {
  it('averages four criteria and converts to fifty points', () => {
    const values = [80, 70, 90, 60];
    const result = assessSpeaking(items, { 'p1:q1': { kind: 'AUDIO', mediaKey: 'https://example.com/audio.webm' } }, () => values.shift()!);
    expect(result).toMatchObject({ method: 'SIMULATED', score: 37.5, maxScore: 50,
      speaking: { averagePercentage: 75, criteria: { grammarVocabulary: 80, pronunciation: 70, fluency: 90, taskFulfillment: 60 } } });
    expect(result.items[0].outcome).toBe('ASSESSED');
  });
  it('does not generate random scores for an empty submission', () => {
    const random = jest.fn(() => 100);
    expect(assessSpeaking(items, {}, random).score).toBe(0);
    expect(random).not.toHaveBeenCalled();
  });
  it.each([[0, 'A1'], [15.99, 'A1'], [16, 'A2'], [25.99, 'A2'], [26, 'B1'],
    [40.99, 'B1'], [41, 'B2'], [47.99, 'B2'], [48, 'C'], [50, 'C']])('maps %s to %s', (score, cefr) => {
    expect(estimateCefr('SPEAKING', Number(score), 50)).toBe(cefr);
  });
});
