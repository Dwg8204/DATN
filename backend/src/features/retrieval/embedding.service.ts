import { Injectable, Optional } from '@nestjs/common';
import { GeminiClient } from '../ai-shared/gemini-client.service';
import { AiRequestRecorder } from '../ai-shared/ai-request-recorder.service';
import { AiProviderError } from '../ai-shared/ai-provider.error';
export const EMBEDDING_MODEL = 'gemini-embedding-001';
export const EMBEDDING_VERSION = '768-normalized-v1';
export function normalizeEmbedding(values: unknown): number[] {
  if (
    !Array.isArray(values) ||
    values.length !== 768 ||
    values.some((v) => typeof v !== 'number' || !Number.isFinite(v))
  )
    throw new Error('EMBEDDING_INVALID');
  const norm = Math.hypot(...values);
  if (!norm || !Number.isFinite(norm)) throw new Error('EMBEDDING_INVALID');
  return values.map((v) => v / norm);
}
@Injectable()
export class EmbeddingService {
  constructor(
    private readonly client: GeminiClient,
    @Optional() private readonly recorder?: AiRequestRecorder,
  ) {}
  async embed(
    text: string,
    query: boolean,
    signal: AbortSignal,
    userId?: string,
  ) {
    return (await this.embedMany([text], signal, userId, query))[0];
  }
  async count(text: string, signal: AbortSignal) {
    const result = await this.client.request(
      EMBEDDING_MODEL,
      'countTokens',
      { contents: [{ role: 'user', parts: [{ text }] }] },
      signal,
    );
    if (!Number.isInteger(result.totalTokens) || result.totalTokens! < 1)
      throw new Error('INVALID_TOKEN_COUNT');
    return result.totalTokens!;
  }
  async embedMany(
    texts: string[],
    signal: AbortSignal,
    userId?: string,
    query = false,
  ): Promise<number[][]> {
    const vectors: number[][] = [];
    if (texts.some((t) => !t.trim() || t.length > 24000))
      throw new Error('EMBEDDING_INPUT_INVALID');
    for (let start = 0; start < texts.length; start += 20) {
      const batch = texts.slice(start, start + 20);
      const requests = batch.map((text) => ({
        model: `models/${EMBEDDING_MODEL}`,
        content: { parts: [{ text }] },
        taskType: query ? 'RETRIEVAL_QUERY' : 'RETRIEVAL_DOCUMENT',
        outputDimensionality: 768,
      }));
      // Recorder stores only a fingerprint, never learner text. NULL owner is allowed for system jobs.
      const id = await this.recorder?.start(
        {
          model: EMBEDDING_MODEL,
          context: {
            userId: userId ?? null,
            purpose: 'RAG_EMBEDDING',
            promptVersion: EMBEDDING_VERSION,
          },
        },
        requests,
      );
      try {
        const result = await this.client.request(
          EMBEDDING_MODEL,
          'batchEmbedContents',
          { requests },
          signal,
        );
        if (result.embeddings?.length !== batch.length)
          throw new Error('INCOMPLETE_EMBEDDINGS');
        vectors.push(
          ...result.embeddings.map((e) => normalizeEmbedding(e.values)),
        );
        if (id) await this.recorder!.complete(id, result.usageMetadata ?? {});
      } catch (error) {
        if (id)
          await this.recorder!.fail(
            id,
            error instanceof AiProviderError
              ? error.reason
              : 'EMBEDDING_INVALID',
          );
        throw error;
      }
    }
    return vectors;
  }
}
