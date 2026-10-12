import { ConfigService } from '@nestjs/config';
import { GeminiProvider } from './gemini.provider';

describe('Writing Gemini HTTP transport', () => {
  const original = global.fetch;
  afterEach(() => {
    global.fetch = original;
  });
  const request = {
    model: 'gemini-3.1-flash-lite',
    systemInstruction: 'assess writing',
    input: { text: 'Example.' },
    outputSchema: {
      type: 'object' as const,
      properties: { corrected: { type: 'string' as const } },
      required: ['corrected'],
    },
    maxOutputTokens: 512,
    signal: AbortSignal.timeout(1000),
  };
  const provider = () => new GeminiProvider(new ConfigService({ GEMINI_API_KEY: 'test-key-never-real' }));
  it('uses the same Gemini model API with text only and key in the header', async () => {
    global.fetch = jest.fn(async (url, options) => {
      expect(url).toBe(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent',
      );
      expect(JSON.stringify(options?.body)).not.toContain('inlineData');
      expect(JSON.stringify(options?.body)).not.toContain('test-key-never-real');
      expect(options?.headers).toMatchObject({ 'x-goog-api-key': 'test-key-never-real' });
      return new Response(
        JSON.stringify({
          candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"corrected":"Example."}' }] } }],
        }),
      );
    });
    await expect(provider().generateStructured(request)).resolves.toEqual({ corrected: 'Example.' });
  });
  it('normalizes quota errors with Retry-After and no response body leakage', async () => {
    global.fetch = jest.fn(
      async () => new Response('private-provider-data', { status: 429, headers: { 'Retry-After': '60' } }),
    );
    await expect(provider().generateStructured(request)).rejects.toMatchObject({
      code: 'GEMINI_HTTP_429',
      retryable: true,
      retryAfterMs: 60000,
    });
  });
  it.each(['MAX_TOKENS', 'SAFETY'])('rejects non-success finish reason %s', async (reason) => {
    global.fetch = jest.fn(
      async () => new Response(JSON.stringify({ candidates: [{ finishReason: reason }] })),
    );
    await expect(provider().generateStructured(request)).rejects.toThrow();
  });
});
