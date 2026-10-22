import { Inject, Injectable } from '@nestjs/common';
import { AI_PROVIDER, AiProvider } from '../../../common/ai/ai-provider.interface';
import { WritingInput } from '../contracts/writing-assessment-input';
import { WritingAssessment, WRITING_CRITERIA } from '../contracts/writing-assessment-output';
import { writingOutputSchema } from '../contracts/writing-assessment.schema';
import { WRITING_SYSTEM_PROMPT, WRITING_SYSTEM_PROMPT_V2, WRITING_SYSTEM_PROMPT_V3 } from '../prompts/writing-system-v1';
import { WritingJobConfig } from '../writing-ai-config.service';
import { WritingAssessmentValidator } from './writing-assessment-validator.service';
import { AiError } from '../../../common/ai/ai-error';
import { WRITING_SUMMARY_PROMPT_V1 } from '../prompts/writing-summary-v1';
import { evidenceIdSchema, resolveWritingEvidence, writingEvidenceCatalog, writingRepairInstruction,
  WritingRetryFeedback, WRITING_EVIDENCE_IDS_INSTRUCTION } from './writing-evidence-ids';

export type WritingStageResults = {
  version: 1;
  inputHash: string;
  parts: Record<string, WritingAssessment>;
  final?: WritingAssessment;
};

@Injectable()
export class WritingAssessmentService {
  constructor(
    @Inject(AI_PROVIDER) private readonly provider: AiProvider,
    private readonly validator: WritingAssessmentValidator,
  ) {}
  async assess(input: WritingInput, config: WritingJobConfig, feedback?: WritingRetryFeedback): Promise<WritingAssessment> {
    if (input.parts.every((part) => part.questions.every((question) => !question.response.trim())))
      return this.blank(input);
    const prompts: Record<string, string> = {
      'writing-prompt-v1': WRITING_SYSTEM_PROMPT,
      'writing-prompt-v2': WRITING_SYSTEM_PROMPT_V2,
      'writing-prompt-v3': WRITING_SYSTEM_PROMPT_V3,
      'writing-prompt-v4-evidence-ids': WRITING_SYSTEM_PROMPT_V3 + WRITING_EVIDENCE_IDS_INSTRUCTION,
    };
    const systemInstruction = prompts[config.promptVersion];
    if (!systemInstruction) throw new Error('WRITING_PROMPT_VERSION_UNSUPPORTED');
    const useIds = config.promptVersion === 'writing-prompt-v4-evidence-ids';
    const catalog = useIds ? writingEvidenceCatalog(input) : [];
    const schema = writingOutputSchema(input.scope, true);
    const value = await this.provider.generateStructured({
      model: config.model,
      systemInstruction,
      input: useIds ? { ...input, evidenceCatalog: catalog, repairInstruction: writingRepairInstruction(feedback) } : input,
      outputSchema: useIds ? evidenceIdSchema(schema) : schema,
      maxOutputTokens: config.maxOutputTokens,
      signal: AbortSignal.timeout(config.timeoutMs),
    });
    return this.validator.validate(useIds ? resolveWritingEvidence(value, schema, catalog) : value, input);
  }
  async assessByParts(
    input: WritingInput,
    config: WritingJobConfig,
    inputHash: string,
    previous: WritingStageResults | undefined,
    save: (cache: WritingStageResults) => Promise<void>,
    beforeCall: (stage: string) => Promise<void>,
    feedback?: WritingRetryFeedback,
  ): Promise<WritingAssessment> {
    const cache: WritingStageResults = previous?.version === 1 && previous.inputHash === inputHash
      ? structuredClone(previous) : { version: 1, inputHash, parts: {} };
    if (cache.final) return this.validator.validate(structuredClone(cache.final), input);
    const parts: WritingAssessment['details']['parts'] = [];
    for (const part of input.parts) {
      const partInput: WritingInput = { ...input, scope: 'PART', parts: [part] };
      let assessed: WritingAssessment;
      if (part.questions.every(question => !question.response.trim())) assessed = this.blank(partInput);
      else if (cache.parts[String(part.partNumber)])
        assessed = this.validator.validate(structuredClone(cache.parts[String(part.partNumber)]), partInput);
      else {
        await beforeCall(`part_${part.partNumber}`);
        // Keep the current rubric, prompt, evidence validation and output contract unchanged.
        assessed = await this.assess(partInput, config, feedback?.stage === `part_${part.partNumber}` ? feedback : undefined);
        cache.parts[String(part.partNumber)] = assessed;
        await save(structuredClone(cache));
      }
      parts.push(...assessed.details.parts);
    }
    const blank = this.blank(input);
    if (input.parts.every(part => part.questions.every(question => !question.response.trim()))) return blank;
    if (input.scope === 'PART') return cache.parts[String(input.parts[0].partNumber)];
    await beforeCall('summary');
    const schema = writingOutputSchema('FULL_SKILL');
    const summarySchema = { type: 'object' as const, properties: { cefr: schema.properties!.cefr, summary: schema.properties!.summary }, required: ['cefr', 'summary'] };
    const useIds = config.promptVersion === 'writing-prompt-v4-evidence-ids';
    const catalog = useIds ? writingEvidenceCatalog(input) : [];
    const raw = await this.provider.generateStructured({
      model: config.model, systemInstruction: WRITING_SUMMARY_PROMPT_V1 + (useIds ? WRITING_EVIDENCE_IDS_INSTRUCTION : ''),
      input: { ...input, ...(useIds ? { evidenceCatalog: catalog, repairInstruction: writingRepairInstruction(feedback?.stage === 'summary' ? feedback : undefined) } : {}), validatedPartFeedback: parts.map(part => ({ partNumber: part.partNumber, overview: part.overview,
        questions: part.questions.map(question => ({ questionKey: question.questionKey, responseStatus: question.responseStatus,
          criteria: question.criteria })) })) },
      outputSchema: useIds ? evidenceIdSchema(summarySchema) : summarySchema,
      maxOutputTokens: config.maxOutputTokens, signal: AbortSignal.timeout(config.timeoutMs),
    });
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || Object.keys(raw).some(key => !['cefr', 'summary'].includes(key)))
      throw new AiError('AI_INVALID_RESPONSE', true, undefined, 'SUMMARY_SHAPE');
    const resolved = useIds ? resolveWritingEvidence(raw, summarySchema, catalog) : raw;
    const result = this.validator.validate({ ...blank, details: { parts }, cefr: (resolved as any).cefr, summary: (resolved as any).summary }, input);
    cache.final = result;
    await save(structuredClone(cache));
    return result;
  }
  blank(input: WritingInput): WritingAssessment {
    const vi = input.feedbackLocale === 'vi';
    const comment = vi ? 'Bạn chưa nộp nội dung trả lời.' : 'No response was submitted.';
    const suggestion = vi
      ? 'Hãy trả lời đầy đủ yêu cầu của từng câu hỏi.'
      : 'Respond to the requirements of each question.';
    return {
      schemaVersion: 1,
      scope: input.scope,
      feedbackLocale: input.feedbackLocale,
      cefr: {
        level: null,
        status: input.scope === 'PART' ? 'NOT_APPLICABLE' : 'INSUFFICIENT_EVIDENCE',
        reason: input.scope === 'PART' ? 'PART_SCOPE' : 'NO_RESPONSE',
        rationale: null,
        evidence: [],
        limitations: [],
      },
      summary: {
        overallComment: comment,
        partSummaries: input.parts.map((part) => ({
          partNumber: part.partNumber,
          comment,
        })),
        priorities: [suggestion],
      },
      details: {
        parts: input.parts.map((part) => ({
          partNumber: part.partNumber,
          overview: comment,
          strengths: [],
          weaknesses: [],
          suggestions: [suggestion],
          questions: part.questions.map((question) => ({
            questionKey: question.questionKey,
            responseStatus: 'BLANK',
            comment,
            criteria: WRITING_CRITERIA.map((criterion) => ({
              criterion,
              judgment: criterion === 'TASK' ? 'NEEDS_IMPROVEMENT' : 'NOT_ASSESSABLE',
              comment,
              evidenceQuotes: [],
            })),
            strengths: [],
            weaknesses: [],
            corrections: [],
            taskIssues: [comment],
            suggestions: [suggestion],
            suggestedRevision: null,
          })),
        })),
      },
    };
  }
}
