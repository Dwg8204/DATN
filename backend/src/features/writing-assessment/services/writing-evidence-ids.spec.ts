import { ConfigService } from '@nestjs/config';
import { writingFixture } from '../testing/writing.fixture';
import { evidenceFixture } from '../testing/writing-evidence.fixture';
import { writingOutputSchema } from '../contracts/writing-assessment.schema';
import { WritingAiConfig } from '../writing-ai-config.service';
import { WritingAssessmentService, WritingStageResults } from './writing-assessment.service';
import { WritingAssessmentValidator } from './writing-assessment-validator.service';
import { writingEvidenceCatalog, resolveWritingEvidence, WritingRetryFeedback } from './writing-evidence-ids';
import { WritingEvidenceError } from './writing-evidence.error';

describe('Gemini Writing evidence-ID protocol', () => {
  it('resolves several IDs per criterion, findings, corrections and CEFR without changing stored/UI shape', () => {
    const { input, result } = writingFixture();
    result.details.parts[3].questions[1].criteria[2].evidenceQuotes = ['Yesterday', 'the club'];
    result.details.parts[3].strengths = [{ criterion: 'VOCABULARY', comment: 'Dùng từ phù hợp.',
      evidence: [{ questionKey: 'p4:q2', quote: 'the club' }] }];
    const catalog = writingEvidenceCatalog(input);
    const raw = evidenceFixture(result, catalog);
    const decoded = resolveWritingEvidence(raw, writingOutputSchema('FULL_SKILL', true), catalog);
    const validated = new WritingAssessmentValidator().validate(decoded, input);
    expect(validated.details.parts[3].questions[1].criteria[2].evidenceQuotes).toEqual(['Yesterday', 'the club']);
    expect(validated.details.parts[3].questions[0].corrections[0].original).toBe('I go');
    expect(validated.cefr.level).toBe('B1');
    expect(JSON.stringify(validated)).not.toContain('evidenceId');
  });
  it.each(['unknown', 'cross-question'])('rejects %s IDs with safe field diagnostics', kind => {
    const { input, result } = writingFixture(4), catalog = writingEvidenceCatalog(input);
    const raw = evidenceFixture(result, catalog);
    raw.details.parts[0].questions[1].criteria.VOCABULARY.evidenceIds = [kind === 'unknown' ? 'FAKE_PRIVATE_ID' : catalog[0].id];
    try {
      resolveWritingEvidence(raw, writingOutputSchema('PART', true), catalog);
      throw new Error('EXPECTED_FAILURE');
    } catch (error) {
      if (!(error instanceof WritingEvidenceError)) throw error;
      expect(error.validationRule).toBe('EVIDENCE_ID_INVALID');
      expect(error.location).toMatchObject({ questionKey: 'p4:q2', criterion: 'VOCABULARY' });
      expect(error.location?.path).toContain('evidenceQuotes[0]');
      expect(JSON.stringify(error)).not.toContain('FAKE_PRIVATE_ID');
    }
  });
  it('never accepts free-text quotes under the new protocol', () => {
    const { input, result } = writingFixture(2);
    expect(() => resolveWritingEvidence(result, writingOutputSchema('PART', true), writingEvidenceCatalog(input))).toThrow('AI_INVALID_RESPONSE');
  });
  it('creates deterministic exact passages with full coverage for very long sentences', () => {
    const { input } = writingFixture(2);
    input.parts[0].questions[0].response = ('Long sentence without punctuation ').repeat(100);
    const catalog = writingEvidenceCatalog(input);
    expect(catalog).toEqual(writingEvidenceCatalog(input));
    expect(new Set(catalog.map(entry => entry.id)).size).toBe(catalog.length);
    for (const entry of catalog) expect(input.parts[0].questions[0].response.includes(entry.text)).toBe(true);
  });
  it('automatically sends safe repair context and resumes validated Parts across retries including synthesis', async () => {
    const fixture = writingFixture();
    const config = new WritingAiConfig(new ConfigService()).snapshot('vi');
    const provider = { generateStructured: jest.fn(async (request: any): Promise<unknown> => {
      const value = request.outputSchema.properties.details
        ? writingFixture(request.input.parts[0].partNumber).result
        : { cefr: fixture.result.cefr, summary: fixture.result.summary };
      return evidenceFixture(value, request.input.evidenceCatalog);
    }) };
    const service = new WritingAssessmentService(provider, new WritingAssessmentValidator());
    let cache: WritingStageResults | undefined;
    const save = async (value: WritingStageResults) => { cache = structuredClone(value); };
    const repair: WritingRetryFeedback = { stage: 'part_4', rule: 'EVIDENCE_ID_INVALID', questionKey: 'p4:q2', criterion: 'VOCABULARY' };
    await service.assessByParts(fixture.input, config, 'hash', undefined, save, async () => {}, repair);
    expect(provider.generateStructured).toHaveBeenCalledTimes(5);
    expect(provider.generateStructured.mock.calls[0][0].input.repairInstruction).toBeUndefined();
    expect(provider.generateStructured.mock.calls[3][0].input.repairInstruction).toMatchObject({ previousRule: 'EVIDENCE_ID_INVALID', questionKey: 'p4:q2' });
    expect(provider.generateStructured.mock.calls[3][0].systemInstruction).toContain('EVIDENCE-ID PROTOCOL');
    expect(cache?.final?.cefr.level).toBe('B1');
    // A new job that inherits Parts must make only the synthesis call.
    delete cache!.final;
    provider.generateStructured.mockClear();
    await service.assessByParts(fixture.input, config, 'hash', cache, save, async () => {}, { ...repair, stage: 'summary' });
    expect(provider.generateStructured).toHaveBeenCalledTimes(1);
    expect(provider.generateStructured.mock.calls[0][0].input.repairInstruction).toBeDefined();
  });
});
