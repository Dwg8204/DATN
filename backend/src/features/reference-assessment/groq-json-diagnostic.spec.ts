import { diagnoseGroqJson } from './groq-json-diagnostic';

describe('Private Groq JSON diagnostics', () => {
  const schema = { type: 'object' as const, required: ['comment'], properties: { comment: { type: 'string' as const, minLength: 1, maxLength: 4 } } };
  it('classifies bounds without returning generated prose or unknown field names', () => {
    const diagnostic = diagnoseGroqJson(JSON.stringify({ comment: 'PRIVATE_STUDENT_TEXT', PRIVATE_FIELD: 'secret' }), schema);
    expect(diagnostic.kind).toBe('SCHEMA_MISMATCH');
    expect(diagnostic.issues).toContainEqual({ path: 'root.comment', rule: 'MAX_LENGTH' });
    expect(JSON.stringify(diagnostic)).not.toContain('PRIVATE');
    expect(JSON.stringify(diagnostic)).not.toContain('secret');
  });
  it('distinguishes parse failures, possible truncation, absent text and schema-valid output', () => {
    expect(diagnoseGroqJson('{"comment":"incomplete', schema)).toMatchObject({ kind: 'INVALID_JSON', possiblyTruncated: true });
    expect(diagnoseGroqJson('```json\n{}\n```', schema)).toMatchObject({ kind: 'INVALID_JSON', markdownFence: true });
    expect(diagnoseGroqJson(undefined, schema).kind).toBe('NO_GENERATED_TEXT');
    expect(diagnoseGroqJson('{"comment":"good"}', schema).kind).toBe('SCHEMA_VALID');
  });
});
