import { Inject, Injectable } from '@nestjs/common';
import { AI_PROVIDER, AiProvider } from '../../../common/ai/ai-provider.interface';
import { WritingInput } from '../contracts/writing-assessment-input';
import { WritingAssessment, WRITING_CRITERIA } from '../contracts/writing-assessment-output';
import { writingOutputSchema } from '../contracts/writing-assessment.schema';
import { WRITING_SYSTEM_PROMPT, WRITING_SYSTEM_PROMPT_V2 } from '../prompts/writing-system-v1';
import { WritingJobConfig } from '../writing-ai-config.service';
import { WritingAssessmentValidator } from './writing-assessment-validator.service';

@Injectable()
export class WritingAssessmentService {
  constructor(
    @Inject(AI_PROVIDER) private readonly provider: AiProvider,
    private readonly validator: WritingAssessmentValidator,
  ) {}
  async assess(input: WritingInput, config: WritingJobConfig): Promise<WritingAssessment> {
    if (input.parts.every((part) => part.questions.every((question) => !question.response.trim())))
      return this.blank(input);
    const value = await this.provider.generateStructured({
      model: config.model,
      systemInstruction:
        config.promptVersion === 'writing-prompt-v1' ? WRITING_SYSTEM_PROMPT : WRITING_SYSTEM_PROMPT_V2,
      input,
      outputSchema: writingOutputSchema(input.scope, true),
      maxOutputTokens: config.maxOutputTokens,
      signal: AbortSignal.timeout(config.timeoutMs),
    });
    return this.validator.validate(value, input);
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
