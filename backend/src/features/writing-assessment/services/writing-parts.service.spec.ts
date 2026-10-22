import { AiError } from '../../../common/ai/ai-error';
import { WritingAiConfig } from '../writing-ai-config.service';
import { ConfigService } from '@nestjs/config';
import { WritingAssessmentService, WritingStageResults } from './writing-assessment.service';
import { WritingAssessmentValidator } from './writing-assessment-validator.service';
import { writingFixture } from '../testing/writing.fixture';
import { WRITING_SYSTEM_PROMPT_V3 } from '../prompts/writing-system-v1';
import { WRITING_SUMMARY_PROMPT_V1 } from '../prompts/writing-summary-v1';

function setup(partNumber?: number) {
  const fixture = writingFixture(partNumber);
  const config = { ...new WritingAiConfig(new ConfigService()).snapshot('vi'), promptVersion: 'writing-prompt-v3' };
  const provider = { generateStructured: jest.fn(async (request: any): Promise<unknown> => {
    if (!request.outputSchema.properties.details) return { cefr: fixture.result.cefr, summary: fixture.result.summary };
    return writingFixture(request.input.parts[0].partNumber).result;
  }) };
  const service = new WritingAssessmentService(provider, new WritingAssessmentValidator());
  let cache: WritingStageResults | undefined;
  const save = jest.fn(async (value: WritingStageResults) => { cache = structuredClone(value); });
  const before = jest.fn(async (_stage: string) => undefined);
  const run = (hash = 'hash') => service.assessByParts(fixture.input, config, hash, cache, save, before);
  return { fixture, provider, service, save, before, run, get cache() { return cache; } };
}

describe('Production Gemini per-Part assessment', () => {
  it('makes four Part calls using the unchanged prompt then one validated synthesis', async () => {
    const h = setup();
    expect((await h.run()).cefr.level).toBe('B1');
    expect(h.provider.generateStructured).toHaveBeenCalledTimes(5);
    for (const [request] of h.provider.generateStructured.mock.calls.slice(0, 4)) {
      expect(request.systemInstruction).toBe(WRITING_SYSTEM_PROMPT_V3);
      expect(request.input.scope).toBe('PART');
      expect(request.model).toBe('gemini-3.5-flash-lite');
    }
    expect(h.provider.generateStructured.mock.calls[4][0].systemInstruction).toBe(WRITING_SUMMARY_PROMPT_V1);
    expect(h.before.mock.calls).toEqual([['part_1'], ['part_2'], ['part_3'], ['part_4'], ['summary']]);
    expect(h.cache?.final?.cefr.level).toBe('B1');
    await h.run();
    expect(h.provider.generateStructured).toHaveBeenCalledTimes(5);
  });
  it('resumes at the failed Part after 503, without calling successful Parts again', async () => {
    const h = setup();
    h.provider.generateStructured.mockResolvedValueOnce(writingFixture(1).result)
      .mockRejectedValueOnce(new AiError('GEMINI_HTTP_503', true));
    await expect(h.run()).rejects.toThrow('GEMINI_HTTP_503');
    expect(Object.keys(h.cache!.parts)).toEqual(['1']);
    await h.run();
    expect(h.provider.generateStructured).toHaveBeenCalledTimes(6);
    expect(h.before.mock.calls.filter(([stage]) => stage === 'part_1')).toHaveLength(1);
  });
  it('retries synthesis only when all Parts were already validated', async () => {
    const h = setup();
    for (const part of [1, 2, 3, 4]) h.provider.generateStructured.mockResolvedValueOnce(writingFixture(part).result);
    h.provider.generateStructured.mockRejectedValueOnce(new AiError('GEMINI_HTTP_503', true));
    await expect(h.run()).rejects.toThrow('GEMINI_HTTP_503');
    expect(Object.keys(h.cache!.parts)).toHaveLength(4);
    await h.run();
    expect(h.provider.generateStructured).toHaveBeenCalledTimes(6);
  });
  it('invalidates checkpoints when the immutable job/input hash changes', async () => {
    const h = setup(2);
    await h.run(); await h.run('new-hash');
    expect(h.provider.generateStructured).toHaveBeenCalledTimes(2);
  });
  it('makes no calls for blank work and no synthesis for a Practice Part', async () => {
    const h = setup(2);
    expect((await h.run()).cefr.status).toBe('NOT_APPLICABLE');
    expect(h.provider.generateStructured).toHaveBeenCalledTimes(1);
    const blank = setup();
    blank.fixture.input.parts.forEach(part => part.questions.forEach(q => { q.response = ''; q.wordCount = 0; }));
    expect((await blank.run()).cefr.level).toBeNull();
    expect(blank.provider.generateStructured).not.toHaveBeenCalled();
  });
  it('does not checkpoint invalid evidence or proceed to synthesis', async () => {
    const h = setup();
    const invalid = writingFixture(1).result;
    invalid.details.parts[0].questions[0].criteria[0].evidenceQuotes = ['fabricated'];
    h.provider.generateStructured.mockResolvedValueOnce(invalid);
    await expect(h.run()).rejects.toThrow('AI_WRITING_EVIDENCE_INVALID');
    expect(h.save).not.toHaveBeenCalled();
    expect(h.provider.generateStructured).toHaveBeenCalledTimes(1);
  });
  it('cannot call the provider after losing the lease', async () => {
    const h = setup();
    h.before.mockRejectedValueOnce(new AiError('WRITING_LEASE_LOST'));
    await expect(h.run()).rejects.toThrow('WRITING_LEASE_LOST');
    expect(h.provider.generateStructured).not.toHaveBeenCalled();
  });
});
