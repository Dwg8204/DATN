import { AiProvider } from '../../../common/ai/ai-provider.interface';
import { WritingAssessmentService } from './writing-assessment.service';
import { WritingAssessmentValidator } from './writing-assessment-validator.service';
import { WritingInputBuilder } from './writing-input-builder.service';
import { writingFixture } from '../testing/writing.fixture';
import { WritingJobConfig } from '../writing-ai-config.service';

export const testWritingConfig: WritingJobConfig = {
  provider: 'gemini',
  model: 'gemini-3.1-flash-lite',
  timeoutMs: 1000,
  maxOutputTokens: 8192,
  maxAttempts: 3,
  feedbackLocale: 'vi',
  schemaVersion: 1,
  promptVersion: 'writing-prompt-v2',
  rubricVersion: 'writing-rubric-v2',
  inputVersion: 2,
};
describe('Writing assessment single-call flow', () => {
  it('uses the Vietnamese v3 instruction and preserves English correction evidence', async () => {
    const { input, result } = writingFixture();
    const provider = { generateStructured: jest.fn(async (_request: Parameters<AiProvider['generateStructured']>[0]) => result) };
    const service = new WritingAssessmentService(provider, new WritingAssessmentValidator());
    await service.assess(input, { ...testWritingConfig, promptVersion: 'writing-prompt-v3' });
    const request = provider.generateStructured.mock.calls[0][0] as unknown as Parameters<AiProvider['generateStructured']>[0];
    expect(request.systemInstruction).toContain('Write ALL explanatory prose in natural Vietnamese');
    expect(request.systemInstruction).toContain('correction.replacement');
    expect(request.input).toMatchObject({ feedbackLocale: 'vi' });
  });
  it('returns summary and all details in one provider request', async () => {
    const { input, result } = writingFixture();
    const provider = { generateStructured: jest.fn(async () => result) };
    const service = new WritingAssessmentService(provider, new WritingAssessmentValidator());
    const assessed = await service.assess(input, testWritingConfig);
    expect(provider.generateStructured).toHaveBeenCalledTimes(1);
    expect(assessed.details.parts.flatMap((part) => part.questions)).toHaveLength(11);
    expect(assessed.summary.partSummaries).toHaveLength(4);
  });
  it('handles a completely blank paper without spending API quota', async () => {
    const { snapshot } = writingFixture();
    const input = new WritingInputBuilder().build(snapshot, {}, 'FULL_SKILL', 'vi');
    const provider = { generateStructured: jest.fn() } as AiProvider;
    const service = new WritingAssessmentService(provider, new WritingAssessmentValidator());
    const result = await service.assess(input, testWritingConfig);
    expect(provider.generateStructured).not.toHaveBeenCalled();
    expect(result.cefr).toMatchObject({ level: null, reason: 'NO_RESPONSE' });
    expect(new WritingAssessmentValidator().validate(result, input)).toEqual(result);
  });
});
