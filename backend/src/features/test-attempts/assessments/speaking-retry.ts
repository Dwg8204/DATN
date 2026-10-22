export function speakingRetryDelay(failures: number, retryAfterMs = 0, random = Math.random): number {
  const backoff = 30_000 * 2 ** Math.max(0, Math.min(4, failures - 1));
  return Math.max(backoff + Math.floor(random() * 5000), Number.isFinite(retryAfterMs) ? Math.max(0, retryAfterMs) : 0);
}

export function parseRetryAfter(value: string | null, now = Date.now()): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(value) - now;
  return Number.isFinite(delay) ? Math.max(0, delay) : undefined;
}
