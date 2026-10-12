import { FeedbackLocale } from './writing-assessment-output';

export type WritingInput = {
  scope: 'FULL_SKILL' | 'PART';
  feedbackLocale: FeedbackLocale;
  rubricVersion: string;
  assistance: { revealedKeys: string[] };
  parts: Array<{
    partNumber: number;
    context: string;
    instruction: string;
    questions: Array<{
      questionKey: string;
      prompt: string;
      response: string;
      wordCount: number;
      minimumWords: number | null;
      maximumWords?: number | null;
      wordLimitPolicy?: 'guidance' | 'required' | null;
      register: 'informal' | 'formal' | null;
    }>;
  }>;
};
