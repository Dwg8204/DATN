import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  EmbeddingService,
  EMBEDDING_MODEL,
  normalizeEmbedding,
} from './embedding.service';
import {
  boundedLimit,
  KnowledgeFilters,
  knowledgeWhere,
  reciprocalRankFusion,
  similarityThreshold,
} from './hybrid-search';
@Injectable()
export class KnowledgeSearchService {
  constructor(
    private readonly db: DataSource,
    private readonly embeddings: EmbeddingService,
  ) {}
  async search(
    query: string,
    filters: KnowledgeFilters = {},
    signal: AbortSignal = AbortSignal.timeout(30000),
  ) {
    if (!query.trim() || query.length > 6000)
      throw Error('INVALID_RETRIEVAL_QUERY');
    const args: unknown[] = [];
    const where = knowledgeWhere(filters, args);
    const [{ count }] = await this.db.query(
      `SELECT count(*)::int count FROM knowledge_documents d WHERE ${where}`,
      args,
    );
    if (!count) return [];
    const vector = await this.embeddings.embed(query, true, signal);
    return this.searchVector(vector, query, filters);
  }
  async searchVector(
    vector: number[],
    query: string,
    filters: KnowledgeFilters = {},
  ) {
    const { semantic, lexical } = await this.searchBranches(
      vector,
      query,
      filters,
    );
    return reciprocalRankFusion(
      [semantic, lexical],
      boundedLimit(filters.limit, 6),
    );
  }
  async searchBranches(
    vector: number[],
    query: string,
    filters: KnowledgeFilters = {},
  ) {
    const limit = boundedLimit(filters.limit, 6);
    const threshold = similarityThreshold(filters.minSimilarity);
    const args: unknown[] = [
      JSON.stringify(normalizeEmbedding(vector)),
      query,
      EMBEDDING_MODEL,
    ];
    const where = knowledgeWhere(filters, args);
    const select = `SELECT c.id,c.id AS "chunkId",d.document_key AS "documentKey",d.title,c.content,d.source_uri AS url,c.location,
   (1-(c.embedding <=> $1::vector))::float AS similarity FROM knowledge_chunks c JOIN knowledge_documents d ON d.id=c.document_id WHERE ${where}`;
    const model = ` AND c.embedding_model=$3 AND c.embedding IS NOT NULL`;
    const cutoff =
      threshold === undefined
        ? ''
        : ` AND 1-(c.embedding <=> $1::vector)>=${(args.push(threshold), `$${args.length}`)}`;
    const [semantic, lexical] = await Promise.all([
      this.db.query(
        `${select}${model}${cutoff} AND $2::text IS NOT NULL ORDER BY c.embedding <=> $1::vector,c.id LIMIT ${Math.max(10, limit)}`,
        args,
      ),
      this.db.query(
        `${select}${threshold === undefined ? ' AND $3::text IS NOT NULL' : model + cutoff} AND c.search_vector @@ plainto_tsquery('simple',$2) ORDER BY ts_rank_cd(c.search_vector,plainto_tsquery('simple',$2)) DESC,c.id LIMIT ${Math.max(10, limit)}`,
        args,
      ),
    ]);
    return { semantic, lexical };
  }
}
