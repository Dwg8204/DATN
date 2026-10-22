export const WRITING_INVALID_OUTPUT_MAX_ATTEMPTS = 8;
export const isWritingInvalidOutput = (code: string | null): boolean =>
  ['AI_INVALID_RESPONSE', 'AI_WRITING_EVIDENCE_INVALID', 'AI_RESPONSE_INCOMPLETE'].includes(code ?? '');

// This exception is Writing/Gemini-only; do not mutate immutable job snapshots or Groq quotas.
export const writingAttemptLimit = (configured: number, code: string | null): number =>
  isWritingInvalidOutput(code) ? WRITING_INVALID_OUTPUT_MAX_ATTEMPTS : configured;

export function writingRetryDelay(code: string, attemptCount: number, retryAfterMs?: number,
  jitterMs = Math.floor(Math.random() * 3000)): number {
  // Invalid content does not need exponential congestion backoff; respect any provider wait.
  if (isWritingInvalidOutput(code)) return Math.max(20000, retryAfterMs ?? 0) + jitterMs;
  return retryAfterMs ?? Math.min(600000, 30000 * 2 ** (attemptCount - 1)) + jitterMs;
}
