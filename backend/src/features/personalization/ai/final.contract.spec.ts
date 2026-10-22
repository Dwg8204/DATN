import { validateFinalContent } from './final.contract';
import { ReportJob, reportSnapshot } from './report.contract';
import { buildLearnerSnapshot } from '../policies/learner-snapshot';

const snapshot = buildLearnerSnapshot('test', null, { kind: 'FINAL' }, new Date('2026-10-01T00:00Z'), {
  attempts: [], scoredAttempts: [], reviewDates: [], learningCount: 0, mistakes: [], planItems: [],
});
const job: ReportJob = {
  snapshotVersion: 1, learner: reportSnapshot({ ...snapshot, inputHash: 'fixture' }, 0), candidates: [],
  plan: { days: 0, weekIndex: 0, startsOn: '', endsOn: '', remainingTests: 0, requiredPace: 0 }, promptVersion: 'fixture',
  outcome: { lifecycle: 'EXPIRED', testTargetReached: false, targetReachedOn: null, bandTargetStatus: 'INSUFFICIENT_DATA', endedOn: '2026-10-01' },
};
const good = () => ({
  headline: 'Tổng kết học tập', narrative: 'Tiếp tục luyện tập để có thêm dữ liệu.', achievements: [],
  nextGoalSuggestion: { targetCefr: 'B2', targetTests: 40, durationDays: 30 },
});
describe('FINAL contract', () => {
  it('accepts a valid future goal without treating suggested values as historical statistics', () => {
    expect(validateFinalContent(good(), job)).toEqual(good());
  });
  it.each([
    { targetTests: 0 }, { targetTests: 501 }, { targetTests: 2.5 },
    { durationDays: 2 }, { durationDays: 181 }, { durationDays: 3.1 },
    { targetCefr: 'C2' }, { targetCefr: 'B3' }, { startDate: '2020-01-01' },
  ])('rejects invalid suggested goal %j', patch => {
    const value = good();
    Object.assign(value.nextGoalSuggestion, patch);
    expect(() => validateFinalContent(value, job)).toThrow();
  });
  it.each([
    'Bạn đã hoàn thành 999 bài.',
    'Bạn đã đạt đủ số bài mục tiêu.',
    'Bạn đã đạt band B2.',
    '<b>Tiến bộ</b>',
    'Cam kết đạt điểm thi thật.',
    'từ '.repeat(121),
  ])('rejects unsupported or unsafe text', narrative => {
    expect(() => validateFinalContent({ ...good(), narrative }, job)).toThrow();
  });
  it('rejects plans, missing fields and overlong lists', () => {
    expect(() => validateFinalContent({ ...good(), plan: {} }, job)).toThrow();
    expect(() => validateFinalContent({ headline: 'Tổng kết' }, job)).toThrow();
    expect(() => validateFinalContent({ ...good(), achievements: Array(4).fill('Cố gắng học tập.') }, job)).toThrow();
  });
});
