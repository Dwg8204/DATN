import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProviderError, toAiProviderError } from './ai-provider.error';
import { GeminiRateLimiter } from './gemini-rate-limiter.service';
import { GeminiMethod, GeminiResponse } from './gemini.types';

const METHODS = new Set<GeminiMethod>([
  'generateContent',
  'embedContent',
  'batchEmbedContents',
  'countTokens',
]);

@Injectable()
export class GeminiClient {
  constructor(
    private readonly config: ConfigService,
    private readonly limiter: GeminiRateLimiter,
  ) {}

  assertReady(model: string) {
    if (
      !/^[\w.-]+$/.test(model) ||
      this.config.get('GEMINI_BILLING_TIER') !== 'FREE' ||
      String(this.config.get('GEMINI_FREE_PROJECT_CONFIRMED')) !== 'true' ||
      String(this.config.get('GEMINI_PAID_PROJECT_CONFIRMED', 'false')) ===
        'true' ||
      !this.config.get('GEMINI_API_KEY')
    ) {
      throw new AiProviderError('CONFIG_INVALID');
    }
  }

  async request(
    model: string,
    method: GeminiMethod,
    body: unknown,
    signal: AbortSignal,
  ): Promise<GeminiResponse> {
    this.assertReady(model);
    if (!METHODS.has(method)) throw new AiProviderError('CONFIG_INVALID');
    try {
      signal.throwIfAborted();
      this.limiter.acquire(model);
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:${method}`,
        {
          method: 'POST',
          redirect: 'error',
          signal,
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.config.get<string>('GEMINI_API_KEY', ''),
          },
          body: JSON.stringify(body),
        },
      );
      if (response.status === 429) {
        const delay = Math.max(
          retryDelay(response.headers?.get('retry-after')),
          await providerRetryDelay(response),
        );
        this.limiter.defer(model, delay);
        throw new AiProviderError('QUOTA', delay);
      }
      if (!response.ok)
        throw new AiProviderError(`PROVIDER_${response.status}`);
      return (await response.json()) as GeminiResponse;
    } catch (error) {
      throw toAiProviderError(error, signal);
    }
  }
}

// Read only the duration; never log or persist upstream messages/project IDs.
async function providerRetryDelay(response: Response): Promise<number> {
  try {
    const body = await response.json();
    const details = body?.error?.details;
    if (!Array.isArray(details)) return 0;
    const seconds = details
      .filter(
        (detail: any) =>
          detail?.['@type'] === 'type.googleapis.com/google.rpc.RetryInfo',
      )
      .map((detail: any) => /^(\d+(?:\.\d+)?)s$/.exec(detail.retryDelay ?? ''))
      .map((match: RegExpExecArray | null) => (match ? Number(match[1]) : 0));
    return Math.min(86400000, Math.max(0, ...seconds) * 1000);
  } catch {
    return 0;
  }
}

function retryDelay(value?: string | null): number {
  if (!value?.trim()) return 60_000;
  const seconds = Number(value);
  const delay = Number.isFinite(seconds)
    ? seconds * 1000
    : Date.parse(value) - Date.now();
  return Number.isFinite(delay) ? Math.max(1000, delay) : 60_000;
}
