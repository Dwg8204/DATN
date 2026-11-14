import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DataSource } from "typeorm";
import { paginate } from "../../common/pagination/pagination.dto";
import { ApplicationError } from "../../common/errors/application.error";
import { RagGapsDto, ReembedDto, RAG_SKILLS } from "./admin-rag.dto";
import { EMBEDDING_MODEL } from "./embedding.service";
import { QUESTION_TEXT_VERSION, buildQuestionText } from "./question-text";
import { PUBLIC_CHUNK_WHERE } from "./learner-knowledge.service";
@Injectable()
export class AdminRagService {
  constructor(
    private readonly db: DataSource,
    private readonly config: ConfigService,
  ) {}
  async status() {
    const rows = await this.db
      .query(`SELECT sq.question_id,sq.question_hash snapshot_hash,q.*,t.component,e.question_hash stored_hash,e.question_key stored_key,e.content_text stored_text,e.embedding_model stored_model,e.embedding_version stored_version
   FROM tests t JOIN topic_question_catalog q ON q.test_id=t.id
   LEFT JOIN topic_snapshot_questions sq ON sq.snapshot_id=t.published_snapshot_id AND sq.question_id=q.id LEFT JOIN question_embeddings e ON e.question_id=q.id
   WHERE t.status='PUBLISHED' AND t.archived_at IS NULL`);
    const coverage = RAG_SKILLS.map((component) => {
      const group = rows.filter((r: any) => r.component === component);
      let embedded = 0;
      for (const q of group) {
        if (
          q.id &&
          q.question_hash === q.snapshot_hash &&
          q.stored_hash === q.snapshot_hash &&
          q.stored_key === q.question_key &&
          q.stored_model === EMBEDDING_MODEL &&
          q.stored_version === QUESTION_TEXT_VERSION
        ) {
          try {
            if (q.stored_text === buildQuestionText(q)) embedded++;
          } catch {}
        }
      }
      return {
        component,
        total: group.length,
        embedded,
        percent: group.length
          ? Math.floor((embedded / group.length) * 10000) / 100
          : null,
      };
    });
    const jobs = await this.db
      .query(`SELECT t.component,count(*)::int total,count(*) FILTER(WHERE j.completed_at IS NOT NULL)::int completed,
   count(*) FILTER(WHERE j.completed_at IS NULL AND j.retry_count<5)::int pending,count(*) FILTER(WHERE j.completed_at IS NULL AND j.retry_count>=5)::int failed
   FROM question_embedding_jobs j JOIN tests t ON t.id=j.test_id WHERE t.status='PUBLISHED' AND t.archived_at IS NULL GROUP BY t.component`);
    const missingTopics = await this.db.query(
      `SELECT p.code,p.name,p.component FROM learning_topics p WHERE p.is_active AND NOT EXISTS(
   SELECT 1 FROM knowledge_documents d JOIN knowledge_chunks c ON c.document_id=d.id WHERE ${PUBLIC_CHUNK_WHERE} AND d.usage='LESSON' AND p.code=ANY(d.topic_codes)
    AND (d.component=p.component OR d.component IS NULL) AND c.embedding IS NOT NULL AND c.embedding_model=$1) ORDER BY p.component,p.code`,
      [EMBEDDING_MODEL],
    );
    const criteria = [
      ...[
        "TASK",
        "GRAMMAR",
        "VOCABULARY",
        "COHERENCE",
        "REGISTER",
        "MECHANICS",
      ].map((criterion) => ({ component: "WRITING", criterion })),
      ...[
        "grammarVocabulary",
        "pronunciation",
        "fluency",
        "taskFulfillment",
      ].map((criterion) => ({ component: "SPEAKING", criterion })),
    ];
    const guides = await this.db.query(
      `SELECT DISTINCT d.component,d.criterion FROM knowledge_documents d JOIN knowledge_chunks c ON c.document_id=d.id WHERE ${PUBLIC_CHUNK_WHERE} AND d.usage='CRITERION_GUIDE' AND c.embedding IS NOT NULL AND c.embedding_model=$1`,
      [EMBEDDING_MODEL],
    );
    return {
      enabled:
        String(this.config.get("PERSONALIZATION_RAG_ENABLED", false)) ===
        "true",
      coverage,
      jobs,
      missingTopics,
      missingCriteria: criteria.filter(
        (c) =>
          !guides.some(
            (g: any) =>
              g.component === c.component && g.criterion === c.criterion,
          ),
      ),
    };
  }
  async gaps(q: RagGapsDto) {
    if (q.from && q.to && q.from > q.to)
      throw new ApplicationError("RAG_DATE_RANGE", "Invalid date range.", 400);
    const args = [
      q.feature ?? null,
      q.component ?? null,
      q.from ?? null,
      q.to ?? null,
    ];
    const cte = `WITH expanded AS (SELECT g.*,topic FROM retrieval_gaps g CROSS JOIN LATERAL (SELECT DISTINCT unnest(CASE WHEN cardinality(g.topic_codes)=0 THEN ARRAY[NULL::text] ELSE g.topic_codes END) topic) topics
   WHERE ($1::text IS NULL OR g.feature=$1) AND ($2::text IS NULL OR g.component::text=$2)
    AND ($3::date IS NULL OR g.created_at>=($3::date::timestamp AT TIME ZONE 'UTC')) AND ($4::date IS NULL OR g.created_at<(($4::date+1)::timestamp AT TIME ZONE 'UTC'))),
   grouped AS (SELECT component,part_number,topic,count(*)::int occurrences,count(DISTINCT user_id)::int learners,avg(top_similarity)::float average_similarity FROM expanded GROUP BY component,part_number,topic)`;
    return this.db.transaction("REPEATABLE READ", async (m) => {
      const [{ total }] = await m.query(
        cte + " SELECT count(*)::int total FROM grouped",
        args,
      );
      const data = await m.query(
        cte +
          ` SELECT a.*,COALESCE((SELECT jsonb_agg(sample) FROM (SELECT DISTINCT qu.id "questionId",qu.test_id "testId",t.title,qu.part_number "partNumber",left(COALESCE(qu.content->>'text',qu.content->>'statement',qu.content->>'word',t.title),240) excerpt
    FROM expanded e JOIN questions qu ON qu.id=e.source_question_id JOIN tests t ON t.id=qu.test_id
    WHERE e.component=a.component AND e.part_number IS NOT DISTINCT FROM a.part_number AND e.topic IS NOT DISTINCT FROM a.topic AND t.archived_at IS NULL ORDER BY qu.id LIMIT 3) sample),'[]'::jsonb) samples
    FROM grouped a ORDER BY occurrences DESC,component,part_number NULLS FIRST,topic NULLS FIRST LIMIT $5 OFFSET $6`,
        [...args, q.pageSize, (q.page - 1) * q.pageSize],
      );
      return paginate(data, total, q);
    });
  }
  async reembed(actor: string, q: ReembedDto) {
    return this.db.transaction(async (m) => {
      const [{ locked }] = await m.query(
        `SELECT pg_try_advisory_xact_lock(hashtext('admin-rag-reembed')) locked`,
      );
      if (!locked)
        throw new ApplicationError(
          "RAG_REEMBED_BUSY",
          "Reindex request already running.",
          409,
        );
      const params = [q.component ?? null];
      const eligible = `SELECT id FROM tests WHERE status='PUBLISHED' AND archived_at IS NULL AND published_snapshot_id IS NOT NULL AND ($1::text IS NULL OR component::text=$1)`;
      const inserted = await m.query(
        `INSERT INTO question_embedding_jobs(test_id) SELECT id FROM (${eligible}) t WHERE NOT EXISTS(SELECT 1 FROM question_embedding_jobs j WHERE j.test_id=t.id) ON CONFLICT DO NOTHING RETURNING test_id`,
        params,
      );
      const updated = await m.query(
        `WITH ready AS (SELECT j.test_id FROM question_embedding_jobs j WHERE j.test_id IN (${eligible}) AND (j.completed_at IS NOT NULL OR j.retry_count>=5) ORDER BY j.test_id FOR UPDATE OF j SKIP LOCKED), changed AS (
    UPDATE question_embedding_jobs j SET requested_at=now(),next_retry_at=now(),retry_count=0,error_code=NULL,completed_at=NULL FROM ready WHERE j.test_id=ready.test_id RETURNING j.test_id) SELECT test_id FROM changed`,
        params,
      );
      const queued = inserted.length + updated.length;
      await m.query(
        `INSERT INTO audit_logs(actor_id,action,entity_type,changes) VALUES($1,'RAG_REEMBED','TEST',$2)`,
        [actor, { component: q.component ?? null, queued }],
      );
      return { queued };
    });
  }
}
