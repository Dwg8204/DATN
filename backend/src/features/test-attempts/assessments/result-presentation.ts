import { Answers, AssessmentResult } from '../types/attempt.type';

/** Add learner answers to the API response without duplicating them in result JSONB. */
export function presentAssessmentResult(result: AssessmentResult | null, answers?: Answers): AssessmentResult | null {
  if (!result || !answers) return result;
  return {
    ...result,
    items: result.items.map(item => ({
      ...item,
      selectedAnswer: answers[item.key] ?? item.selectedAnswer ?? null,
    })),
  };
}
