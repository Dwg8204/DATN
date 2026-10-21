import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AiProviderError } from './ai-provider.error';
import { createGeminiServices } from './create-gemini-services';
import { GeminiGenerationInput } from './gemini.types';

const input: GeminiGenerationInput = {
  model: 'test-model',
  system: 'private system prompt',
  contents: [{ role: 'user', parts: [{ text: 'private snapshot' }] }],
  responseSchema: {
    type: 'OBJECT',
    properties: { summary: { type: 'STRING' } },
    required: ['summary'],
  },
  context: {
    userId: 'test-user',
    purpose: 'PERSONAL_COMMENT',
    promptVersion: 'test-v1',
  },
};

function fixture() {
  const query = jest.fn().mockResolvedValue([]);
  const config = new ConfigService({
    GEMINI_API_KEY: 'test-only',
    GEMINI_BILLING_TIER: 'FREE',
    GEMINI_FREE_PROJECT_CONFIRMED: true,
  });
  return {
    ...createGeminiServices(config, { query } as unknown as DataSource),
    query,
  };
}

describe('Shared generation and request recording', () => {
  afterEach(() => jest.restoreAllMocks());

  test('supports feature-specific schema/purpose without a chat message and returns the recorded request ID', async () => {
    const { client, generation, query } = fixture();
    const content = {
      role: 'model' as const,
      parts: [{ text: '{"summary":"Hello"}', thoughtSignature: 'opaque' }],
    };
    const request = jest.spyOn(client, 'request').mockResolvedValue({
      candidates: [{ finishReason: 'STOP', content }],
      usageMetadata: {
        promptTokenCount: 123,
        candidatesTokenCount: 45,
        cachedContentTokenCount: 67,
        thoughtsTokenCount: 8,
      },
    });
    const result = await generation.generate(
      input,
      new AbortController().signal,
    );
    expect(result.content).toBe(content);
    expect(request).toHaveBeenCalledWith(
      'test-model',
      'generateContent',
      expect.objectContaining({
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: input.responseSchema,
          temperature: 0.2,
          maxOutputTokens: 4096,
        },
      }),
      expect.any(AbortSignal),
    );
    expect(request.mock.calls[0][2]).not.toHaveProperty('tools');
    const [insert, params] = query.mock.calls[0];
    expect(insert).toContain("'RUNNING'");
    expect(params).toEqual([
      result.requestId,
      'test-user',
      'PERSONAL_COMMENT',
      'test-model',
      null,
      expect.stringMatching(/^[a-f0-9]{64}$/),
      JSON.stringify({ promptVersion: 'test-v1', model: 'test-model' }),
      'gemini',
      JSON.stringify({ tier: 'FREE' }),
    ]);
    expect(JSON.stringify(query.mock.calls)).not.toMatch(
      /private system prompt|private snapshot|test-only/,
    );
    expect(query.mock.calls[1][1]).toEqual([
      result.requestId,
      123,
      45,
      67,
      8,
      0,
    ]);
  });

  test('records quota failure once and exposes backoff to the caller without retrying', async () => {
    const { client, generation, query } = fixture();
    const request = jest
      .spyOn(client, 'request')
      .mockRejectedValue(new AiProviderError('QUOTA', 120_000));
    await expect(
      generation.generate(input, new AbortController().signal),
    ).rejects.toMatchObject({ reason: 'QUOTA', retryAfterMs: 120_000 });
    expect(request).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[1][1]).toEqual([expect.any(String), 'AI_QUOTA']);
  });

  test('does not call Gemini when initial request recording fails', async () => {
    const { client, generation, query } = fixture();
    query.mockRejectedValueOnce(new Error('database unavailable'));
    const request = jest.spyOn(client, 'request');
    await expect(
      generation.generate(input, new AbortController().signal),
    ).rejects.toThrow('database unavailable');
    expect(request).not.toHaveBeenCalled();
  });

  test('does not mark a late aborted response completed', async () => {
    const { client, generation, query } = fixture();
    const controller = new AbortController();
    jest.spyOn(client, 'request').mockImplementation(async () => {
      controller.abort();
      return {
        candidates: [
          {
            finishReason: 'STOP',
            content: { role: 'model', parts: [{ text: '{}' }] },
          },
        ],
      };
    });
    await expect(
      generation.generate(input, controller.signal),
    ).rejects.toMatchObject({ reason: 'TIMEOUT' });
    expect(query.mock.calls[1][1]).toEqual([expect.any(String), 'AI_TIMEOUT']);
  });
});
