import { EmbeddingService } from '../retrieval/embedding.service';
import { RedisCacheService } from '../../common/cache/redis-cache.service';
import { ConfigService } from '@nestjs/config';
import { ChatbotProvider } from './chatbot.provider';
import { createGeminiServices } from '../ai-shared/create-gemini-services';

function fixture() {
  const query = jest.fn().mockResolvedValue([]);
  const config = new ConfigService({
    CHATBOT_ENABLED: true,
    CHATBOT_MODEL: 'gemini-3.5-flash-lite',
    GEMINI_API_KEY: 'test-only',
    GEMINI_BILLING_TIER: 'FREE',
    GEMINI_FREE_PROJECT_CONFIRMED: true,
  });
  const { client, generation } = createGeminiServices(config, { query } as any);
  const provider = new ChatbotProvider(config, client, generation);
  return { provider, query, client, config, generation };
}
const context = { userId: 'test-user', messageId: 'test-message' };

describe('Chat provider contract', () => {
  afterEach(() => jest.restoreAllMocks());
  test('requires JSON fields with tools and preserves the complete model content', async () => {
    const { provider, query, client } = fixture();
    const content = {
      role: 'model',
      parts: [
        {
          functionCall: {
            name: 'searchKnowledge',
            args: { query: 'Aptis' },
            id: 'call',
          },
          thoughtSignature: 'opaque',
        },
      ],
    };
    const request = jest.spyOn(client, 'request').mockResolvedValue({
      candidates: [
        { finishReason: 'STOP', content: { ...content, role: 'model' } },
      ],
      usageMetadata: {
        promptTokenCount: 100,
        candidatesTokenCount: 20,
        cachedContentTokenCount: 50,
      },
    });
    const answer = await provider.generate(
      'system',
      [],
      [{ name: 'searchKnowledge' }],
      context,
      new AbortController().signal,
    );
    expect(answer.parts).toBe(content.parts);
    const sent = request.mock.calls[0][2] as any;
    expect(sent.generationConfig.responseMimeType).toBe('application/json');
    expect(sent.generationConfig.responseSchema.required).toEqual([
      'text',
      'citationIds',
      'actions',
    ]);
    expect(sent.tools[0].functionDeclarations).toHaveLength(1);
    expect(query.mock.calls.at(-1)?.[1].slice(1)).toEqual([100, 20, 50, null, 0]);
  });
  test.each([
    [{ promptFeedback: { blockReason: 'SAFETY' } }, 'CHAT_SAFETY'],
    [
      {
        candidates: [
          {
            finishReason: 'MAX_TOKENS',
            content: { role: 'model' as const, parts: [{ text: '{"text":' }] },
          },
        ],
      },
      'CHAT_INCOMPLETE',
    ],
    [{ candidates: [] }, 'CHAT_INCOMPLETE'],
  ])(
    'blocked/truncated responses fail without automatic retry',
    async (body, code) => {
      const { provider, query, client } = fixture();
      const request = jest.spyOn(client, 'request').mockResolvedValue(body);
      await expect(
        provider.generate(
          'system',
          [],
          [],
          context,
          new AbortController().signal,
        ),
      ).rejects.toMatchObject({ code });
      expect(request).toHaveBeenCalledTimes(1);
      expect(query.mock.calls.at(-1)?.[1][1]).toBe(code);
    },
  );
  test('HTTP quota error is safe and does not expose provider response or key', async () => {
    const { provider } = fixture();
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: false, status: 429 } as Response);
    await expect(
      provider.request(
        provider.model,
        'generateContent',
        {},
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ code: 'CHAT_QUOTA' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  test('aborted call is recorded as timeout', async () => {
    const { provider, query, client } = fixture();
    const controller = new AbortController();
    controller.abort();
    jest.spyOn(client, 'request').mockRejectedValue(new Error('aborted'));
    await expect(
      provider.generate('system', [], [], context, controller.signal),
    ).rejects.toMatchObject({ code: 'CHAT_TIMEOUT' });
    expect(query.mock.calls.at(-1)?.[1][1]).toBe('CHAT_TIMEOUT');
  });
});


describe('Chat embedding with shared RAG service and Redis', () => {
  test('cache hits skip embedding; cache misses use the shared service and preserve query mode', async () => {
    const { config, client, generation } = fixture();
    const vector = [1, ...Array(767).fill(0)];
    const embed = jest.fn().mockResolvedValue(vector);
    const getOrLoad = jest.fn(async (_namespace: string, _key: string, _ttl: number, load: () => Promise<number[]>, _refresh: boolean, validate: (value: unknown) => boolean) => {
      expect(validate(vector)).toBe(true);
      expect(validate(Array(768).fill(0))).toBe(false);
      return load();
    });
    const provider = new ChatbotProvider(config, client, generation,
      { embed } as unknown as EmbeddingService, { getOrLoad } as unknown as RedisCacheService);
    const signal = new AbortController().signal;
    await expect(provider.embed('question', true, signal)).resolves.toEqual(vector);
    expect(embed).toHaveBeenCalledWith('question', true, signal);
    expect(getOrLoad.mock.calls[0][1]).toBe(JSON.stringify([true, 'question']));
    getOrLoad.mockImplementationOnce(async () => vector);
    await expect(provider.embed('question', true, signal)).resolves.toEqual(vector);
    expect(embed).toHaveBeenCalledTimes(1);
    await provider.embed('question', false, signal);
    expect(getOrLoad.mock.calls[2][1]).toBe(JSON.stringify([false, 'question']));
    const aborted = new AbortController(); aborted.abort();
    await expect(provider.embed('question', true, aborted.signal)).rejects.toThrow();
    expect(getOrLoad).toHaveBeenCalledTimes(3);
  });
  test('without Redis, embedding still uses the RAG service and maps failures safely', async () => {
    const { config, client, generation } = fixture();
    const embed = jest.fn().mockRejectedValue(new Error('private provider details'));
    const provider = new ChatbotProvider(config, client, generation, { embed } as unknown as EmbeddingService);
    await expect(provider.embed('question', true, new AbortController().signal))
      .rejects.toMatchObject({ code: 'CHAT_UNAVAILABLE' });
    expect(embed).toHaveBeenCalledTimes(1);
  });
});
