export function reciprocalRankFusion<T extends { id: string }>(
  lists: T[][],
  limit = 6,
): T[] {
  const scores = new Map<string, { row: T; score: number }>();
  for (const list of lists) {
    const seen = new Set<string>();
    list.forEach((row, i) => {
      if (seen.has(row.id)) return;
      seen.add(row.id);
      const old = scores.get(row.id);
      scores.set(row.id, {
        row: old?.row ?? row,
        score: (old?.score ?? 0) + 1 / (60 + i + 1),
      });
    });
  }
  return [...scores.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ row, score }) => ({ ...row, rrfScore: score }));
}
export function boundedLimit(
  value: number | undefined,
  defaultValue: number,
  max = 50,
) {
  if (value === undefined) return defaultValue;
  if (!Number.isInteger(value) || value < 1 || value > max)
    throw Error('INVALID_RETRIEVAL_LIMIT');
  return value;
}
export function similarityThreshold(value: number | undefined) {
  if (
    value !== undefined &&
    (!Number.isFinite(value) || value < -1 || value > 1)
  )
    throw Error('INVALID_SIMILARITY');
  return value;
}
export interface KnowledgeFilters {
  component?: string;
  part?: number;
  topicCodes?: string[];
  usage?: string;
  criterion?: string;
  limit?: number;
  minSimilarity?: number;
}
export function knowledgeWhere(filters: KnowledgeFilters, params: unknown[]) {
  const terms = [
    `d.status='READY'`,
    `d.access_scope='LEARNER'`,
    `d.metadata->>'examVariant' IN ('APTIS_ESOL_GENERAL','ENGLISH')`,
    `NOT EXISTS(SELECT 1 FROM knowledge_documents newer WHERE newer.document_key=d.document_key AND newer.version_no>d.version_no AND newer.status='READY')`,
  ];
  const add = (sql: string, value: unknown) => {
    params.push(value);
    terms.push(sql.replace('?', `$${params.length}`));
  };
  if (filters.component) add('d.component=?', filters.component);
  if (filters.part !== undefined)
    add('(d.part_number=? OR d.part_number IS NULL)', filters.part);
  if (filters.topicCodes?.length)
    add('d.topic_codes && ?::text[]', filters.topicCodes);
  if (filters.usage) add('d.usage=?', filters.usage);
  if (filters.criterion) add('d.criterion=?', filters.criterion);
  return terms.join(' AND ');
}
