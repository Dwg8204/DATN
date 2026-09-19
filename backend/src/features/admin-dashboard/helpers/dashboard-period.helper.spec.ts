import { dashboardBuckets, dashboardRange } from './dashboard-period.helper';

describe('dashboard period helper', () => {
  const now = new Date('2026-09-18T03:34:00.000Z');

  it('builds twelve monthly buckets in the configured timezone', () => {
    const range = dashboardRange('12-months', now);
    expect(range.start.toISOString()).toBe('2025-09-30T17:00:00.000Z');
    expect(dashboardBuckets(range)).toHaveLength(12);
    expect(dashboardBuckets(range)[0].key).toBe('2025-10');
    expect(dashboardBuckets(range)[11].key).toBe('2026-09');
  });

  it('starts a week on Monday in Bangkok', () => {
    const range = dashboardRange('week', now);
    expect(range.start.toISOString()).toBe('2026-09-13T17:00:00.000Z');
    expect(dashboardBuckets(range)).toHaveLength(5);
    expect(range.comparisonStart.toISOString()).toBe('2026-09-06T17:00:00.000Z');
    expect(range.comparisonEnd.getTime() - range.comparisonStart.getTime())
      .toBe(range.end.getTime() - range.start.getTime());
  });

  it('uses a full rolling twenty-four-hour range with partial edge buckets', () => {
    const range = dashboardRange('24-hours', now);
    expect(range.end.getTime() - range.start.getTime()).toBe(24 * 60 * 60 * 1000);
    expect(range.comparisonEnd).toEqual(range.start);
    expect(dashboardBuckets(range)).toHaveLength(25);
  });
});
