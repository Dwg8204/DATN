import { addDays, dayNumber, localDay } from './calendar';

/** Weeks are relative to the goal, never calendar weeks. The final week has no WEEKLY. */
export function reportWeeks(durationDays: number) {
  const weeks = Array.from({ length: Math.floor((durationDays - 1) / 7) }, (_, i) => i + 1);
  const midterm = durationDays >= 28
    ? weeks.reduce((best, week) =>
      Math.abs(week * 7 - durationDays / 2) < Math.abs(best * 7 - durationDays / 2) ? week : best, weeks[0])
    : null;
  return weeks.map(week => ({ week, kind: week === midterm ? 'MIDTERM' as const : 'WEEKLY' as const }));
}

/** Resolve a local wall-clock time using IANA offsets (including DST). */
export function zonedTime(day: string, hour: number, timezone: string): Date {
  const target = Date.parse(`${day}T${String(hour).padStart(2, '0')}:00:00Z`);
  let timestamp = target;
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  });
  for (let i = 0; i < 5; i++) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(timestamp)).map(p => [p.type, p.value]));
    const displayed = Date.parse(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`);
    const delta = target - displayed;
    if (delta === 0) return new Date(timestamp);
    timestamp += delta;
  }
  // Historical zones can skip midnight; PostgreSQL resolves snapshot boundaries in scheduling.
  throw new Error('LOCAL_TIME_DOES_NOT_EXIST');
}

export function nextReportDelivery(readyAt: Date, timezone: string): Date {
  const today = localDay(readyAt, timezone);
  const morning = zonedTime(today, 8, timezone);
  return morning >= readyAt ? morning : zonedTime(addDays(today, 1), 8, timezone);
}

export function planWindow(startDate: string, durationDays: number, week: number) {
  const startsOn = addDays(startDate, (week - 1) * 7);
  const endsOn = [addDays(startsOn, 6), addDays(startDate, durationDays - 1)].sort()[0];
  return { weekIndex: week, startsOn, endsOn, days: Math.max(0, dayNumber(endsOn) - dayNumber(startsOn) + 1) };
}
