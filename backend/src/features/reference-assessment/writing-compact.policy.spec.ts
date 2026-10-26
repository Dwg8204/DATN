import { AiError } from '../../common/ai/ai-error';
import { writingFixture } from '../writing-assessment/testing/writing.fixture';
import { WritingAssessmentValidator } from '../writing-assessment/services/writing-assessment-validator.service';
import { WritingAssessmentService } from '../writing-assessment/services/writing-assessment.service';
import { compactWritingInput, compactWritingSchema, expandCompactWriting } from './writing-compact.policy';
import { groqWritingInput, restoreBlankWriting } from './writing-reference.policy';
import { groundedGroqSchema, GroqReferenceProvider } from './groq-reference.provider';
import { recoverMissingWritingPartSuggestions } from './groq-json-diagnostic';
import { writingOutputSchema } from '../writing-assessment/contracts/writing-assessment.schema';
import { ReferenceAssessmentService } from './reference-assessment.service';
import { ConfigService } from '@nestjs/config';
import { GROQ_COMPACT_WRITING_VERSION } from './writing-compact.policy';
import { GROQ_PARTS_WRITING_VERSION } from './writing-parts.policy';
import { groqEvidenceCatalog } from './writing-evidence.policy';

export function compactFixture(partNumber?: number) {
  const fixture = writingFixture(partNumber);
  const raw = {
    schemaVersion: 1, cefr: fixture.result.cefr, overallComment: 'Bạn diễn đạt được ý chính.', priorities: ['Luyện thì quá khứ.'],
    parts: fixture.result.details.parts.map(part => ({
      partNumber: part.partNumber, comment: 'Bạn nêu được ý chính nhưng cần sửa thì.', suggestions: ['Luyện thì quá khứ.'],
      questions: part.questions.map(question => ({
        questionKey: question.questionKey, comment: 'Bạn nêu được ý chính.', suggestions: ['Sửa thì quá khứ.'], suggestedRevision: 'Yesterday I went to the club.',
        criteria: Object.fromEntries(question.criteria.map(entry => [entry.criterion, {
          judgment: entry.judgment, comment: 'Cần luyện thêm để diễn đạt chính xác.', quote: 'Yesterday',
        }])),
      })),
    })),
  };
  return { ...fixture, raw };
}

describe('Groq per-Part production flow and compact contract', () => {
  it('recovers only an omitted part suggestion list, preserving all actual assessment content', () => {
    const {raw}=compactFixture(4);
    const missing=structuredClone(raw) as any;
    delete missing.parts[0].suggestions;
    const recovered=recoverMissingWritingPartSuggestions(JSON.stringify(missing),compactWritingSchema('PART')) as any;
    expect(recovered).toEqual({...missing,parts:missing.parts.map((part:any)=>({...part,suggestions:[]}))});
    missing.parts[0].questions[0].suggestedRevision=null;
    expect(recoverMissingWritingPartSuggestions(JSON.stringify(missing),compactWritingSchema('PART'))).toBeUndefined();
    expect(recoverMissingWritingPartSuggestions('{',compactWritingSchema('PART'))).toBeUndefined();
    const wrongType=structuredClone(raw) as any;
    wrongType.parts[0].suggestions='not an array';
    expect(recoverMissingWritingPartSuggestions(JSON.stringify(wrongType),compactWritingSchema('PART'))).toBeUndefined();
  });
  it('handles HTTP 400 missing part suggestions without a second API call, then passes normal validation', async () => {
    const {raw,input}=compactFixture(4);
    const missing=structuredClone(raw) as any;
    delete missing.parts[0].suggestions;
    const previous=global.fetch;
    const fetchMock=jest.fn(async()=>new Response(JSON.stringify({error:{code:'json_validate_failed',failed_generation:JSON.stringify(missing)}}),{status:400}));
    global.fetch=fetchMock as any;
    try {
      const query=jest.fn(async(sql:string)=>sql.startsWith('SELECT count')?[{minute:0,day:0}]:sql.startsWith('INSERT')?[{id:'call'}]:[]);
      const db={transaction:async(fn:any)=>fn({query}),query};
      const provider=new GroqReferenceProvider(new ConfigService({GROQ_FREE_TIER_CONFIRMED:'true'}),db as any);
      const result=await provider.generateStructured({model:'test',systemInstruction:'test',input:{},outputSchema:compactWritingSchema('PART'),maxOutputTokens:4500,signal:AbortSignal.timeout(1000)});
      const expanded=expandCompactWriting(result,input);
      expect(()=>new WritingAssessmentValidator().validate(expanded,input)).not.toThrow();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {global.fetch=previous;}
  });
  function workerFixture(error?: AiError) {
    const fixture = compactFixture(2);
    const catalog=groqEvidenceCatalog(fixture.input);
    for(const part of fixture.raw.parts) for(const question of part.questions) for(const entry of Object.values(question.criteria) as any[]) {
      entry.evidenceId=catalog.find(e=>e.questionKey===question.questionKey && e.text===entry.quote)!.id;
      delete entry.quote;
    }
    const job: any = { id: 'job', attempt_id: 'attempt', model: 'openai/gpt-oss-120b', runs: 0,
      config: { provider: 'groq', model: 'openai/gpt-oss-120b', feedbackLocale: 'vi', inputVersion: 2,
        promptVersion: 'writing-prompt-v3', maxOutputTokens: 6000, timeoutMs: 1000, rubricVersion: 'writing-rubric-v2' } };
    let saved: any;
    const query = jest.fn(async (sql: string, params?: any[]) => {
      if (sql.startsWith('SELECT *')) return [{ ...job, config: { ...job.config } }];
      if (sql.startsWith("UPDATE reference_ai_jobs SET status='PROCESSING'")) job.runs++;
      if (sql.startsWith('SELECT a.component')) return [{ component: 'WRITING', scope: 'PART', snapshot: fixture.snapshot, answers: fixture.answers, result: {} }];
      if (sql.includes("jsonb_build_object('lastFailure'")) { Object.assign(job.config, JSON.parse(params![7])); job.status = params![2]; }
      if (sql.startsWith('UPDATE reference_ai_jobs SET result=')) saved = JSON.parse(params![2]);
      if (sql.includes("jsonb_set(config,'{writingParts}'")) {
        job.config.writingParts = JSON.parse(params![2]); return [{ id: job.id }];
      }
      return [];
    });
    const db = { query, transaction: async (fn: any) => fn({ query }) };
    const provider = { generateStructured: jest.fn(async () => structuredClone(fixture.raw) as unknown) };
    if (error) provider.generateStructured.mockRejectedValueOnce(error);
    const service = new ReferenceAssessmentService(db as any, new ConfigService(), provider as any, null as any, { enabled: true } as any, null as any);
    return { service, provider, job, query, fixture, get saved() { return saved; } };
  }
  it('uses per-Part mode immediately without first attempting a full request', async () => {
    const h = workerFixture();
    await h.service.runOnce();
    expect(h.provider.generateStructured).toHaveBeenCalledTimes(1);
    expect((h.provider.generateStructured.mock.calls[0] as any)[0].systemInstruction).toContain('This request assesses ONE PART ONLY');
    expect(h.saved.writing.metadata.promptVersion).toBe(GROQ_PARTS_WRITING_VERSION);
    expect(h.job.config.groqWritingPrompt).toBeUndefined();
  });
  it('resumes queued per-Part requests without changing primary results', async () => {
    const h = workerFixture(new AiError('GROQ_RATE_WAIT', true, 65000));
    await h.service.runOnce();
    expect(h.job.status).toBe('QUEUED');
    expect(h.job.config.groqWritingPrompt).toBe(GROQ_PARTS_WRITING_VERSION);
    expect(h.provider.generateStructured).toHaveBeenCalledTimes(1);
    h.provider.generateStructured.mockResolvedValueOnce(h.fixture.raw);
    await h.service.runOnce();
    expect(h.provider.generateStructured).toHaveBeenCalledTimes(2);
    const request = (h.provider.generateStructured.mock.calls as any)[1][0];
    expect(request.maxOutputTokens).toBe(3000);
    expect(request.input).not.toHaveProperty('verbatimEvidence');
    expect(h.saved.writing.metadata.promptVersion).toBe(GROQ_PARTS_WRITING_VERSION);
    expect(h.query.mock.calls.some(([sql]) => /UPDATE\s+test_attempts/i.test(sql))).toBe(false);
  });
  it.each([
    new AiError('GROQ_HTTP_413'), new AiError('GROQ_HTTP_429', true),
    new AiError('GROQ_HTTP_503', true), new AiError('AI_WRITING_EVIDENCE_INVALID', true),
  ])('keeps per-Part mode on failure %s', async error => {
    const h = workerFixture(error); await h.service.runOnce();
    expect(h.job.config.groqWritingPrompt).toBe(GROQ_PARTS_WRITING_VERSION);
  });
  it('switches rejected JSON to per-Part mode rather than repeating a full large response', async () => {
    const h = workerFixture(new AiError('GROQ_JSON_GENERATION_FAILED', true, 65000, 'SCHEMA_MISMATCH'));
    h.job.config.groqWritingPrompt = GROQ_COMPACT_WRITING_VERSION;
    await h.service.runOnce();
    expect(h.job.status).toBe('QUEUED');
    expect(h.job.config.groqWritingPrompt).toBe(GROQ_PARTS_WRITING_VERSION);
  });
  it.each([undefined, 1, 2, 3, 4])('adapts to the unchanged validator and UI contract for scope %s', part => {
    const { input, raw } = compactFixture(part);
    const result = new WritingAssessmentValidator().validate(expandCompactWriting(raw, input), input);
    expect(result.details.parts).toHaveLength(input.parts.length);
    for (const row of result.details.parts.flatMap(part => part.questions)) {
      expect(row.criteria).toHaveLength(6);
      expect(row.suggestedRevision).toBe('Yesterday I went to the club.');
      expect(row.corrections).toEqual([]);
    }
    expect(result.cefr.level).toBe(part ? null : 'B1');
  });
  it('removes duplicate evidence input, not task context or learner answers', () => {
    const { input } = compactFixture();
    const compact = compactWritingInput(input);
    expect(compact).not.toHaveProperty('verbatimEvidence');
    expect(compact.parts).toEqual(groqWritingInput(input).parts);
    const detailed = JSON.stringify(groundedGroqSchema(writingOutputSchema(input.scope, true), groqWritingInput(input)));
    expect(JSON.stringify(compactWritingSchema(input.scope)).length).toBeLessThan(detailed.length);
  });
  it('still rejects fabricated evidence, missing criteria, duplicate keys and unknown fields', () => {
    const { input, raw } = compactFixture(2);
    raw.parts[0].questions[0].criteria.GRAMMAR.quote = 'A fabricated quotation';
    expect(() => new WritingAssessmentValidator().validate(expandCompactWriting(raw, input), input)).toThrow('AI_WRITING_EVIDENCE_INVALID');
    delete (raw.parts[0].questions[0].criteria as any).GRAMMAR;
    expect(() => expandCompactWriting(raw, input)).toThrow('GROQ_COMPACT_WRITING_INVALID');
    const duplicate = compactFixture(1);
    duplicate.raw.parts[0].questions[1].questionKey = duplicate.raw.parts[0].questions[0].questionKey;
    expect(() => new WritingAssessmentValidator().validate(expandCompactWriting(duplicate.raw, duplicate.input), duplicate.input)).toThrow(AiError);
    const extra = compactFixture(2);
    (extra.raw as any).invented = true;
    expect(() => expandCompactWriting(extra.raw, extra.input)).toThrow('GROQ_COMPACT_WRITING_INVALID');
  });
  it('restores skipped questions/parts without inventing language feedback or CEFR', () => {
    const { input, raw } = compactFixture();
    for (const part of input.parts) if (part.partNumber !== 2) for (const question of part.questions) {
      question.response = ''; question.wordCount = 0;
    }
    raw.parts = raw.parts.filter(part => part.partNumber === 2);
    const blank = new WritingAssessmentService({} as any, new WritingAssessmentValidator()).blank(input);
    raw.cefr = blank.cefr;
    const result = new WritingAssessmentValidator().validate(restoreBlankWriting(expandCompactWriting(raw, input), input, blank), input);
    expect(result.details.parts).toHaveLength(4);
    expect(result.details.parts.find(part => part.partNumber === 1)?.questions[0].responseStatus).toBe('BLANK');
    expect(result.cefr.level).toBeNull();
  });
});
