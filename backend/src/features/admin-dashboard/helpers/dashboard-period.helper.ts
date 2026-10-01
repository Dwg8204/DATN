import { DashboardBucket, DashboardPeriod, DashboardRange } from '../types/admin-dashboard.type';

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

const PERIOD_LABELS: Record<DashboardPeriod, string> = {
  'this-year': 'This year',
  '12-months': '12 months',
  '6-months': '6 months',
  '30-days': '30 days',
  week: 'Week',
  '24-hours': '24 hours',
};

function bangkokDate(date: Date): Date {
  return new Date(date.getTime() + BANGKOK_OFFSET_MS);
}

function fromBangkokParts(year: number, month: number, day: number, hour = 0): Date {
  return new Date(Date.UTC(year, month, day, hour) - BANGKOK_OFFSET_MS);
}

function startOfBangkokDay(date: Date): Date {
  const local = bangkokDate(date);
  return fromBangkokParts(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
}

function startOfBangkokMonth(date: Date, monthOffset = 0): Date {
  const local = bangkokDate(date);
  return fromBangkokParts(local.getUTCFullYear(), local.getUTCMonth() + monthOffset, 1);
}

function shiftBangkokMonths(date: Date, months: number): Date {
  const local = bangkokDate(date);
  const first = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(
    first.getUTCFullYear(), first.getUTCMonth(), Math.min(local.getUTCDate(), lastDay),
    local.getUTCHours(), local.getUTCMinutes(), local.getUTCSeconds(), local.getUTCMilliseconds(),
  ) - BANGKOK_OFFSET_MS);
}

export function dashboardRange(period: DashboardPeriod, now = new Date()): DashboardRange {
  const local = bangkokDate(now);
  let start: Date;
  let bucket: DashboardBucket;

  switch (period) {
    case 'this-year':
      start = fromBangkokParts(local.getUTCFullYear(), 0, 1);
      bucket = 'month';
      break;
    case '12-months':
      start = startOfBangkokMonth(now, -11);
      bucket = 'month';
      break;
    case '6-months':
      start = startOfBangkokMonth(now, -5);
      bucket = 'month';
      break;
    case '30-days':
      start = new Date(startOfBangkokDay(now).getTime() - 29 * 86_400_000);
      bucket = 'day';
      break;
    case 'week': {
      const day = local.getUTCDay();
      const daysFromMonday = day === 0 ? 6 : day - 1;
      start = new Date(startOfBangkokDay(now).getTime() - daysFromMonday * 86_400_000);
      bucket = 'day';
      break;
    }
    case '24-hours':
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      bucket = 'hour';
      break;
  }

  const monthShift = period === 'this-year' || period === '12-months' ? -12 : period === '6-months' ? -6 : 0;
  const dayShift = period === '30-days' ? 30 : period === 'week' ? 7 : 1;
  const comparisonStart = monthShift
    ? shiftBangkokMonths(start, monthShift)
    : new Date(start.getTime() - dayShift * 86_400_000);
  const comparisonEnd = monthShift
    ? shiftBangkokMonths(now, monthShift)
    : new Date(now.getTime() - dayShift * 86_400_000);
  return {
    key: period,
    label: PERIOD_LABELS[period],
    timezone: 'Asia/Bangkok',
    bucket,
    start,
    end: now,
    comparisonStart,
    comparisonEnd,
  };
}

export function dashboardBuckets(range: DashboardRange): Array<{ key: string; label: string; start: Date }> {
  const buckets: Array<{ key: string; label: string; start: Date }> = [];
  const localStart = bangkokDate(range.start);
  const localEnd = bangkokDate(range.end);
  let cursor: Date;

  if (range.bucket === 'month') {
    cursor = new Date(Date.UTC(localStart.getUTCFullYear(), localStart.getUTCMonth(), 1));
    while (cursor <= localEnd) {
      buckets.push({
        key: cursor.toISOString().slice(0, 7),
        label: cursor.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }),
        start: new Date(cursor),
      });
      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    }
    return buckets;
  }

  if (range.bucket === 'day') {
    cursor = new Date(Date.UTC(localStart.getUTCFullYear(), localStart.getUTCMonth(), localStart.getUTCDate()));
    const end = new Date(Date.UTC(localEnd.getUTCFullYear(), localEnd.getUTCMonth(), localEnd.getUTCDate()));
    while (cursor <= end) {
      buckets.push({
        key: cursor.toISOString().slice(0, 10),
        label: cursor.toLocaleString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' }),
        start: new Date(cursor),
      });
      cursor = new Date(cursor.getTime() + 86_400_000);
    }
    return buckets;
  }

  cursor = new Date(Date.UTC(
    localStart.getUTCFullYear(), localStart.getUTCMonth(), localStart.getUTCDate(), localStart.getUTCHours(),
  ));
  const end = new Date(Date.UTC(
    localEnd.getUTCFullYear(), localEnd.getUTCMonth(), localEnd.getUTCDate(), localEnd.getUTCHours(),
  ));
  while (cursor <= end) {
    buckets.push({
      key: cursor.toISOString().slice(0, 13),
      label: `${String(cursor.getUTCHours()).padStart(2, '0')}:00`,
      start: new Date(cursor),
    });
    cursor = new Date(cursor.getTime() + 3_600_000);
  }
  return buckets;
}

export function dashboardBucketKey(value: Date | string, bucket: DashboardBucket): string {
  const date = value instanceof Date ? value : new Date(value);
  const shifted = bangkokDate(date);
  if (bucket === 'month') return shifted.toISOString().slice(0, 7);
  if (bucket === 'day') return shifted.toISOString().slice(0, 10);
  return shifted.toISOString().slice(0, 13);
}
