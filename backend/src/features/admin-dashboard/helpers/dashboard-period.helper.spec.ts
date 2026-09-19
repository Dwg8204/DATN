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
  });

  it('returns exactly twenty-four hourly buckets', () => {
    const range = dashboardRange('24-hours', now);
    expect(dashboardBuckets(range)).toHaveLength(24);
  });
});
