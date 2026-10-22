import { AiError } from '../../common/ai/ai-error';
import { WritingAssessmentService } from '../writing-assessment/services/writing-assessment.service';
import { WritingAssessmentValidator } from '../writing-assessment/services/writing-assessment-validator.service';
import { writingFixture } from '../writing-assessment/testing/writing.fixture';
import { assessWritingByParts, WritingPartsCache } from './writing-parts.policy';

function fixture() {
  const { input, result } = writingFixture();
  const validator = new WritingAssessmentValidator();
  const provider = { generateStructured: jest.fn(async (request: any) => {
    if (request.input.scope === 'FULL_SKILL') return { cefr: structuredClone(result.cefr), summary: structuredClone(result.summary) };
    const part = request.input.parts[0];
    const blank = new WritingAssessmentService({} as any, validator).blank({ ...input, scope: 'PART', parts: [part] });
    return {
      schemaVersion: 1, cefr: blank.cefr, overallComment: 'Bạn diễn đạt được ý chính.', priorities: ['Luyện thêm thì.'],
      parts: [{ partNumber: part.partNumber, comment: 'Bạn nêu được ý chính.', suggestions: [],
        questions: part.questions.map((q: any) => ({ questionKey: q.questionKey, comment: 'Bạn nêu được ý chính.', suggestions: [],
          criteria: Object.fromEntries(result.details.parts[0].questions[0].criteria.map(c => [c.criterion,
            { judgment: 'ADEQUATE', comment: 'Cần sửa thì.', quote: 'Yesterday' }])) })) }],
    };
  }) };
  return { input, result, provider, validator };
}

describe('Groq per-Part resumable Writing', () => {
  it('uses four independent Parts and one synthesis, preserving all six criteria and full CEFR', async () => {
    const h = fixture(), saves: WritingPartsCache[] = [];
    const result = await assessWritingByParts(h.provider, h.input, 'model', 'hash', undefined, async cache => { saves.push(cache); });
    expect(h.provider.generateStructured).toHaveBeenCalledTimes(5);
    expect(result.details.parts).toHaveLength(4);
    expect(result.details.parts[0].questions[0].criteria).toHaveLength(6);
    expect(result.cefr.level).toBe('B1');
    expect(saves.at(-1)?.final).toBeDefined();
    h.provider.generateStructured.mockClear();
    const cached = await assessWritingByParts(h.provider, h.input, 'model', 'hash', saves.at(-1), async () => undefined);
    expect(cached.cefr.level).toBe('B1');
    expect(h.provider.generateStructured).not.toHaveBeenCalled();
  });
  it.each(['GROQ_RATE_WAIT', 'GROQ_DAILY_WAIT'])('checkpoints before %s and resumes without calling successful Parts again', async code => {
    const h = fixture(); let checkpoint: WritingPartsCache | undefined;
    const real = h.provider.generateStructured.getMockImplementation()!;
    h.provider.generateStructured.mockImplementation(async request => {
      if (request.input.parts[0]?.partNumber === 2) throw new AiError(code, true, 65000);
      return real(request);
    });
    await expect(assessWritingByParts(h.provider, h.input, 'model', 'hash', undefined, async cache => { checkpoint = cache; })).rejects.toThrow(code);
    expect(Object.keys(checkpoint!.parts)).toEqual(['1']);
    h.provider.generateStructured.mockReset().mockImplementation(real);
    await assessWritingByParts(h.provider, h.input, 'model', 'hash', checkpoint, async cache => { checkpoint = cache; });
    expect(h.provider.generateStructured).toHaveBeenCalledTimes(4);
    expect(h.provider.generateStructured.mock.calls[0][0].input.parts[0].partNumber).toBe(2);
  });
  it('does not fabricate feedback for blank Parts and rejects invented synthesis evidence', async () => {
    const h = fixture();
    for (const part of h.input.parts) if (part.partNumber !== 2) for (const q of part.questions) { q.response = ''; q.wordCount = 0; }
    const real = h.provider.generateStructured.getMockImplementation()!;
    h.provider.generateStructured.mockImplementation(async request => {
      if (request.input.scope === 'FULL_SKILL') {
        const raw = await real(request);
        raw.cefr.evidence[0].quote = 'invented'; return raw;
      }
      return real(request);
    });
    await expect(assessWritingByParts(h.provider, h.input, 'model', 'hash', undefined, async () => undefined)).rejects.toThrow('AI_WRITING_EVIDENCE_INVALID');
    expect(h.provider.generateStructured).toHaveBeenCalledTimes(2);
  });
});
