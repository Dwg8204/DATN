import { AssessmentResult } from '../../test-attempts/types/attempt.type';

export function writingSummary(result: AssessmentResult | null, component: string) {
  if (component !== 'WRITING' || !result?.writing) return result;
  const writing = result.writing;
  return {
    ...result,
    writing: {
      schemaVersion: writing.schemaVersion,
      scope: writing.scope,
      feedbackLocale: writing.feedbackLocale,
      cefr: writing.cefr,
      summary: writing.summary,
      metadata: writing.metadata,
    },
  };
}
export function writingPart(
  result: AssessmentResult,
  component: string,
  partNumber: number,
  assessmentRevision: number,
) {
  if (component !== 'WRITING' || !result.writing) return undefined;
  return {
    feedbackLocale: result.writing.feedbackLocale,
    assessmentRevision,
    part: result.writing.details.parts.find((part) => part.partNumber === partNumber) ?? null,
  };
}
