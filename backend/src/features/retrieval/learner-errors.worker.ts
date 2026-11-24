import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DataSource } from "typeorm";
import { EmbeddingService, EMBEDDING_MODEL } from "./embedding.service";
import { QUESTION_TEXT_VERSION } from "./question-text";
import { writingErrors } from "./learner-error-text";
import { AiProviderError } from "../ai-shared/ai-provider.error";

@Injectable()
export class LearnerErrorsWorker implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private pending?: Promise<void>;
  private cooldown = 0;
  private readonly logger = new Logger(LearnerErrorsWorker.name);
  constructor(
    private readonly db: DataSource,
    private readonly embeddings: EmbeddingService,
    private readonly config: ConfigService,
  ) {}
  get enabled() {
    return (
      String(this.config.get("PERSONALIZATION_RAG_ENABLED", false)) === "true"
    );
  }
  onModuleInit() {
    if (this.enabled) {
      this.tick();
      this.timer = setInterval(() => this.tick(), 60000);
      this.timer.unref();
    }
  }
  private tick() {
    if (!this.pending)
      this.pending = this.runBatch()
        .catch(() => this.logger.warn("Learner error indexing deferred."))
        .finally(() => {
          this.pending = undefined;
        });
  }
  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    await this.pending;
  }
  async runBatch() {
    if (!this.enabled) return;
    for (let i = 0; i < 5; i++) if (!(await this.processOne())) break;
  }
  async processOne(): Promise<boolean> {
    if (!this.enabled || Date.now() < this.cooldown) return false;
    return this.db.transaction(async (m) => {
      const [job] =
        await m.query(`SELECT * FROM learner_error_jobs WHERE completed_at IS NULL AND retry_count<5 AND next_retry_at<=now()
        ORDER BY next_retry_at,requested_at,attempt_id LIMIT 1 FOR UPDATE SKIP LOCKED`);
      if (!job) return false;
      const [a] = await m.query("SELECT * FROM test_attempts WHERE id=$1", [
        job.attempt_id,
      ]);
      if (!a) return true;
      // The trigger locks the job before invalidating chunks. Never lock the attempt here:
      // a concurrent grade can wait for this bounded job, then invalidate its old output.
      let rows: any[] = [],
        missing = false;
      try {
        if (
          a.status === "SUBMITTED" &&
          a.submitted_at &&
          a.result?.method === "OBJECTIVE"
        ) {
          const items = (
            Array.isArray(a.result.items) ? a.result.items : []
          ).filter(
            (i: any) =>
              ["INCORRECT", "SKIPPED"].includes(i.outcome) &&
              typeof i.key === "string",
          );
          rows = await m.query(
            `SELECT DISTINCT sq.question_key,e.content_text text,e.embedding::text vector,e.part_number part,
            'OBJECTIVE_MISTAKE' AS kind,NULL::text criterion FROM topic_snapshot_questions sq
            JOIN question_embeddings e ON e.question_id=sq.question_id AND e.question_hash=sq.question_hash
              AND e.embedding_model=$3 AND e.embedding_version=$4
            WHERE sq.snapshot_id=$1 AND sq.question_key=ANY($2::text[])`,
            [
              a.snapshot_id,
              items.map((i: any) => i.key),
              EMBEDDING_MODEL,
              QUESTION_TEXT_VERSION,
            ],
          );
          missing = rows.length < new Set(items.map((i: any) => i.key)).size;
        } else if (
          a.status === "SUBMITTED" &&
          a.submitted_at &&
          a.component === "WRITING" &&
          a.result?.method === "AI"
        ) {
          const errors = writingErrors(a.result);
          const vectors = errors.length
            ? await this.embeddings.embedMany(
                errors.map((e) => e.text),
                AbortSignal.timeout(30000),
                a.student_id,
              )
            : [];
          rows = errors.map((e, i) => ({
            kind: e.sourceKind,
            part: e.part,
            question_key: e.key,
            criterion: e.criterion,
            text: e.text,
            vector: JSON.stringify(vectors[i]),
          }));
        }
      } catch (error) {
        if ((error as any)?.query) throw error;
        const quota =
          error instanceof AiProviderError && error.reason === "QUOTA";
        const delay = quota
          ? Math.max(60000, error.retryAfterMs ?? 0)
          : Math.min(3600000, 15000 * 2 ** job.retry_count);
        if (quota) this.cooldown = Date.now() + delay;
        await m.query(
          `UPDATE learner_error_jobs SET retry_count=retry_count+$2,error_code=$3,next_retry_at=now()+$4*interval '1 millisecond' WHERE attempt_id=$1`,
          [a.id, quota ? 0 : 1, quota ? "QUOTA" : "EMBEDDING_FAILED", delay],
        );
        return true;
      }
      await m.query("DELETE FROM learner_error_chunks WHERE attempt_id=$1", [
        a.id,
      ]);
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        await m.query(
          `INSERT INTO learner_error_chunks(user_id,attempt_id,assessment_revision,source_kind,ordinal,component,part_number,question_key,criterion,content_text,search_vector,embedding,embedding_model,observed_at)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,to_tsvector('simple',$10),$11::vector,$12,$13)`,
          [
            a.student_id,
            a.id,
            a.assessment_revision,
            r.kind,
            i,
            a.component,
            r.part,
            r.question_key,
            r.criterion,
            r.text,
            r.vector,
            EMBEDDING_MODEL,
            a.submitted_at,
          ],
        );
      }
      // Wait for public-question indexing without spending embedding quota. Old unsupported
      // snapshots remain a visible gap instead of receiving invented vectors.
      await m.query(
        `UPDATE learner_error_jobs SET completed_at=CASE WHEN $2 THEN NULL ELSE now() END,
        error_code=CASE WHEN $2 THEN 'QUESTION_VECTOR_MISSING' ELSE NULL END,
        next_retry_at=now()+interval '5 minutes',retry_count=0 WHERE attempt_id=$1`,
        [a.id, missing],
      );
      return true;
    });
  }
}
