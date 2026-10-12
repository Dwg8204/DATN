import { JsonSchema } from '../../../common/ai/ai-provider.interface';
import { WRITING_CRITERIA } from './writing-assessment-output';

const text = (maxLength = 1200, nullable = false): JsonSchema => ({
  type: 'string',
  maxLength,
  minLength: 1,
  ...(nullable ? { nullable } : {}),
});
const enumeration = (values: string[]): JsonSchema => ({
  type: 'string',
  enum: values,
});
const array = (items: JsonSchema, maxItems = 5): JsonSchema => ({
  type: 'array',
  items,
  maxItems,
});
const object = (properties: Record<string, JsonSchema>): JsonSchema => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
});
const criterion = enumeration([...WRITING_CRITERIA]);
const evidence = object({ questionKey: text(40), quote: text(1500) });
const finding = object({
  criterion,
  comment: text(),
  evidence: array(evidence, 3),
});
const question = (provider: boolean) =>
  object({
    questionKey: text(40),
    responseStatus: enumeration(['ANSWERED', 'BLANK', 'TOO_SHORT']),
    comment: text(),
    criteria: provider
      ? object(
          Object.fromEntries(
            WRITING_CRITERIA.map((key) => [
              key,
              object({
                judgment: enumeration([
                  'STRONG',
                  'ADEQUATE',
                  'NEEDS_IMPROVEMENT',
                  'NOT_APPLICABLE',
                  'NOT_ASSESSABLE',
                ]),
                comment: text(700),
                evidenceQuotes: array(text(1500), 5),
              }),
            ]),
          ),
        )
      : {
          ...array(
            object({
              criterion,
              judgment: enumeration([
                'STRONG',
                'ADEQUATE',
                'NEEDS_IMPROVEMENT',
                'NOT_APPLICABLE',
                'NOT_ASSESSABLE',
              ]),
              comment: text(700),
              evidenceQuotes: array(text(1500), 5),
            }),
            6,
          ),
          minItems: 6,
        },
    strengths: array(finding, 3),
    weaknesses: array(finding, 3),
    corrections: array(
      object({
        kind: enumeration(['ERROR', 'SUGGESTION']),
        criterion,
        original: text(2000),
        replacement: text(2000),
        explanation: text(900),
      }),
      5,
    ),
    taskIssues: array(text(700), 3),
    suggestions: array(text(700), 3),
    suggestedRevision: text(8000, true),
  });
export function writingOutputSchema(scope: 'FULL_SKILL' | 'PART', provider = false): JsonSchema {
  return object({
    schemaVersion: { type: 'integer', enum: [1] },
    scope: enumeration([scope]),
    feedbackLocale: enumeration(['vi', 'en']),
    cefr: object({
      level: {
        type: 'string',
        nullable: true,
        enum: scope === 'PART' ? [] : ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
      },
      status: enumeration(scope === 'PART' ? ['NOT_APPLICABLE'] : ['ESTIMATED', 'INSUFFICIENT_EVIDENCE']),
      reason: text(200, true),
      rationale: text(1500, true),
      evidence: array(
        object({
          questionKey: text(40),
          quote: text(1500),
          explanation: text(900),
        }),
        5,
      ),
      limitations: array(text(700)),
    }),
    summary: object({
      overallComment: text(1800),
      partSummaries: array(
        object({
          partNumber: { type: 'integer', enum: [1, 2, 3, 4] },
          comment: text(),
        }),
        4,
      ),
      priorities: array(text(700), 3),
    }),
    details: object({
      parts: array(
        object({
          partNumber: { type: 'integer', enum: [1, 2, 3, 4] },
          overview: text(),
          strengths: array(finding, 3),
          weaknesses: array(finding, 3),
          suggestions: array(text(700), 3),
          questions: array(question(provider), 5),
        }),
        4,
      ),
    }),
  });
}
