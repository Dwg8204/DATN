export function remainingSeconds(expiresAt, serverTime, synchronizedAt = Date.now(), clientNow = Date.now()) {
  if (!expiresAt) return null;
  const serverOffset = serverTime ? new Date(serverTime).getTime() - synchronizedAt : 0;
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - (clientNow + serverOffset)) / 1000));
}

export function formatRemainingTime(seconds) {
  if (!Number.isFinite(seconds)) return '';
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainder = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

export function formatDuration(startedAt, submittedAt) {
  const duration = Math.max(0, Math.floor((new Date(submittedAt).getTime() - new Date(startedAt).getTime()) / 1000));
  const hours = Math.floor(duration / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((duration % 3600) / 60).toString().padStart(2, '0');
  const seconds = (duration % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}
