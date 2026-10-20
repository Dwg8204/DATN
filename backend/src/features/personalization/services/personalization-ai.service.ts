import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JsonGenerationService } from '../../ai-shared/json-generation.service';
import { AiProviderError } from '../../ai-shared/ai-provider.error';
import {
  COMMENT_PROMPT_VERSION,
  COMMENT_SCHEMA,
  COMMENT_SYSTEM,
  CommentValidationError,
  validateComment,
} from '../ai/comment.contract';

@Injectable()
export class PersonalizationAiService {
  constructor(
    private readonly config: ConfigService,
    private readonly generation: JsonGenerationService,
  ) {}
  get enabled(): boolean {
    return (
      String(this.config.get('PERSONALIZATION_AI_ENABLED', false)) === 'true'
    );
  }
  get maxRpm(): number {
    return Number(this.config.get('PERSONALIZATION_MAX_RPM', 5));
  }

  async comment(
    userId: string,
    snapshot: Record<string, unknown>,
    issues: string[] = [],
  ) {
    const provider = this.config.get<string>(
      'PERSONALIZATION_PROVIDER',
      'gemini',
    );
    const model =
      this.config.get<string>('PERSONALIZATION_MODEL') ||
      (provider === 'gemini'
        ? this.config.get<string>('CHATBOT_MODEL', 'gemini-3.5-flash-lite')
        : '');
    if (!model) throw new AiProviderError('CONFIG_INVALID');
    const result = await this.generation.generate(
      {
        model,
        provider,
        system: COMMENT_SYSTEM,
        temperature: 0.2,
        maxOutputTokens: 2048,
        schema: COMMENT_SCHEMA,
        prompt: JSON.stringify({
          snapshot,
          ...(issues.length ? { validationErrors: issues } : {}),
        }),
        context: {
          userId,
          purpose: 'PERSONAL_COMMENT',
          promptVersion: COMMENT_PROMPT_VERSION,
          errorCodePrefix: 'PERSONALIZATION',
        },
      },
      AbortSignal.timeout(
        Number(this.config.get('PERSONALIZATION_AI_TIMEOUT_MS', 20_000)),
      ),
    );
    let parsed: unknown;
    try {
      parsed = JSON.parse(result.text);
    } catch {
      throw new CommentValidationError(['INVALID_JSON']);
    }
    return {
      content: validateComment(parsed, snapshot),
      requestId: result.requestId,
    };
  }
}
