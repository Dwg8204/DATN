import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EntityManager } from "typeorm";
import { EMBEDDING_MODEL } from "../../retrieval/embedding.service";
export interface ErrorPattern {
  patternId: string;
  lessonTitle: string;
  chunkId: string;
  count: number;
  components: string[];
  priorCount: number;
  excerpt: string;
}
export function groupErrorPatterns(
  rows: Array<{
    documentId?: string;
    chunkId: string;
    title: string;
    excerpt: string;
    component: string;
    current: boolean;
  }>,
): ErrorPattern[] {
  const groups = new Map<string, ErrorPattern>();
  for (const r of rows) {
    const key = r.documentId ?? r.chunkId;
    const p = groups.get(key) ?? {
      patternId: `lesson:${key}`,
      lessonTitle: r.title,
      chunkId: r.chunkId,
      count: 0,
      priorCount: 0,
      components: [],
      excerpt: r.excerpt.slice(0, 400),
    };
    if (r.current) {
      p.count++;
      if (!p.components.includes(r.component)) p.components.push(r.component);
    } else p.priorCount++;
    groups.set(key, p);
  }
  return [...groups.values()]
    .filter((p) => p.count > 0)
    .sort((a, b) => b.count - a.count || a.chunkId.localeCompare(b.chunkId))
    .slice(0, 5)
    .map((p) => ({ ...p, components: p.components.sort() }));
}
@Injectable()
export class ErrorPatternsService {
  constructor(private readonly config: ConfigService) {}
  get enabled() {
    return (
      String(this.config.get("PERSONALIZATION_RAG_ENABLED", false)) === "true"
    );
  }
  async forPeriod(
    manager: EntityManager,
    userId: string,
    from: Date,
    to: Date,
  ): Promise<ErrorPattern[]> {
    if (!this.enabled) return [];
    const n = Number(this.config.get("RAG_KNOWLEDGE_MIN_SIMILARITY", 0.7)),
      threshold = Number.isFinite(n) && n >= 0 && n <= 1 ? n : 0.7;
    const rows = await manager.query(
      `SELECT chosen.id "chunkId",chosen.document_id "documentId",chosen.title,chosen.excerpt,e.component,e.observed_at >= $2 AS current
      FROM learner_error_chunks e JOIN test_attempts a ON a.id=e.attempt_id AND a.student_id=$1 AND a.status='SUBMITTED' AND a.assessment_revision=e.assessment_revision
      CROSS JOIN LATERAL (SELECT c.id,c.document_id,d.title,left(c.content,400) excerpt FROM knowledge_chunks c JOIN knowledge_documents d ON d.id=c.document_id
        WHERE d.status='READY' AND d.access_scope='LEARNER' AND d.usage='LESSON'
          AND d.metadata->>'examVariant' IN ('APTIS_ESOL_GENERAL','ENGLISH')
          AND NOT EXISTS(SELECT 1 FROM knowledge_documents newer WHERE newer.document_key=d.document_key AND newer.version_no>d.version_no AND newer.status='READY')
          AND (d.component=e.component OR (e.component='WRITING' AND d.component='GRAMMAR_VOCAB' AND e.criterion IN ('GRAMMAR','VOCABULARY','MECHANICS')))
          AND c.embedding_model=$4 AND c.embedding IS NOT NULL AND 1-(c.embedding <=> e.embedding)>=$5
        ORDER BY c.embedding <=> e.embedding,c.id LIMIT 1) chosen
      WHERE e.user_id=$1 AND e.observed_at<=$3 AND e.embedding_model=$4
      ORDER BY e.observed_at,e.id`,
      [userId, from, to, EMBEDDING_MODEL, threshold],
    );
    return groupErrorPatterns(rows);
  }
}
