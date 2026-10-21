import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProviderError, toAiProviderError } from './ai-provider.error';
import { AiRequestRecorder } from './ai-request-recorder.service';
import { GeminiGenerationService } from './gemini-generation.service';

export interface JsonGenerationInput {
  provider: string;
  model: string;
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  temperature: number;
  maxOutputTokens: number;
  context: {
    userId: string;
    purpose: string;
    promptVersion: string;
    errorCodePrefix?: string;
  };
}
export interface JsonGenerationResult {
  text: string;
  requestId: string;
}
export interface JsonGenerationProvider {
  generate(
    input: JsonGenerationInput,
    signal: AbortSignal,
  ): Promise<JsonGenerationResult>;
}

@Injectable()
export class GeminiJsonProvider implements JsonGenerationProvider {
  constructor(private readonly generation: GeminiGenerationService) {}
  async generate(input: JsonGenerationInput, signal: AbortSignal) {
    const result = await this.generation.generate(
      {
        model: input.model,
        system: input.system,
        responseSchema: input.schema,
        contents: [{ role: 'user', parts: [{ text: input.prompt }] }],
        temperature: input.temperature,
        maxOutputTokens: input.maxOutputTokens,
        context: input.context,
      },
      signal,
    );
    return {
      requestId: result.requestId,
      text: result.content.parts
        .filter((part) => !part.thought && typeof part.text === 'string')
        .map((part) => part.text)
        .join(''),
    };
  }
}

type ChatResponse = {
  choices?: Array<{
    finish_reason?: string;
    message?: { content?: string | null; refusal?: string | null };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    prompt_cache_hit_tokens?: number;
    prompt_tokens_details?: { cached_tokens?: number };
    completion_tokens_details?: { reasoning_tokens?: number };
  };
};

/** DeepSeek/xAI share Chat Completions JSON mode. The caller still validates the schema. */
@Injectable()
export class OpenAiCompatibleJsonProvider implements JsonGenerationProvider {
  constructor(
    private readonly config: ConfigService,
    private readonly recorder: AiRequestRecorder,
  ) {}
  async generate(
    input: JsonGenerationInput,
    signal: AbortSignal,
  ): Promise<JsonGenerationResult> {
    const defaults: Record<string, { url: string; key: string }> = {
      deepseek: { url: 'https://api.deepseek.com/v1', key: 'DEEPSEEK_API_KEY' },
      xai: { url: 'https://api.x.ai/v1', key: 'XAI_API_KEY' },
      'openai-compatible': { url: '', key: 'PERSONALIZATION_API_KEY' },
    };
    const preset = defaults[input.provider];
    if (!preset || !input.model.trim())
      throw new AiProviderError('CONFIG_INVALID');
    const key =
      this.config.get<string>('PERSONALIZATION_API_KEY') ||
      this.config.get<string>(preset.key);
    const base =
      this.config.get<string>('PERSONALIZATION_BASE_URL') || preset.url;
    let endpoint: URL;
    try {
      endpoint = new URL(`${base.replace(/\/+$/, '')}/chat/completions`);
    } catch {
      throw new AiProviderError('CONFIG_INVALID');
    }
    if (
      !key ||
      endpoint.protocol !== 'https:' ||
      endpoint.username ||
      endpoint.password ||
      endpoint.search ||
      endpoint.hash
    )
      throw new AiProviderError('CONFIG_INVALID');
    const request = {
      model: input.model,
      messages: [
        { role: 'system', content: input.system },
        { role: 'user', content: input.prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: input.temperature,
      max_tokens: input.maxOutputTokens,
      stream: false,
    };
    const requestId = await this.recorder.start(input, request, input.provider);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        redirect: 'error',
        signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify(request),
      });
      if (response.status === 429) {
        const retry = response.headers.get('retry-after');
        const delay =
          retry && Number.isFinite(Number(retry))
            ? Number(retry) * 1000
            : Date.parse(retry ?? '') - Date.now();
        throw new AiProviderError(
          'QUOTA',
          Number.isFinite(delay) ? Math.max(1000, delay) : 60_000,
        );
      }
      if (!response.ok)
        throw new AiProviderError(`PROVIDER_${response.status}`);
      const result = (await response.json()) as ChatResponse;
      signal.throwIfAborted();
      const choice = result.choices?.[0];
      if (
        choice?.message?.refusal ||
        choice?.finish_reason === 'content_filter'
      )
        throw new AiProviderError('SAFETY');
      if (
        choice?.finish_reason !== 'stop' ||
        typeof choice.message?.content !== 'string' ||
        !choice.message.content.trim()
      )
        throw new AiProviderError('INCOMPLETE');
      await this.recorder.complete(
        requestId,
        {
          promptTokenCount: result.usage?.prompt_tokens,
          candidatesTokenCount: result.usage?.completion_tokens,
          cachedContentTokenCount:
            result.usage?.prompt_tokens_details?.cached_tokens ??
            result.usage?.prompt_cache_hit_tokens,
          thoughtsTokenCount:
            result.usage?.completion_tokens_details?.reasoning_tokens,
        },
        null,
      ); // Token counts are known; pricing is not. Never label a paid provider as free.
      return { requestId, text: choice.message.content };
    } catch (error) {
      const failure = toAiProviderError(error, signal);
      await this.recorder.fail(
        requestId,
        `${input.context.errorCodePrefix ?? 'AI'}_${failure.reason}`,
      );
      throw failure;
    }
  }
}

@Injectable()
export class JsonGenerationService {
  constructor(
    private readonly gemini: GeminiJsonProvider,
    private readonly compatible: OpenAiCompatibleJsonProvider,
  ) {}
  generate(input: JsonGenerationInput, signal: AbortSignal) {
    if (input.provider === 'gemini') return this.gemini.generate(input, signal);
    if (['deepseek', 'xai', 'openai-compatible'].includes(input.provider))
      return this.compatible.generate(input, signal);
    throw new AiProviderError('CONFIG_INVALID');
  }
}
