import { nextReportDelivery, planWindow, reportWeeks, zonedTime } from './report-schedule';

describe('goal-relative report schedule', () => {
  it.each([[3, 0], [6, 0], [7, 0], [8, 1], [14, 1], [27, 3], [28, 3], [30, 4], [180, 25]])(
    '%i days produces %i reports, excluding the final week', (days, count) => {
      expect(reportWeeks(days)).toHaveLength(count);
      expect(reportWeeks(days).every(period => period.week * 7 < days)).toBe(true);
    },
  );
  it('upgrades week 2 for 30 days and chooses the earlier week on a tie', () => {
    expect(reportWeeks(30).map(p => p.kind)).toEqual(['WEEKLY', 'MIDTERM', 'WEEKLY', 'WEEKLY']);
    expect(reportWeeks(35).find(p => p.kind === 'MIDTERM')?.week).toBe(2);
    expect(reportWeeks(27).some(p => p.kind === 'MIDTERM')).toBe(false);
  });
  it('limits the last partial week to remaining dates', () => {
    expect(planWindow('2026-10-01', 30, 5)).toEqual({ weekIndex: 5, startsOn: '2026-10-29', endsOn: '2026-10-30', days: 2 });
  });
  it.each([
    ['2026-10-08T01:00:00+07:00', '2026-10-08T01:00:00Z'],
    ['2026-10-08T08:00:00+07:00', '2026-10-08T01:00:00Z'],
    ['2026-10-08T09:00:00+07:00', '2026-10-09T01:00:00Z'],
  ])('schedules %s at the first available 08:00', (ready, expected) => {
    expect(nextReportDelivery(new Date(ready), 'Asia/Ho_Chi_Minh').toISOString()).toBe(new Date(expected).toISOString());
  });
  it('resolves 08:00 across the DST transition without adding a fixed 24h', () => {
    expect(nextReportDelivery(new Date('2026-10-31T09:00:00-04:00'), 'America/New_York').toISOString()).toBe('2026-11-01T13:00:00.000Z');
    expect(zonedTime('2026-03-08', 8, 'America/New_York').toISOString()).toBe('2026-03-08T12:00:00.000Z');
  });
});
