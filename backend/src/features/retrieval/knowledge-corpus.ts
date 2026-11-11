import { createHash } from 'node:crypto';
import { KnowledgeSection } from '../chatbot/knowledge-chunker';
export const SKILLS = [
  'GRAMMAR_VOCAB',
  'READING',
  'LISTENING',
  'WRITING',
  'SPEAKING',
];
export interface KnowledgeDocument {
  key: string;
  title: string;
  variant: string;
  component?: string | null;
  source: string | null;
  verifiedAt: string;
  sections: KnowledgeSection[];
  usage?: string;
  topicCodes?: string[];
  part?: number | null;
  criterion?: string | null;
  reviewStatus?: string;
  review?: { type?: string; humanReviewed?: boolean; contentHash?: string };
}
export const sectionsHash = (d: KnowledgeDocument) =>
  createHash('sha256').update(JSON.stringify(d.sections)).digest('hex');
export function validateCorpus(docs: KnowledgeDocument[]) {
  const keys = new Set<string>();
  for (const d of docs) {
    if (
      !/^[a-z0-9-]{1,150}$/.test(d.key) ||
      keys.has(d.key) ||
      !d.title ||
      d.title.length > 255 ||
      !['APTIS_ESOL_GENERAL', 'ENGLISH'].includes(d.variant) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(d.verifiedAt) ||
      !d.sections?.length ||
      d.sections.some((s) => !s.heading || !s.text?.trim())
    )
      throw Error('INVALID_CORPUS');
    if (d.source && new URL(d.source).protocol !== 'https:')
      throw Error('INVALID_SOURCE');
    if (d.variant === 'APTIS_ESOL_GENERAL' && !d.source)
      throw Error('APTIS_REQUIRES_SOURCE');
    if (d.component != null && !SKILLS.includes(d.component))
      throw Error('INVALID_COMPONENT');
    if (
      !['GENERAL', 'LESSON', 'PART_STRATEGY', 'CRITERION_GUIDE'].includes(
        d.usage ?? 'GENERAL',
      )
    )
      throw Error('INVALID_USAGE');
    if (
      d.part != null &&
      (!Number.isInteger(d.part) ||
        d.part < 1 ||
        d.part > (d.component === 'GRAMMAR_VOCAB' ? 2 : 4))
    )
      throw Error('INVALID_PART');
    if (d.usage === 'PART_STRATEGY' && (!d.component || !d.part))
      throw Error('PART_REQUIRED');
    if (d.usage === 'CRITERION_GUIDE' && (!d.component || !d.criterion))
      throw Error('CRITERION_REQUIRED');
    if (d.topicCodes && !Array.isArray(d.topicCodes))
      throw Error('INVALID_TOPICS');
    if (
      d.topicCodes?.some(
        (c) => typeof c !== 'string' || !/^[a-z0-9-]+$/.test(c),
      )
    )
      throw Error('INVALID_TOPICS');
    if (
      d.reviewStatus === 'AI_APPROVED' &&
      d.review?.contentHash !== sectionsHash(d)
    )
      throw Error('STALE_AI_REVIEW');
    keys.add(d.key);
  }
}
export function importableDocument(d: KnowledgeDocument) {
  // Existing official summaries retain compatibility. New authored material must be explicitly reviewed.
  return (
    (d.reviewStatus === 'AI_APPROVED' &&
      d.review?.contentHash === sectionsHash(d)) ||
    (!d.reviewStatus &&
      d.variant === 'APTIS_ESOL_GENERAL' &&
      !!d.source &&
      (d.usage ?? 'GENERAL') === 'GENERAL')
  );
}
