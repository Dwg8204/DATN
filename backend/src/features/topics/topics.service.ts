import { Injectable, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DataSource, EntityManager } from "typeorm";
import { createHash } from "node:crypto";
import { ApplicationError } from "../../common/errors/application.error";
import {
  TopicBulkDto,
  TopicInputDto,
  TopicQueryDto,
  TopicReviewDto,
} from "./topics.dto";

export const TOPIC_COVERAGE_SQL = `SELECT t.component,count(*)::int total,
  count(*) FILTER(WHERE EXISTS(SELECT 1 FROM question_topics l JOIN learning_topics p ON p.id=l.topic_id
    WHERE l.question_id=q.id AND l.status='APPROVED' AND l.question_hash=q.question_hash AND p.is_active AND p.component=t.component))::int approved
  FROM topic_question_catalog q JOIN tests t ON t.id=q.test_id
  WHERE t.status='PUBLISHED' AND t.archived_at IS NULL GROUP BY t.component`;

// A rejection is a completed human decision, not a reason to request AI again.
export const CURRENT_TOPIC_LABEL_SQL = `SELECT 1 FROM question_topics l JOIN learning_topics p ON p.id=l.topic_id
  WHERE l.question_id=q.id AND l.question_hash=q.question_hash AND p.is_active AND p.component=q.component`;
const TEST_PROGRESS_SQL = `SELECT t.id,t.title,t.component,
  (SELECT count(*)::int FROM topic_question_catalog q WHERE q.test_id=t.id) questions,
  (SELECT count(*)::int FROM topic_question_catalog q WHERE q.test_id=t.id AND EXISTS(${CURRENT_TOPIC_LABEL_SQL})) labeled,
  (SELECT count(*)::int FROM question_topics l JOIN topic_question_catalog q ON q.id=l.question_id
    WHERE q.test_id=t.id AND l.status='SUGGESTED' AND l.question_hash=q.question_hash) pending,
  j.error_code,j.completed_at,j.retry_count,j.next_retry_at,
  CASE WHEN j.test_id IS NULL THEN 'NOT_QUEUED' WHEN j.completed_at IS NOT NULL THEN 'COMPLETED'
    WHEN j.retry_count>=4 THEN 'FAILED' WHEN j.next_retry_at>now() THEN 'RETRYING' ELSE 'QUEUED' END job_status
  FROM tests t LEFT JOIN topic_tagging_jobs j ON j.test_id=t.id
  WHERE t.archived_at IS NULL AND ($1::text IS NULL OR t.component::text=$1)`;

@Injectable()
export class TopicsService {
  constructor(
    readonly db: DataSource,
    @Optional() private readonly config?: ConfigService,
  ) {}
  private async testApprovalState(m: EntityManager, testId: string) {
    const [test] = await m.query(
      "SELECT id,title FROM tests WHERE id=$1 AND archived_at IS NULL",
      [testId],
    );
    if (!test)
      throw new ApplicationError("TEST_NOT_FOUND", "Test not found.", 404);
    const labels = await m.query(
      `SELECT l.id,l.question_id,l.topic_id,l.question_hash,l.confidence,l.source,
      (l.question_hash=q.question_hash AND p.is_active AND p.component=q.component) eligible
      FROM question_topics l JOIN topic_question_catalog q ON q.id=l.question_id
      JOIN learning_topics p ON p.id=l.topic_id WHERE q.test_id=$1 AND l.status='SUGGESTED' ORDER BY l.id`,
      [testId],
    );
    const eligible = labels.filter((l: any) => l.eligible);
    const revision = createHash("sha256")
      .update(JSON.stringify({ testId, labels }))
      .digest("hex");
    return {
      test,
      eligible,
      revision,
      pending: labels.length,
      skipped: labels.length - eligible.length,
      questions: new Set(eligible.map((l: any) => l.question_id)).size,
    };
  }
  async approvalPreview(testId: string) {
    const state = await this.testApprovalState(this.db.manager, testId);
    return {
      title: state.test.title,
      revision: state.revision,
      labels: state.eligible.length,
      questions: state.questions,
      skipped: state.skipped,
    };
  }
  async approveTest(actor: string, testId: string, revision: string) {
    return this.db.transaction(async (m) => {
      // Freeze the test, its questions and catalog entries while checking the preview.
      await m.query("SELECT id FROM tests WHERE id=$1 FOR UPDATE", [testId]);
      await m.query(
        "SELECT id FROM questions WHERE test_id=$1 ORDER BY id FOR UPDATE",
        [testId],
      );
      await m.query(
        `SELECT p.id FROM learning_topics p WHERE EXISTS(SELECT 1 FROM question_topics l JOIN questions q ON q.id=l.question_id WHERE l.topic_id=p.id AND q.test_id=$1) ORDER BY p.id FOR SHARE`,
        [testId],
      );
      await m.query(
        `SELECT l.id FROM question_topics l JOIN questions q ON q.id=l.question_id WHERE q.test_id=$1 ORDER BY l.id FOR UPDATE OF l`,
        [testId],
      );
      const state = await this.testApprovalState(m, testId);
      if (state.revision !== revision)
        throw new ApplicationError(
          "TOPIC_LABEL_CHANGED",
          "Labels changed; reopen the confirmation.",
          409,
        );
      if (!state.eligible.length)
        return { reviewed: 0, questions: 0, skipped: state.skipped };
      const ids = state.eligible.map((l: any) => l.id);
      await m.query(
        `UPDATE question_topics SET status='APPROVED',reviewed_by=$2,reviewed_at=now() WHERE id=ANY($1::uuid[])`,
        [ids, actor],
      );
      await m.query(
        `INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,changes)
        SELECT $1,'TOPIC_REVIEW','QUESTION',l.question_id,jsonb_build_object('labelId',l.id,'originalTopicId',l.topic_id,'topicId',l.topic_id,
          'status','APPROVED','questionHash',l.question_hash,'bulkTestId',$3::text)
        FROM question_topics l WHERE l.id=ANY($2::uuid[])`,
        [actor, ids, testId],
      );
      await m.query(
        `INSERT INTO topic_evidence_jobs(attempt_id) SELECT a.id FROM test_attempts a JOIN test_snapshots s ON s.id=a.snapshot_id
        WHERE s.test_id=$1 AND a.status='SUBMITTED' ON CONFLICT(attempt_id) DO UPDATE SET requested_at=clock_timestamp()`,
        [testId],
      );
      return {
        reviewed: ids.length,
        questions: state.questions,
        skipped: state.skipped,
      };
    });
  }
  async suggestMissing(actor: string | null, dto: TopicBulkDto) {
    return this.db.transaction(async (m) => {
      const queued = await m.query(
        `INSERT INTO topic_tagging_jobs(test_id,requested_by,manual_requested_at)
        SELECT t.id,$1,now() FROM tests t LEFT JOIN topic_tagging_jobs existing ON existing.test_id=t.id WHERE t.archived_at IS NULL
          AND (existing.test_id IS NULL OR (existing.completed_at IS NOT NULL OR existing.retry_count>=4)
            AND (existing.manual_requested_at IS NULL OR existing.manual_requested_at<=now()-interval '10 minutes'))
          AND ($2::text IS NULL OR t.component::text=$2)
          AND EXISTS(SELECT 1 FROM learning_topics p WHERE p.component=t.component AND p.is_active)
          AND EXISTS(SELECT 1 FROM topic_question_catalog q WHERE q.test_id=t.id AND NOT EXISTS(${CURRENT_TOPIC_LABEL_SQL}))
        ORDER BY t.id
        ON CONFLICT(test_id) DO UPDATE SET requested_by=EXCLUDED.requested_by,requested_at=now(),manual_requested_at=now(),
          next_retry_at=now(),retry_count=0,error_code=NULL,completed_at=NULL
        WHERE (topic_tagging_jobs.completed_at IS NOT NULL OR topic_tagging_jobs.retry_count>=4)
          AND (topic_tagging_jobs.manual_requested_at IS NULL OR topic_tagging_jobs.manual_requested_at<=now()-interval '10 minutes')
        RETURNING test_id`,
        [actor, dto.component ?? null],
      );
      await m.query(
        `INSERT INTO audit_logs(actor_id,action,entity_type,changes) VALUES($1,'TOPIC_BULK_SUGGEST','TEST',$2)`,
        [actor, { component: dto.component ?? null, queued: queued.length }],
      );
      return { queued: queued.length };
    });
  }
  async progress(query: TopicQueryDto) {
    const [summary] = await this.db.query(
      `WITH progress AS (${TEST_PROGRESS_SQL}) SELECT
      count(*) FILTER(WHERE questions>0)::int tests,
      COALESCE(sum(questions),0)::int questions,COALESCE(sum(labeled),0)::int labeled,COALESCE(sum(pending),0)::int pending,
      count(*) FILTER(WHERE labeled<questions AND job_status='QUEUED')::int queued,
      count(*) FILTER(WHERE labeled<questions AND job_status='RETRYING')::int retrying,
      count(*) FILTER(WHERE labeled<questions AND job_status='FAILED')::int failed,
      count(*) FILTER(WHERE questions>0 AND labeled=questions)::int completed
      FROM progress`,
      [query.component ?? null],
    );
    return {
      ...summary,
      workerEnabled:
        String(this.config?.get("PERSONALIZATION_WORKER_ENABLED", false)) ===
        "true",
      aiEnabled:
        String(this.config?.get("PERSONALIZATION_AI_ENABLED", false)) ===
        "true",
    };
  }
  async topics(query: TopicQueryDto) {
    return {
      items: await this.db.query(
        "SELECT * FROM learning_topics WHERE ($1::text IS NULL OR component::text=$1) ORDER BY component,code",
        [query.component ?? null],
      ),
      coverage: await this.db.query(TOPIC_COVERAGE_SQL),
    };
  }
  async save(actor: string, dto: TopicInputDto, id?: string) {
    return this.db.transaction(async (m) => {
      if (id) {
        const [old] = await m.query(
          "SELECT * FROM learning_topics WHERE id=$1 FOR UPDATE",
          [id],
        );
        if (!old)
          throw new ApplicationError(
            "TOPIC_NOT_FOUND",
            "Topic not found.",
            404,
          );
        if (old.component !== dto.component || old.code !== dto.code)
          throw new ApplicationError(
            "TOPIC_IDENTITY_IMMUTABLE",
            "Keep the code and skill of existing topics.",
            409,
          );
      }
      const [row] = id
        ? await m.query(
            `UPDATE learning_topics SET name=$2,description=$3,topic_type=$4,is_active=$5,updated_at=now() WHERE id=$1 RETURNING *`,
            [
              id,
              dto.name,
              dto.description ?? null,
              dto.topicType,
              dto.isActive,
            ],
          )
        : await m.query(
            `INSERT INTO learning_topics(code,name,description,component,topic_type,is_active,created_by) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(code) DO NOTHING RETURNING *`,
            [
              dto.code,
              dto.name,
              dto.description ?? null,
              dto.component,
              dto.topicType,
              dto.isActive,
              actor,
            ],
          );
      if (!row)
        throw new ApplicationError(
          "TOPIC_CODE_EXISTS",
          "Topic code already exists.",
          409,
        );
      await m.query(
        `INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,changes) VALUES($1,'TOPIC_SAVE','LEARNING_TOPIC',$2,$3)`,
        [actor, row.id, { isActive: dto.isActive, name: dto.name }],
      );
      return row;
    });
  }
  async tests(query: TopicQueryDto) {
    const size = query.pageSize ?? 50;
    const [result] = await this.db.query(
      `WITH progress AS (${TEST_PROGRESS_SQL}), filtered AS (
        SELECT * FROM progress WHERE ($2::uuid IS NULL OR id=$2)
        AND ($4='ALL' OR $4='MISSING' AND labeled<questions
          OR $4='NEEDS_REVIEW' AND pending>0 OR $4='FAILED' AND job_status='FAILED')
        AND ($5='' OR strpos(lower(title),lower($5))>0)
      ), paged AS (SELECT * FROM filtered ORDER BY pending DESC,title,id LIMIT $6 OFFSET $3)
      SELECT COALESCE((SELECT json_agg(paged) FROM paged),'[]'::json) items,
        (SELECT count(*)::int FROM filtered) AS "totalItems"`,
      [
        query.component ?? null,
        query.testId ?? null,
        (query.page - 1) * size,
        query.work ?? "ALL",
        query.search?.trim() ?? "",
        size,
      ],
    );
    return result;
  }
  async labels(query: TopicQueryDto) {
    const size = query.pageSize ?? 100;
    const [result] = await this.db.query(
      `WITH filtered AS (
      SELECT l.*,q.test_id,q.question_hash AS current_hash,q.part_number,q.question_key,q.group_key,q.content,q.correct_answer,q.sample_answer,q.part_contents,t.name topic_name,t.code,t.is_active
      FROM question_topics l JOIN topic_question_catalog q ON q.id=l.question_id JOIN learning_topics t ON t.id=l.topic_id
      WHERE ($1::uuid IS NULL OR q.test_id=$1) AND ($2='ALL' OR l.status::text=$2)
        AND ($3='ALL' OR $3='LOW_CONFIDENCE' AND (l.confidence IS NULL OR l.confidence<0.8)
          OR $3='STALE' AND l.question_hash IS DISTINCT FROM q.question_hash OR $3='HIDDEN_TOPIC' AND NOT t.is_active)
        AND ($5='' OR strpos(lower(concat_ws(' ',q.question_key,q.content::text,t.name,t.code)),lower($5))>0)
      ), paged AS (SELECT * FROM filtered ORDER BY confidence ASC NULLS LAST,id LIMIT $6 OFFSET $4)
      SELECT COALESCE((SELECT json_agg(paged) FROM paged),'[]'::json) items,
        (SELECT count(*)::int FROM filtered) AS "totalItems"`,
      [
        query.testId ?? null,
        query.status ?? "SUGGESTED",
        query.reviewFilter ?? "ALL",
        (query.page - 1) * size,
        query.search?.trim() ?? "",
        size,
      ],
    );
    const questions = query.testId
      ? await this.db.query(
          "SELECT id,part_number,question_key,question_hash,group_key,part_contents,content,correct_answer,sample_answer FROM topic_question_catalog WHERE test_id=$1 ORDER BY part_number,position",
          [query.testId],
        )
      : [];
    return {
      ...result,
      hasMore: query.page * size < result.totalItems,
      questions,
    };
  }
  async review(actor: string, dto: TopicReviewDto) {
    return this.db.transaction(async (m) => {
      const tests = new Set<string>();
      for (const item of dto.items) {
        const [q] = await m.query(
          `SELECT c.* FROM topic_question_catalog c JOIN questions q ON q.id=c.id WHERE c.id=$1 FOR UPDATE OF q`,
          [item.questionId],
        );
        if (!q || q.question_hash !== item.questionHash)
          throw new ApplicationError(
            "TOPIC_QUESTION_CHANGED",
            "Question changed; reload labels.",
            409,
          );
        const [topic] = await m.query(
          `SELECT id FROM learning_topics WHERE id=$1 AND component=$2 AND (is_active OR $3='REJECTED')`,
          [item.topicId, q.component, item.status],
        );
        if (!topic)
          throw new ApplicationError(
            "TOPIC_UNAVAILABLE",
            "Active topic from the same skill required.",
            400,
          );
        let original;
        if (item.labelId) {
          [original] = await m.query(
            "SELECT * FROM question_topics WHERE id=$1 AND question_id=$2 FOR UPDATE",
            [item.labelId, item.questionId],
          );
          if (!original || original.question_hash !== q.question_hash)
            throw new ApplicationError(
              "TOPIC_LABEL_CHANGED",
              "Reload labels before reviewing.",
              409,
            );
          if (original.topic_id !== item.topicId)
            await m.query(
              "UPDATE question_topics SET status='REJECTED',reviewed_by=$2,reviewed_at=now() WHERE id=$1",
              [original.id, actor],
            );
        }
        await m.query(
          `INSERT INTO question_topics(question_id,topic_id,weight,status,source,reviewed_by,reviewed_at,question_hash)
          VALUES($1,$2,1,$3,'ADMIN',$4,now(),$5) ON CONFLICT(question_id,topic_id) DO UPDATE SET
          status=EXCLUDED.status,reviewed_by=EXCLUDED.reviewed_by,reviewed_at=now(),question_hash=EXCLUDED.question_hash`,
          [q.id, item.topicId, item.status, actor, q.question_hash],
        );
        await m.query(
          `INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,changes) VALUES($1,'TOPIC_REVIEW','QUESTION',$2,$3)`,
          [
            actor,
            q.id,
            {
              labelId: item.labelId ?? null,
              originalTopicId: original?.topic_id ?? null,
              topicId: item.topicId,
              status: item.status,
              questionHash: q.question_hash,
            },
          ],
        );
        tests.add(q.test_id);
      }
      await m.query(
        `INSERT INTO topic_evidence_jobs(attempt_id) SELECT a.id FROM test_attempts a JOIN test_snapshots s ON s.id=a.snapshot_id
        WHERE s.test_id=ANY($1::uuid[]) AND a.status='SUBMITTED' ON CONFLICT(attempt_id) DO UPDATE SET requested_at=clock_timestamp()`,
        [[...tests]],
      );
      return { reviewed: dto.items.length };
    });
  }
  async suggest(actor: string, testId: string) {
    return this.db.transaction(async (m) => {
      const [test] = await m.query(
        "SELECT id FROM tests WHERE id=$1 AND archived_at IS NULL FOR UPDATE",
        [testId],
      );
      if (!test)
        throw new ApplicationError("TEST_NOT_FOUND", "Test not found.", 404);
      const [row] = await m.query(
        `INSERT INTO topic_tagging_jobs(test_id,requested_by,manual_requested_at) VALUES($1,$2,now())
        ON CONFLICT(test_id) DO UPDATE SET requested_by=$2,requested_at=now(),manual_requested_at=now(),next_retry_at=now(),retry_count=0,error_code=NULL,completed_at=NULL
        WHERE topic_tagging_jobs.manual_requested_at IS NULL OR topic_tagging_jobs.manual_requested_at<=now()-interval '10 minutes' RETURNING test_id`,
        [testId, actor],
      );
      if (!row)
        throw new ApplicationError(
          "TOPIC_SUGGEST_COOLDOWN",
          "Wait ten minutes before requesting suggestions again.",
          429,
        );
      await m.query(
        `DELETE FROM question_topics l USING questions q WHERE q.id=l.question_id AND q.test_id=$1 AND l.source='AI' AND l.status='SUGGESTED'`,
        [testId],
      );
      return { queued: true };
    });
  }
}
