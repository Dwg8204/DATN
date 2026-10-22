import { JsonSchema } from '../../common/ai/ai-provider.interface';

/** Inspect rejected text in memory. Never return values, quotations, parse messages or untrusted keys. */
export function diagnoseGroqJson(generated: unknown, schema: JsonSchema) {
  const issues: Array<{ path: string; rule: string }> = [];
  const issue = (path: string, rule: string) => { if (issues.length < 12) issues.push({ path, rule }); };
  if (typeof generated !== 'string' || !generated.length) return { kind: 'NO_GENERATED_TEXT', issues };
  if (generated.length > 1000000) return { kind: 'INSPECTION_SIZE_LIMIT', issues };
  let parsed: unknown;
  try { parsed = JSON.parse(generated); }
  catch {
    let depth = 0, quoted = false, escaped = false;
    for (const char of generated) {
      if (escaped) { escaped = false; continue; }
      if (quoted && char === '\\') { escaped = true; continue; }
      if (char === '"') { quoted = !quoted; continue; }
      if (!quoted) { if (char === '{' || char === '[') depth++; if (char === '}' || char === ']') depth--; }
    }
    return { kind: 'INVALID_JSON', possiblyTruncated: quoted || depth > 0,
      markdownFence: generated.trimStart().startsWith('```'), issues };
  }
  const walk = (value: unknown, node: JsonSchema, path: string) => {
    if (issues.length >= 12) return;
    if (value === null && node.nullable) return;
    if (node.enum && !node.enum.includes(value as string | number)) issue(path, 'ENUM');
    if (node.type === 'object') {
      if (!value || typeof value !== 'object' || Array.isArray(value)) { issue(path, 'OBJECT'); return; }
      const row = value as Record<string, unknown>;
      if (Object.keys(row).some(key => !node.properties?.[key])) issue(path, 'EXTRA_FIELDS');
      for (const key of node.required ?? []) {
        if (!(key in row)) issue(`${path}.${key}`, 'MISSING');
        else walk(row[key], node.properties![key], `${path}.${key}`);
      }
    } else if (node.type === 'array') {
      if (!Array.isArray(value)) { issue(path, 'ARRAY'); return; }
      if (value.length > (node.maxItems ?? Infinity) || value.length < (node.minItems ?? 0)) issue(path, 'ARRAY_BOUNDS');
      value.slice(0, 100).forEach((entry, index) => walk(entry, node.items!, `${path}[${index}]`));
    } else if (node.type === 'string') {
      if (typeof value !== 'string') issue(path, 'STRING');
      else if (value.length > (node.maxLength ?? Infinity)) issue(path, 'MAX_LENGTH');
      else if (value.trim().length < (node.minLength ?? 0)) issue(path, 'MIN_LENGTH');
    } else if (typeof value !== 'number' || !Number.isFinite(value) || node.type === 'integer' && !Number.isInteger(value)) issue(path, 'NUMBER');
  };
  walk(parsed, schema, 'root');
  return { kind: issues.length ? 'SCHEMA_MISMATCH' : 'SCHEMA_VALID', issues };
}
