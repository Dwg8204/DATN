// Keep retry polling bounded; READY/FALLBACK/HIDDEN stop it entirely.
export function commentPollDelay(status, attempt = 0) {
  if (!['PENDING', 'RETRYING'].includes(status)) return null;
  return Math.min(60000, 15000 * 2 ** Math.min(2, Math.max(0, attempt)));
}
