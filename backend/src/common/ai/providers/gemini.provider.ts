import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider, JsonSchema } from '../ai-provider.interface';
import { AiError } from '../ai-error';

export function toGeminiSchema(schema: JsonSchema): object {
  return {
    type: schema.type.toUpperCase(),
    // Keep the recursive response schema small enough for Gemini's schema compiler.
    // Local validation remains authoritative; descriptions communicate omitted bounds.
    ...(schema.type === 'string' && schema.minLength ? {
      description: `Nonempty meaningful text, at most ${schema.maxLength ?? 8000} characters. Never use an empty placeholder.`,
    } : {}),
    ...(schema.nullable ? { nullable: true } : {}),
    ...(schema.enum?.length && schema.type === 'string' ? { enum: schema.enum } : {}),
    ...(schema.enum?.length && schema.type === 'integer' ? { description: `Use only these integer values: ${schema.enum.join(', ')}.` } : {}),
    ...(schema.properties
      ? {
          properties: Object.fromEntries(
            Object.entries(schema.properties).map(([key, value]) => [key, toGeminiSchema(value)]),
          ),
          required: schema.required,
        }
      : {}),
    ...(schema.items ? { items: toGeminiSchema(schema.items) } : {}),
  };
}

@Injectable()
export class GeminiProvider implements AiProvider {
  private readonly logger = new Logger(GeminiProvider.name);
  constructor(private readonly config: ConfigService) {}

  async generateStructured(request: Parameters<AiProvider['generateStructured']>[0]): Promise<unknown> {
    if (!/^[a-zA-Z0-9._-]+$/.test(request.model)) throw new AiError('AI_MODEL_INVALID');
    let response: Response;
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${request.model}:generateContent`,
        {
          method: 'POST',
          redirect: 'error',
          signal: request.signal,
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': this.config.get<string>('GEMINI_API_KEY', ''),
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: request.systemInstruction }] },
            contents: [{ role: 'user', parts: [{ text: JSON.stringify(request.input) }] }],
            generationConfig: {
              temperature: 0,
              candidateCount: 1,
              maxOutputTokens: request.maxOutputTokens,
              responseMimeType: 'application/json',
              responseSchema: toGeminiSchema(request.outputSchema),
            },
          }),
        },
      );
    } catch {
      throw new AiError(request.signal.aborted ? 'AI_TIMEOUT' : 'AI_UNAVAILABLE', true);
    }
    if (!response.ok) {
      this.logger.warn(`Gemini request failed: model=${request.model} httpStatus=${response.status}`);
      const retryHeader = response.headers.get('retry-after');
      const seconds = retryHeader ? Number(retryHeader) : NaN;
      const delay = Number.isFinite(seconds)
        ? Math.max(0, seconds * 1000)
        : retryHeader
          ? Math.max(0, Date.parse(retryHeader) - Date.now())
          : undefined;
      throw new AiError(
        `GEMINI_HTTP_${response.status}`,
        response.status === 429 || response.status >= 500,
        delay !== undefined && Number.isFinite(delay) ? delay : undefined,
      );
    }
    try {
      const body = (await response.json()) as {
        promptFeedback?: { blockReason?: string };
        candidates?: Array<{
          finishReason?: string;
          content?: { parts?: Array<{ text?: string; thought?: boolean }> };
        }>;
      };
      if (body.promptFeedback?.blockReason) throw new AiError('AI_SAFETY_BLOCKED');
      const candidate = body.candidates?.[0];
      const reason = candidate?.finishReason?.replace(/[^A-Z_]/g, '').slice(0, 60) ?? 'MISSING';
      this.logger.log(`Gemini response: model=${request.model} httpStatus=${response.status} finishReason=${reason}`);
      if (candidate?.finishReason === 'SAFETY') throw new AiError('AI_SAFETY_BLOCKED');
      if (candidate?.finishReason !== 'STOP') throw new AiError('AI_RESPONSE_INCOMPLETE', true);
      return JSON.parse(
        candidate.content?.parts
          ?.filter((part) => !part.thought)
          .map((part) => part.text ?? '')
          .join('') ?? '',
      );
    } catch (error) {
      if (error instanceof AiError) throw error;
      throw new AiError('AI_INVALID_RESPONSE', true, undefined, 'GEMINI_JSON');
    }
  }
}
