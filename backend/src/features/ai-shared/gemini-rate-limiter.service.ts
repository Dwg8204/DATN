import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProviderError } from './ai-provider.error';

const WINDOW_MS = 60_000;

@Injectable()
export class GeminiRateLimiter {
  private readonly windows = new Map<
    string,
    { calls: number[]; blockedUntil: number }
  >();

  constructor(private readonly config: ConfigService) {}

  /** Synchronous reservation prevents concurrent callers from exceeding the local window. */
  acquire(model: string) {
    const now = Date.now();
    const window = this.windows.get(model) ?? { calls: [], blockedUntil: 0 };
    window.calls = window.calls.filter((time) => time > now - WINDOW_MS);
    this.windows.set(model, window);
    if (window.blockedUntil > now) {
      throw new AiProviderError('QUOTA', window.blockedUntil - now);
    }
    const limit = Number(this.config.get('GEMINI_MAX_RPM', 5));
    if (!Number.isInteger(limit) || limit < 1)
      throw new AiProviderError('CONFIG_INVALID');
    if (window.calls.length >= limit) {
      throw new AiProviderError('QUOTA', window.calls[0] + WINDOW_MS - now);
    }
    window.calls.push(now);
  }

  defer(model: string, retryAfterMs: number) {
    const window = this.windows.get(model) ?? { calls: [], blockedUntil: 0 };
    window.blockedUntil = Math.max(
      window.blockedUntil,
      Date.now() + retryAfterMs,
    );
    this.windows.set(model, window);
  }
}
