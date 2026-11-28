import { JsonSchema } from '../../../common/ai/ai-provider.interface';

/** CEFR for a single Part is deterministic metadata, not a model judgment. */
export const PART_OUTPUT_INSTRUCTION = '\nFor this PART request, omit the root cefr field entirely. The application supplies NOT_APPLICABLE metadata. Return the remaining schema fields unchanged.';
export function withoutPartCefr(schema: JsonSchema): JsonSchema {
  const copy = structuredClone(schema);
  delete copy.properties?.cefr;
  copy.required = copy.required?.filter(key => key !== 'cefr');
  return copy;
}
export function restorePartCefr(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  return { ...value, cefr: { level: null, status: 'NOT_APPLICABLE', reason: 'PART_SCOPE',
    rationale: null, evidence: [], limitations: [] } };
}
