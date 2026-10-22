import { SpeakingAiProvider } from './speaking-ai-provider.service';
import { SpeakingAiConfig } from './speaking-ai-config.service';
import { SpeakingAudioService } from './speaking-audio.service';
import { SpeakingGradingRepository, SpeakingJob } from '../repositories/speaking-grading.repository';
import { AssessmentPaper } from '../types/attempt.type';
import { CRITERIA_KEYS, SPEAKING_PROMPT_VERSION } from '../assessments/speaking-ai-policy';

const paper: AssessmentPaper = { component: 'SPEAKING', title: 'Test', mode: 'part1',
  parts: { '1': { questions: [{ key: 'p1:q1', text: 'What do you like?' }] } },
  items: [{ key: 'p1:q1', partNumber: 1, kind: 'AUDIO', points: 0, sampleAnswer: 'I like books.' }] };
const result = { responses: [{ key: 'p1:q1', status: 'ASSESSED', criteria: {
  grammarVocabulary: 50, pronunciation: 50, fluency: 50, taskFulfillment: 50,
}, feedback: 'Hãy bổ sung lý do: I like reading because it is relaxing.', qualityFlags: [], details: {
  criterionFeedback: Object.fromEntries(CRITERIA_KEYS.map(key => [key, { comment: 'Diễn đạt ý chính rõ ràng.', strengths: [], weaknesses: [], suggestions: ['Bổ sung lý do.'] }])),
  strengths: ['Diễn đạt rõ ý chính.'], weaknesses: [], suggestions: [], suggestedAnswer: null,
} }], estimatedCefr: 'B1', cefrReason: 'Cần thêm bằng chứng.', partFeedback: [{ partNumber: 1, overview: 'Bạn trả lời rõ ý.', strengths: [], weaknesses: [], suggestions: [] }] };
describe('Speaking provider integration contract (mock HTTP only)', () => {
  const original = global.fetch;
  afterEach(() => { global.fetch = original; });
  function fixture() {
    const config = { model: 'gemini-3.1-flash-lite', groqKey: 'groq-secret', geminiKey: 'gemini-secret', inputRate: .5, outputRate: 1.5, cap: 1 };
    const audio = { normalize: jest.fn(async () => Buffer.from('audio')) };
    const jobs = { renew: jest.fn(), cache: jest.fn(async (job: SpeakingJob, key: string, value: string) => { job.responses[key] = value; }),
      reserve: jest.fn(async () => 'ledger'), charge: jest.fn(), budget: jest.fn(async () => ({ used: 0, reserved: .03 })) };
    const provider = new SpeakingAiProvider(config as SpeakingAiConfig, audio as unknown as SpeakingAudioService,
      jobs as unknown as SpeakingGradingRepository);
    const job: SpeakingJob = { attempt_id: 'attempt', lease_token: 'lease', failures: 1, responses: {} };
    return { provider, jobs, audio, job };
  }
  it('sends real audio, caches English transcript, reserves BEFORE generation and validates response', async () => {
    const { provider, jobs, job } = fixture();
    const fetchMock = jest.fn(async (url: string | URL | Request) => {
      const address = String(url);
      if (address.includes('groq.com')) return new Response(JSON.stringify({ text: 'I like reading.' }));
      if (address.endsWith(':countTokens')) return new Response(JSON.stringify({ totalTokens: 2000 }));
      expect(jobs.reserve).toHaveBeenCalledTimes(1);
      return new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(result) }] } }],
        usageMetadata: { promptTokenCount: 2000, candidatesTokenCount: 400, thoughtsTokenCount: 0 } }));
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    await expect(provider.assess(job, paper, [{ key: 'p1:q1', mediaKey: 'cloud-url' }])).resolves.toEqual(result);
    expect(job.responses['p1:q1']).toBe('I like reading.');
    expect(job.responses.__assessment).toBe(JSON.stringify(result));
    expect(jobs.reserve.mock.calls[0]).toBeDefined();
    expect(jobs.charge).toHaveBeenCalledWith('ledger', .0016, expect.objectContaining({ promptTokenCount: 2000 }));
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
  it('does not generate when budget reservation fails', async () => {
    const { provider, jobs, job } = fixture();
    job.responses['p1:q1'] = 'I like reading.';
    jobs.reserve.mockRejectedValueOnce(new Error('SPEAKING_BUDGET_EXCEEDED'));
    const request = jest.fn(async () => new Response(JSON.stringify({ totalTokens: 2000 })));
    global.fetch = request as unknown as typeof fetch;
    await expect(provider.assess(job, paper, [{ key: 'p1:q1', mediaKey: 'url' }])).rejects.toThrow('SPEAKING_BUDGET_EXCEEDED');
    expect(request).toHaveBeenCalledTimes(2);
    expect(jobs.charge).not.toHaveBeenCalled();
  });
  it('cached assessment makes retries idempotent without provider requests', async () => {
    const { provider, job, audio } = fixture();
    job.responses.__assessment = JSON.stringify(result);
    job.responses.__assessmentPromptVersion = SPEAKING_PROMPT_VERSION;
    const request = jest.fn(); global.fetch = request;
    await expect(provider.assess(job, paper, [{ key: 'p1:q1', mediaKey: 'url' }])).resolves.toEqual(result);
    expect(request).not.toHaveBeenCalled();
    expect(audio.normalize).not.toHaveBeenCalled();
  });
  it('fails before audio processing or Groq calls when the model is unavailable', async () => {
    const { provider, job, audio, jobs } = fixture();
    const request = jest.fn(async () => new Response('{}', { status: 404 }));
    global.fetch = request as unknown as typeof fetch;
    await expect(provider.assess(job, paper, [{ key: 'p1:q1', mediaKey: 'url' }])).rejects.toThrow('GEMINI_HTTP_404');
    expect(request).toHaveBeenCalledTimes(1);
    expect(audio.normalize).not.toHaveBeenCalled();
    expect(jobs.reserve).not.toHaveBeenCalled();
  });
  it('preserves Retry-After on 503 without hidden provider retries', async () => {
    const { provider, job } = fixture();
    const request = jest.fn(async () => new Response('{}', { status: 503, headers: { 'Retry-After': '120' } }));
    global.fetch = request as unknown as typeof fetch;
    await expect(provider.assess(job, paper, [{ key: 'p1:q1', mediaKey: 'url' }])).rejects.toMatchObject({
      code: 'GEMINI_HTTP_503', retryable: true, retryAfterMs: 120000,
    });
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('repairs CEFR only for an incomplete full test without changing its response scores', async () => {
    const { provider, job, jobs } = fixture();
    const full = { ...paper, mode: 'full', items: [...paper.items, { ...paper.items[0], key: 'p1:q2' }] };
    const initial = { ...result, estimatedCefr: null, cefrReason: 'Một phần thi không thể xác định CEFR.' };
    let generations = 0;
    const request = jest.fn(async (url: any, options: any) => {
      if (String(url).includes('groq.com')) return new Response(JSON.stringify({ text: 'I like reading.' }));
      if (String(url).endsWith(':countTokens')) return new Response(JSON.stringify({ totalTokens: 2000 }));
      const body = JSON.parse(options.body);
      const isRepair = !body.generationConfig.responseSchema.properties.responses;
      if (!isRepair) {
        const facts = JSON.parse(body.contents[0].parts[0].text);
        expect(facts).toMatchObject({ mode: 'full', assessmentScope: 'FULL_SKILL', responseKeys: ['p1:q1'], skippedKeys: ['p1:q2'] });
        expect(body.generationConfig.responseSchema.properties.responses.items.properties.key.enum).toEqual(['p1:q1']);
      } else {
        expect(JSON.parse(body.contents[0].parts[0].text).completion.practiceScoreOutOf50).toBe(12.5);
      }
      generations++;
      const value = isRepair ? { estimatedCefr: 'B1', cefrReason: 'Lời nói rõ ý ở mức B1; bỏ một câu nên bằng chứng còn hạn chế.' } : initial;
      return new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(value) }] } }] }));
    });
    global.fetch = request as unknown as typeof fetch;
    const assessed = await provider.assess(job, full, [{ key: 'p1:q1', mediaKey: 'url' }]);
    expect(assessed.estimatedCefr).toBe('B1');
    expect(assessed.responses).toEqual(initial.responses);
    expect(generations).toBe(2);
    expect(jobs.reserve).toHaveBeenCalledTimes(2);
  });
  it('keeps validated audio findings through a failed CEFR repair and resumes without replaying audio/ASR', async () => {
    const { provider, job, audio } = fixture();
    const full = { ...paper, mode: 'full' };
    job.responses['p1:q1'] = 'I like reading.';
    const initial = { ...result, estimatedCefr: null };
    job.responses.__assessment = JSON.stringify(initial);
    job.responses.__assessmentPromptVersion = SPEAKING_PROMPT_VERSION;
    let unavailable = true;
    global.fetch = jest.fn(async (url: any) => {
      if (String(url).endsWith(':countTokens')) return new Response(JSON.stringify({ totalTokens: 2000 }));
      if (unavailable) return new Response('{}', { status: 503 });
      return new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ estimatedCefr: 'A2', cefrReason: 'Ước lượng thận trọng dựa trên lời nói đã đánh giá.' }) }] } }] }));
    }) as unknown as typeof fetch;
    await expect(provider.assess(job, full, [{ key: 'p1:q1', mediaKey: 'url' }])).rejects.toThrow('GEMINI_HTTP_503');
    expect(JSON.parse(job.responses.__assessment).responses).toEqual(initial.responses);
    unavailable = false;
    await expect(provider.assess(job, full, [{ key: 'p1:q1', mediaKey: 'url' }])).resolves.toMatchObject({ estimatedCefr: 'A2' });
    expect(audio.normalize).not.toHaveBeenCalled();
  });
  it('does not accept another null CEFR from the repair request or discard cached response scores', async () => {
    const { provider, job } = fixture();
    job.responses.__assessment = JSON.stringify({ ...result, estimatedCefr: null });
    job.responses.__assessmentPromptVersion = SPEAKING_PROMPT_VERSION;
    global.fetch = jest.fn(async (url: any) => new Response(JSON.stringify(String(url).endsWith(':countTokens') ? { totalTokens: 2000 }
      : { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ estimatedCefr: null, cefrReason: 'Chỉ một phần thi.' }) }] } }] }))) as unknown as typeof fetch;
    await expect(provider.assess(job, { ...paper, mode: 'full' }, [{ key: 'p1:q1', mediaKey: 'url' }])).rejects.toMatchObject({ code: 'SPEAKING_CEFR_INCONSISTENT', retryable: true });
    expect(JSON.parse(job.responses.__assessment).responses).toEqual(result.responses);
  });
});
