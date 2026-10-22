import { Injectable } from '@nestjs/common';
import { JsonSchema } from '../../../common/ai/ai-provider.interface';
import { AiError } from '../../../common/ai/ai-error';
import { WritingInput } from '../contracts/writing-assessment-input';
import { Finding, WritingAssessment, WRITING_CRITERIA } from '../contracts/writing-assessment-output';
import { writingOutputSchema } from '../contracts/writing-assessment.schema';
import { WritingEvidenceError, WritingEvidenceLocation } from './writing-evidence.error';

export function assertShape(value: unknown, schema: JsonSchema, path = 'root'): void {
  const bad = (rule: string): never => {
    throw new AiError('AI_INVALID_RESPONSE', true, undefined, `${rule}:${path}`);
  };
  if (value === null && schema.nullable) return;
  if (schema.enum && !schema.enum.includes(value as string | number)) bad('ENUM');
  if (schema.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) bad('OBJECT');
    const row = value as Record<string, unknown>;
    if (Object.keys(row).some((key) => !schema.properties?.[key])) bad('EXTRA_FIELDS');
    for (const key of schema.required ?? []) {
      if (!(key in row)) bad(`MISSING_${key}`);
      assertShape(row[key], schema.properties![key], `${path}.${key}`);
    }
  } else if (schema.type === 'array') {
    if (
      !Array.isArray(value) ||
      value.length > (schema.maxItems ?? Infinity) ||
      value.length < (schema.minItems ?? 0)
    )
      bad('ARRAY_BOUNDS');
    for (const [index, item] of (value as unknown[]).entries())
      assertShape(item, schema.items!, `${path}[${index}]`);
  } else if (schema.type === 'string') {
    if (typeof value !== 'string' || value.length > (schema.maxLength ?? Infinity)) bad('STRING');
    if ((value as string).trim().length < (schema.minLength ?? 0)) bad('EMPTY_STRING');
  } else if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    (schema.type === 'integer' && !Number.isInteger(value))
  ) {
    bad('NUMBER');
  }
}
const normalize = (text: string) => text.replace(/\s+/gu, ' ').trim();

@Injectable()
export class WritingAssessmentValidator {
  validate(value: unknown, input: WritingInput): WritingAssessment {
    // TASK feedback about missing content legitimately has no source quotation.
    // Normalize only empty TASK evidence placeholders; language evidence stays strict.
    const record = (v: unknown): Record<string, unknown> | null =>
      v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null;
    const normalizeTaskEvidence = (v: unknown) => {
      const row = record(v);
      for (const field of ['strengths', 'weaknesses']) {
        const findings = row?.[field];
        if (!Array.isArray(findings)) continue;
        for (const entry of findings) {
          const finding = record(entry);
          if (finding?.criterion === 'TASK' && Array.isArray(finding.evidence)) {
            finding.evidence = finding.evidence.filter(e => {
              const evidence = record(e);
              return !(evidence && Object.keys(evidence).every(k => ['questionKey', 'quote'].includes(k)) &&
                typeof evidence.questionKey === 'string' && typeof evidence.quote === 'string' && !evidence.quote.trim());
            });
          }
        }
      }
    };
    const parts = record(record(value)?.details)?.parts;
    if (Array.isArray(parts)) for (const part of parts) {
      normalizeTaskEvidence(part);
      const questions = record(part)?.questions;
      if (Array.isArray(questions)) questions.forEach(normalizeTaskEvidence);
    }
    const root = value as {
      details?: {
        parts?: Array<{ questions?: Array<{ criteria?: unknown }> }>;
      };
    } | null;
    const firstCriteria = root?.details?.parts?.[0]?.questions?.[0]?.criteria;
    if (firstCriteria && !Array.isArray(firstCriteria)) {
      // The provider uses six required named fields; the saved/API contract stays an ordered array.
      assertShape(value, writingOutputSchema(input.scope, true));
      for (const part of root!.details!.parts!)
        for (const question of part.questions!) {
          const criteria = question.criteria as Record<string, object>;
          question.criteria = WRITING_CRITERIA.map((criterion) => ({
            criterion,
            ...criteria[criterion],
          }));
        }
    }
    assertShape(value, writingOutputSchema(input.scope));
    const result = value as WritingAssessment;
    const invalid = (rule: string, location?: WritingEvidenceLocation): never => {
      throw new WritingEvidenceError(rule, location);
    };
    if (result.feedbackLocale !== input.feedbackLocale || result.scope !== input.scope)
      invalid('LOCALE_OR_SCOPE');
    const expected = new Map(
      input.parts.flatMap((part) =>
        part.questions.map((question) => [question.questionKey, question] as const),
      ),
    );
    const quote = (key: string, text: string, path: string, criterion?: string): void => {
      if (
        !normalize(text) ||
        !expected.has(key) ||
        !normalize(expected.get(key)!.response).includes(normalize(text))
      )
        invalid('QUOTE_NOT_IN_RESPONSE', { path, questionKey: key, criterion });
    };
    const findings = (rows: Finding[], allowedKeys: Set<string>, path: string): void => {
      for (const [index, row] of rows.entries()) {
        if (row.criterion !== 'TASK' && row.evidence.length === 0)
          invalid('FINDING_WITHOUT_EVIDENCE', { path: `${path}[${index}].evidence`, criterion: row.criterion });
        for (const [evidenceIndex, evidence] of row.evidence.entries()) {
          const evidencePath = `${path}[${index}].evidence[${evidenceIndex}].quote`;
          if (!allowedKeys.has(evidence.questionKey)) invalid('EVIDENCE_QUESTION_KEY', { path: evidencePath });
          quote(evidence.questionKey, evidence.quote, evidencePath, row.criterion);
        }
      }
    };
    const partNumbers = input.parts.map((part) => part.partNumber).sort();
    const sameParts = (numbers: number[]) => numbers.sort().join(',') === partNumbers.join(',');
    if (
      !sameParts(result.details.parts.map((part) => part.partNumber)) ||
      !sameParts(result.summary.partSummaries.map((part) => part.partNumber))
    )
      invalid('PART_KEYS');
    const seen = new Set<string>();
    for (const [partIndex, part] of result.details.parts.entries()) {
      const partPath = `details.parts[${partIndex}]`;
      const keys = new Set(
        input.parts
          .find((candidate) => candidate.partNumber === part.partNumber)!
          .questions.map((question) => question.questionKey),
      );
      if (part.questions.length !== keys.size) invalid('QUESTION_COUNT');
      findings(part.strengths, keys, `${partPath}.strengths`);
      findings(part.weaknesses, keys, `${partPath}.weaknesses`);
      for (const [questionIndex, question] of part.questions.entries()) {
        const questionPath = `${partPath}.questions[${questionIndex}]`;
        if (!keys.has(question.questionKey) || seen.has(question.questionKey)) invalid('QUESTION_KEY');
        seen.add(question.questionKey);
        const original = expected.get(question.questionKey)!;
        const status = !original.response.trim()
          ? 'BLANK'
          : original.minimumWords !== null && original.wordCount < original.minimumWords
            ? 'TOO_SHORT'
            : 'ANSWERED';
        if (
          (question.responseStatus === 'BLANK' && status !== 'BLANK') ||
          (question.responseStatus !== 'BLANK' && status === 'BLANK')
        )
          invalid('RESPONSE_STATUS');
        // Word count and the configured task minimum are server facts, not model estimates.
        question.responseStatus = status;
        if (
          question.criteria.length !== 6 ||
          [...question.criteria.map((criterion) => criterion.criterion)].sort().join(',') !==
            [...WRITING_CRITERIA].sort().join(',')
        )
          invalid('CRITERIA_KEYS');
        for (const [criterionIndex, criterion] of question.criteria.entries())
          for (const [evidenceIndex, evidence] of criterion.evidenceQuotes.entries())
            quote(question.questionKey, evidence, `${questionPath}.criteria[${criterionIndex}].evidenceQuotes[${evidenceIndex}]`, criterion.criterion);
        findings(question.strengths, new Set([question.questionKey]), `${questionPath}.strengths`);
        findings(question.weaknesses, new Set([question.questionKey]), `${questionPath}.weaknesses`);
        for (const [index, correction] of question.corrections.entries())
          quote(question.questionKey, correction.original, `${questionPath}.corrections[${index}].original`, correction.criterion);
        if (
          status === 'BLANK' &&
          (question.strengths.length ||
            question.weaknesses.some((finding) => finding.criterion !== 'TASK') ||
            question.corrections.length ||
            question.suggestedRevision !== null ||
            question.criteria.some(
              (criterion) =>
                criterion.judgment !==
                (criterion.criterion === 'TASK' ? 'NEEDS_IMPROVEMENT' : 'NOT_ASSESSABLE'),
            ))
        )
          invalid('BLANK_RESPONSE');
      }
    }
    for (const [index, evidence] of result.cefr.evidence.entries()) quote(evidence.questionKey, evidence.quote, `cefr.evidence[${index}].quote`);
    if (input.scope === 'PART') {
      if (result.cefr.level !== null) invalid('PART_CEFR');
      // Scope is authoritative. Provider wording about why CEFR is unavailable is not grading evidence.
      result.cefr = {
        level: null,
        status: 'NOT_APPLICABLE',
        reason: 'PART_SCOPE',
        rationale: null,
        evidence: [],
        limitations: [],
      };
    } else if (result.cefr.status === 'ESTIMATED') {
      const nonblankParts = new Set(
        input.parts
          .filter((part) => part.questions.some((question) => question.response.trim()))
          .map((part) => part.partNumber),
      );
      const evidenceParts = new Set(
        result.cefr.evidence
          .map(
            (evidence) =>
              input.parts.find((part) => part.questions.some((q) => q.questionKey === evidence.questionKey))!
                .partNumber,
          )
          .filter((part) => part >= 2),
      );
      if (!result.cefr.level || !result.cefr.rationale?.trim()) invalid('CEFR_RATIONALE');
      if (![2, 3, 4].every((part) => nonblankParts.has(part)) || evidenceParts.size < 2) {
        result.cefr = {
          level: null,
          status: 'INSUFFICIENT_EVIDENCE',
          reason: 'INSUFFICIENT_EVIDENCE',
          evidence: [],
          rationale: null,
          limitations: [
            input.feedbackLocale === 'vi'
              ? 'Chưa đủ bằng chứng ở các Part 2–4 để ước lượng CEFR toàn bài.'
              : 'Insufficient evidence across Parts 2–4 to estimate overall CEFR.',
          ],
        };
      }
    } else if (result.cefr.level !== null || !result.cefr.reason?.trim()) invalid('INSUFFICIENT_EVIDENCE');
    return result;
  }
}
