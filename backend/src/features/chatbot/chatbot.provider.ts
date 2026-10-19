import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProviderError } from '../ai-shared/ai-provider.error';
import { GeminiClient } from '../ai-shared/gemini-client.service';
import { GeminiGenerationService } from '../ai-shared/gemini-generation.service';
import { GeminiContent, GeminiMethod } from '../ai-shared/gemini.types';
import { chatError } from './chatbot.repository';

export type { GeminiContent } from '../ai-shared/gemini.types';
export type ChatCallContext = { userId: string; messageId: string };

const CHAT_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    text: { type: 'STRING' },
    citationIds: { type: 'ARRAY', items: { type: 'STRING' }, maxItems: 6 },
    actions: {
      type: 'ARRAY',
      maxItems: 3,
      items: {
        type: 'OBJECT',
        properties: { code: { type: 'STRING' }, attemptId: { type: 'STRING' } },
        required: ['code'],
      },
    },
  },
  required: ['text', 'citationIds', 'actions'],
};

@Injectable()
export class ChatbotProvider {
  constructor(
    private readonly config: ConfigService,
    private readonly client: GeminiClient,
    private readonly generation: GeminiGenerationService,
  ) {}

  get model() {
    return this.config.get<string>('CHATBOT_MODEL', 'gemini-3.5-flash-lite');
  }
  get enabled() {
    return String(this.config.get('CHATBOT_ENABLED', 'false')) === 'true';
  }

  assertReady() {
    if (!this.enabled) throw chatError('CHAT_DISABLED', 503);
    try {
      this.client.assertReady(this.model);
    } catch (error) {
      throw toChatError(error);
    }
  }

  async generate(
    system: string,
    contents: GeminiContent[],
    tools: Record<string, unknown>[],
    ctx: ChatCallContext,
    signal: AbortSignal,
  ) {
    this.assertReady();
    try {
      const result = await this.generation.generate(
        {
          model: this.model,
          system,
          contents,
          tools,
          responseSchema: CHAT_RESPONSE_SCHEMA,
          context: {
            userId: ctx.userId,
            chatMessageId: ctx.messageId,
            purpose: 'CHAT',
            promptVersion: 'aptimate-chat-v1',
            errorCodePrefix: 'CHAT',
          },
        },
        signal,
      );
      return result.content;
    } catch (error) {
      throw toChatError(error);
    }
  }

  async request(
    model: string,
    method: GeminiMethod,
    body: unknown,
    signal: AbortSignal,
  ) {
    try {
      return await this.client.request(model, method, body, signal);
    } catch (error) {
      throw toChatError(error);
    }
  }

  async embed(text: string, query: boolean, signal: AbortSignal) {
    this.assertReady();
    const result = await this.request(
      'gemini-embedding-001',
      'embedContent',
      {
        model: 'models/gemini-embedding-001',
        content: { parts: [{ text }] },
        taskType: query ? 'RETRIEVAL_QUERY' : 'RETRIEVAL_DOCUMENT',
        outputDimensionality: 768,
      },
      signal,
    );
    return normalizeVector(result.embedding?.values);
  }
}

function toChatError(error: unknown) {
  const reason =
    error instanceof AiProviderError ? error.reason : 'UNAVAILABLE';
  return chatError(`CHAT_${reason}`, 503);
}

export function normalizeVector(values: unknown): number[] {
  if (
    !Array.isArray(values) ||
    values.length !== 768 ||
    values.some((v) => typeof v !== 'number' || !Number.isFinite(v))
  )
    throw chatError('CHAT_EMBEDDING_INVALID', 502);
  const norm = Math.sqrt(values.reduce((s, v) => s + v * v, 0));
  if (!norm) throw chatError('CHAT_EMBEDDING_INVALID', 502);
  return values.map((v) => v / norm);
}
