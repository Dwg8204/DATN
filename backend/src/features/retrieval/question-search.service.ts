import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { EMBEDDING_MODEL, normalizeEmbedding } from './embedding.service';
import { QUESTION_TEXT_VERSION } from './question-text';
import { boundedLimit, similarityThreshold } from './hybrid-search';
import { REGULAR_TEST_SQL } from '../ai-shared/placement';
export interface QuestionSearchOptions {
  component: string;
  part?: number;
  excludeTestIds?: string[];
  excludeQuestionIds?: string[];
  perSource?: number;
  minSimilarity?: number;
  regularOnly?: boolean;
}
@Injectable()
export class QuestionSearchService {
  constructor(private readonly db: DataSource) {}
  async similar(
    vectors: number[][],
    options: QuestionSearchOptions,
    manager: EntityManager = this.db.manager,
  ) {
    if (vectors.length > 30) throw Error('TOO_MANY_QUERY_VECTORS');
    const limit = boundedLimit(options.perSource, 10);
    const threshold = similarityThreshold(options.minSimilarity) ?? 0.75;
    const results = [];
    for (let i = 0; i < vectors.length; i++) {
      const args: unknown[] = [
        JSON.stringify(normalizeEmbedding(vectors[i])),
        options.component,
        options.excludeTestIds ?? [],
        options.excludeQuestionIds ?? [],
        threshold,
        EMBEDDING_MODEL,
        QUESTION_TEXT_VERSION,
      ];
      const part =
        options.part === undefined
          ? ''
          : ` AND e.part_number=$${args.push(options.part)}`;
      const rows = await manager.query(
        `SELECT e.question_id AS id,e.question_id AS "questionId",e.test_id,e.question_hash,e.question_key,e.component,e.part_number,
    (1-(e.embedding <=> $1::vector))::float similarity
    FROM question_embeddings e JOIN tests t ON t.id=e.test_id
    JOIN topic_question_catalog q ON q.id=e.question_id AND q.question_hash=e.question_hash
    JOIN topic_snapshot_questions sq ON sq.snapshot_id=t.published_snapshot_id AND sq.question_id=e.question_id AND sq.question_hash=e.question_hash
    WHERE t.status='PUBLISHED' AND t.archived_at IS NULL AND e.component=$2
    AND NOT(e.test_id=ANY($3::uuid[])) AND NOT(e.question_id=ANY($4::uuid[]))
    AND 1-(e.embedding <=> $1::vector)>=$5 AND e.embedding_model=$6 AND e.embedding_version=$7
    ${part} ${options.regularOnly === false ? '' : `AND ${REGULAR_TEST_SQL} AND (t.purpose='PRACTICE' OR t.scope='FULL_SKILL') AND EXISTS(SELECT 1 FROM test_snapshots ps WHERE ps.id=t.published_snapshot_id AND ps.schema_version=1)`}
    ORDER BY e.embedding <=> $1::vector,e.question_id LIMIT ${limit}`,
        args,
      );
      results.push(
        ...rows.map((r: Record<string, unknown>) => ({ ...r, sourceIndex: i })),
      );
    }
    return results;
  }
}
