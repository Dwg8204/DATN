import { Injectable } from '@nestjs/common';
import { AiError } from '../../../common/ai/ai-error';
import { writingPaperAdapter } from '../../test-attempts/assessments/adapters/writing-paper.adapter';
import { Answers } from '../../test-attempts/types/attempt.type';
import { WritingInput } from '../contracts/writing-assessment-input';
import { FeedbackLocale } from '../contracts/writing-assessment-output';
import { WritingWordLimit } from '../../writing-tests/policies/writing-word-limits';

const plainText = (value: unknown): string =>
  typeof value === 'string'
    ? value
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
    : '';
export const writingWordCount = (text: string): number =>
  text.trim() ? text.trim().split(/\s+/u).length : 0;

@Injectable()
export class WritingInputBuilder {
  build(
    snapshot: Record<string, unknown>,
    answers: Answers,
    scope: WritingInput['scope'],
    feedbackLocale: FeedbackLocale,
    revealedKeys: string[] = [],
    inputVersion: 1 | 2 = 2,
  ): WritingInput {
    const paper = writingPaperAdapter(snapshot);
    const parts = Object.entries(paper.parts)
      .map(([number, value]) => {
        const partNumber = Number(number);
        const part = value as {
          context?: string;
          instruction?: string;
          prompt?: string;
          informalPrompt?: string;
          formalPrompt?: string;
          wordLimits?: Array<WritingWordLimit | null>;
          questions?: Array<{ key: string; text: string }>;
          messages?: Array<{ key: string; text: string }>;
        };
        return {
          partNumber,
          context: plainText(part.context),
          instruction: plainText(part.instruction),
          questions: paper.items
            .filter((item) => item.partNumber === partNumber)
            .map((item, index) => {
              const answer = answers[item.key];
              const response = answer?.kind === 'TEXT' ? answer.text : '';
              const wordLimit = inputVersion === 2 ? part.wordLimits?.[index] : null;
              const prompt =
                partNumber === 2
                  ? part.prompt
                  : partNumber === 4
                    ? item.key === 'p4:q1'
                      ? part.informalPrompt
                      : part.formalPrompt
                    : (part.questions ?? part.messages)?.find((question) => question.key === item.key)?.text;
              return {
                questionKey: item.key,
                prompt: plainText(prompt),
                response,
                wordCount: writingWordCount(response),
                minimumWords: wordLimit?.minimum ?? null,
                ...(inputVersion === 2
                  ? {
                      maximumWords: wordLimit?.maximum ?? null,
                      wordLimitPolicy: wordLimit?.policy ?? null,
                    }
                  : {}),
                register:
                  partNumber === 4
                    ? item.key === 'p4:q1'
                      ? ('informal' as const)
                      : ('formal' as const)
                    : null,
              };
            }),
        };
      })
      .sort((a, b) => a.partNumber - b.partNumber);
    const counts: Record<number, number> = { 1: 5, 2: 1, 3: 3, 4: 2 };
    if (
      (scope === 'FULL_SKILL' && parts.map((part) => part.partNumber).join(',') !== '1,2,3,4') ||
      (scope === 'PART' && parts.length !== 1) ||
      parts.some((part) => part.questions.length !== counts[part.partNumber])
    ) {
      throw new AiError('WRITING_SNAPSHOT_INVALID');
    }
    return {
      scope,
      feedbackLocale,
      rubricVersion: `writing-rubric-v${inputVersion}`,
      assistance: { revealedKeys },
      parts,
    };
  }
}
