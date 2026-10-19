import { ConfigService } from '@nestjs/config';
import { GeminiClient } from './gemini-client.service';
import { GeminiRateLimiter } from './gemini-rate-limiter.service';

const freeConfig = {
  GEMINI_API_KEY: 'test-only-secret',
  GEMINI_BILLING_TIER: 'FREE',
  GEMINI_FREE_PROJECT_CONFIRMED: true,
  GEMINI_MAX_RPM: 2,
};
const signal = () => new AbortController().signal;

function fixture(overrides = {}) {
  const config = new ConfigService({ ...freeConfig, ...overrides });
  const limiter = new GeminiRateLimiter(config);
  return { limiter, client: new GeminiClient(config, limiter) };
}

describe('Shared Gemini transport and quota', () => {
  beforeEach(() =>
    jest.useFakeTimers({ now: new Date('2026-10-19T00:00:00Z') }),
  );
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  test('reserves a rolling window synchronously across concurrent callers', async () => {
    const { client } = fixture();
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockImplementation(async () => new Response('{}'));
    const results = await Promise.allSettled(
      Array.from({ length: 3 }, () =>
        client.request('model-a', 'generateContent', {}, signal()),
      ),
    );
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(2);
    expect(results[2]).toMatchObject({
      status: 'rejected',
      reason: { reason: 'QUOTA', retryAfterMs: 60_000 },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(60_000);
    fetchMock.mockResolvedValue(new Response('{}'));
    await expect(
      client.request('model-a', 'generateContent', {}, signal()),
    ).resolves.toEqual({});
  });

  test('shares a model window across clients but keeps other model windows independent', () => {
    const { limiter } = fixture();
    limiter.acquire('chat-model');
    limiter.acquire('chat-model');
    expect(() => limiter.acquire('chat-model')).toThrow();
    expect(() => limiter.acquire('embedding-model')).not.toThrow();
    jest.advanceTimersByTime(59_999);
    expect(() => limiter.acquire('chat-model')).toThrow();
    jest.advanceTimersByTime(1);
    expect(() => limiter.acquire('chat-model')).not.toThrow();
  });

  test.each([
    ['120', 120_000],
    ['Mon, 19 Oct 2026 00:02:00 GMT', 120_000],
    ['invalid', 60_000],
  ])(
    'honors Retry-After %s and stops subsequent calls without retrying',
    async (header, delay) => {
      const { client } = fixture();
      const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
        new Response('private provider data', {
          status: 429,
          headers: { 'Retry-After': header },
        }),
      );
      await expect(
        client.request('model', 'generateContent', {}, signal()),
      ).rejects.toMatchObject({ reason: 'QUOTA', retryAfterMs: delay });
      await expect(
        client.request('model', 'generateContent', {}, signal()),
      ).rejects.toMatchObject({ reason: 'QUOTA' });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      jest.advanceTimersByTime(delay);
      fetchMock.mockResolvedValue(new Response('{}'));
      await expect(
        client.request('model', 'generateContent', {}, signal()),
      ).resolves.toEqual({});
    },
  );

  test('aborted requests do not consume quota or reach the provider', async () => {
    const { client } = fixture({ GEMINI_MAX_RPM: 1 });
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response('{}'));
    const controller = new AbortController();
    controller.abort();
    await expect(
      client.request('model', 'generateContent', {}, controller.signal),
    ).rejects.toMatchObject({ reason: 'TIMEOUT' });
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(
      client.request('model', 'generateContent', {}, signal()),
    ).resolves.toEqual({});
  });

  test.each([
    { GEMINI_BILLING_TIER: 'PAID' },
    { GEMINI_PAID_PROJECT_CONFIRMED: true },
    { GEMINI_FREE_PROJECT_CONFIRMED: false },
    { GEMINI_API_KEY: '' },
  ])(
    'rejects unconfirmed/free-incompatible configuration before network calls',
    async (overrides) => {
      const { client } = fixture(overrides);
      const fetchMock = jest.spyOn(global, 'fetch');
      await expect(
        client.request('model', 'generateContent', {}, signal()),
      ).rejects.toMatchObject({ reason: 'CONFIG_INVALID' });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  test('does not expose secrets or upstream error bodies', async () => {
    const { client } = fixture();
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockRejectedValue(new Error('test-only-secret: raw prompt'));
    await expect(
      client.request('model', 'generateContent', {}, signal()),
    ).rejects.toMatchObject({ message: 'AI_UNAVAILABLE' });
    fetchMock.mockResolvedValue(
      new Response('raw prompt and secret', { status: 500 }),
    );
    await expect(
      client.request('model', 'generateContent', {}, signal()),
    ).rejects.toMatchObject({ message: 'AI_PROVIDER_500' });
  });
});
