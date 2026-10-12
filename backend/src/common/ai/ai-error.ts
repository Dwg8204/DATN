export class AiError extends Error {
  constructor(
    readonly code: string,
    readonly retryable = false,
    readonly retryAfterMs?: number,
    readonly validationRule?: string,
  ) {
    super(code);
    this.name = 'AiError';
  }
}
