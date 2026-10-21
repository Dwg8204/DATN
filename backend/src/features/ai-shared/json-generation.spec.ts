import { ConfigService } from '@nestjs/config';
import { AiRequestRecorder } from './ai-request-recorder.service';
import { GeminiGenerationService } from './gemini-generation.service';
import {
  GeminiJsonProvider,
  JsonGenerationInput,
  JsonGenerationService,
  OpenAiCompatibleJsonProvider,
} from './json-generation.service';

describe('provider-independent JSON generation', () => {
  const input: JsonGenerationInput = {
    provider: 'deepseek',
    model: 'chosen-model',
    system: 'Return JSON.',
    prompt: '{"count":2}',
    schema: {},
    temperature: 0.2,
    maxOutputTokens: 2048,
    context: {
      userId: 'learner',
      purpose: 'PERSONAL_COMMENT',
      promptVersion: 'v1',
      errorCodePrefix: 'PERSONALIZATION',
    },
  };
  const recorder = {
    start: jest.fn().mockResolvedValue('request'),
    complete: jest.fn(),
    fail: jest.fn(),
  };
  let fetchMock: jest.SpyInstance;
  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = jest.spyOn(global, 'fetch');
  });
  afterEach(() => fetchMock.mockRestore());
  const provider = (values: Record<string, unknown> = {}) =>
    new OpenAiCompatibleJsonProvider(
      new ConfigService({
        DEEPSEEK_API_KEY: 'deepseek-secret',
        XAI_API_KEY: 'xai-secret',
        ...values,
      }),
      recorder as unknown as AiRequestRecorder,
    );
  const success = () =>
    new Response(
      JSON.stringify({
        choices: [
          {
            finish_reason: 'stop',
            message: {
              content: '{"summary":"ok"}',
              reasoning_content: 'private reasoning',
            },
          },
        ],
        usage: {
          prompt_tokens: 12,
          completion_tokens: 8,
          prompt_tokens_details: { cached_tokens: 2 },
          completion_tokens_details: { reasoning_tokens: 3 },
        },
      }),
    );
  it.each([
    [
      'deepseek',
      'https://api.deepseek.com/v1/chat/completions',
      'deepseek-secret',
    ],
    ['xai', 'https://api.x.ai/v1/chat/completions', 'xai-secret'],
  ])(
    'routes %s and normalizes usage without claiming free pricing',
    async (name, url, key) => {
      fetchMock.mockResolvedValue(success());
      const result = await provider().generate(
        { ...input, provider: name },
        AbortSignal.timeout(1000),
      );
      expect(result).toEqual({
        requestId: 'request',
        text: '{"summary":"ok"}',
      });
      const [endpoint, options] = fetchMock.mock.calls[0];
      expect(String(endpoint)).toBe(url);
      expect(options.headers.Authorization).toBe(`Bearer ${key}`);
      expect(options.redirect).toBe('error');
      expect(JSON.parse(options.body)).toMatchObject({
        model: 'chosen-model',
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });
      expect(recorder.start).toHaveBeenCalledWith(
        expect.objectContaining({ provider: name }),
        expect.anything(),
        name,
      );
      expect(recorder.complete).toHaveBeenCalledWith(
        'request',
        {
          promptTokenCount: 12,
          candidatesTokenCount: 8,
          cachedContentTokenCount: 2,
          thoughtsTokenCount: 3,
        },
        null,
      );
    },
  );
  it('supports a configured compatible endpoint and API key', async () => {
    fetchMock.mockResolvedValue(success());
    await provider({
      PERSONALIZATION_BASE_URL: 'https://gateway.example/v1/',
      PERSONALIZATION_API_KEY: 'gateway-secret',
    }).generate(
      { ...input, provider: 'openai-compatible' },
      AbortSignal.timeout(1000),
    );
    expect(String(fetchMock.mock.calls[0][0])).toBe(
      'https://gateway.example/v1/chat/completions',
    );
  });
  it('maps 429 and Retry-After for the existing worker without logging response bodies', async () => {
    fetchMock.mockResolvedValue(
      new Response('secret provider diagnostic', {
        status: 429,
        headers: { 'Retry-After': '120' },
      }),
    );
    await expect(
      provider().generate(input, AbortSignal.timeout(1000)),
    ).rejects.toMatchObject({ reason: 'QUOTA', retryAfterMs: 120000 });
    expect(recorder.fail).toHaveBeenCalledWith(
      'request',
      'PERSONALIZATION_QUOTA',
    );
  });
  it.each(['length', 'content_filter'])(
    'rejects incomplete or blocked output: %s',
    async (finish_reason) => {
      fetchMock.mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [{ finish_reason, message: { content: '{}' } }],
          }),
        ),
      );
      await expect(
        provider().generate(input, AbortSignal.timeout(1000)),
      ).rejects.toHaveProperty(
        'reason',
        finish_reason === 'length' ? 'INCOMPLETE' : 'SAFETY',
      );
    },
  );
  it('rejects unsafe endpoint configurations before sending credentials', async () => {
    await expect(
      provider({ PERSONALIZATION_BASE_URL: 'http://example.com/v1' }).generate(
        input,
        AbortSignal.timeout(1000),
      ),
    ).rejects.toHaveProperty('reason', 'CONFIG_INVALID');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('retains Gemini structured schema and filters thought parts', async () => {
    const generate = jest
      .fn()
      .mockResolvedValue({
        requestId: 'gemini-request',
        content: { parts: [{ thought: true, text: 'hidden' }, { text: '{}' }] },
      });
    const gemini = new GeminiJsonProvider({
      generate,
    } as unknown as GeminiGenerationService);
    const service = new JsonGenerationService(gemini, provider());
    expect(
      await service.generate(
        { ...input, provider: 'gemini' },
        AbortSignal.timeout(1000),
      ),
    ).toEqual({ requestId: 'gemini-request', text: '{}' });
    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({ responseSchema: input.schema }),
      expect.anything(),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('never falls back silently to a different vendor', () => {
    const service = new JsonGenerationService(
      {} as GeminiJsonProvider,
      provider(),
    );
    expect(() =>
      service.generate(
        { ...input, provider: 'unknown' },
        AbortSignal.timeout(1000),
      ),
    ).toThrow('AI_CONFIG_INVALID');
  });
});
