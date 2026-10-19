export function localDay(date: Date, timezone: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export const dayNumber = (day: string) =>
  Math.floor(Date.parse(`${day}T00:00:00Z`) / 86400000);
export const addDays = (day: string, days: number) =>
  new Date((dayNumber(day) + days) * 86400000).toISOString().slice(0, 10);
