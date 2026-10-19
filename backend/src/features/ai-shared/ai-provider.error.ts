export type AiFailureReason =
  | 'CONFIG_INVALID'
  | 'QUOTA'
  | 'TIMEOUT'
  | 'SAFETY'
  | 'INCOMPLETE'
  | 'UNAVAILABLE'
  | `PROVIDER_${number}`;

/** Safe metadata only: never retain provider response bodies or credentials. */
export class AiProviderError extends Error {
  constructor(
    readonly reason: AiFailureReason,
    readonly retryAfterMs?: number,
  ) {
    super(`AI_${reason}`);
    this.name = 'AiProviderError';
  }
}

export function toAiProviderError(
  error: unknown,
  signal: AbortSignal,
): AiProviderError {
  if (signal.aborted) return new AiProviderError('TIMEOUT');
  return error instanceof AiProviderError
    ? error
    : new AiProviderError('UNAVAILABLE');
}
