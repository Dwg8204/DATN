import { SpeakingAiProvider } from './speaking-ai-provider.service';
import { SpeakingAiConfig } from './speaking-ai-config.service';
import { SpeakingAudioService } from './speaking-audio.service';
import { SpeakingGradingRepository, SpeakingJob } from '../repositories/speaking-grading.repository';
import { AssessmentPaper } from '../types/attempt.type';

const paper: AssessmentPaper = { component: 'SPEAKING', title: 'Test', mode: 'part1',
  parts: { '1': { questions: [{ key: 'p1:q1', text: 'What do you like?' }] } },
  items: [{ key: 'p1:q1', partNumber: 1, kind: 'AUDIO', points: 0, sampleAnswer: 'I like books.' }] };
const result = { responses: [{ key: 'p1:q1', status: 'ASSESSED', criteria: {
  grammarVocabulary: 50, pronunciation: 50, fluency: 50, taskFulfillment: 50,
}, feedback: 'Hãy bổ sung lý do: I like reading because it is relaxing.', qualityFlags: [] }], estimatedCefr: 'B1', cefrReason: 'Cần thêm bằng chứng.' };
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
    job.responses.__assessmentPromptVersion = 'speaking-rubric-v2';
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
});
