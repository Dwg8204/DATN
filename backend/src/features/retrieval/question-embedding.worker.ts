import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import {
  EmbeddingService,
  EMBEDDING_MODEL,
  normalizeEmbedding,
} from './embedding.service';
import { buildQuestionText, QUESTION_TEXT_VERSION } from './question-text';
import { AiProviderError } from '../ai-shared/ai-provider.error';
@Injectable()
export class QuestionEmbeddingWorker implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private pending?: Promise<void>;
  private quotaUntil = 0;
  get retryAfterMs() {
    return Math.max(0, this.quotaUntil - Date.now());
  }
  private readonly logger = new Logger(QuestionEmbeddingWorker.name);
  constructor(
    private readonly db: DataSource,
    private readonly embeddings: EmbeddingService,
    private readonly config: ConfigService,
  ) {}
  get enabled() {
    return (
      String(this.config.get('PERSONALIZATION_RAG_ENABLED', false)) === 'true'
    );
  }
  onModuleInit() {
    if (!this.enabled) return;
    this.tick();
    this.timer = setInterval(() => this.tick(), 60000);
    this.timer.unref();
  }
  private tick() {
    if (!this.pending)
      this.pending = this.runBatch()
        .catch(() => this.logger.warn('Question embedding batch deferred.'))
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
    if (!this.enabled || this.retryAfterMs > 0) return false;
    return this.db.transaction(async (manager) => {
      const [job] =
        await manager.query(`SELECT * FROM question_embedding_jobs WHERE completed_at IS NULL AND retry_count<5 AND next_retry_at<=now()
    ORDER BY requested_at,test_id LIMIT 1 FOR UPDATE SKIP LOCKED`);
      if (!job) return false;
      // Bounded transaction locks only the job. Publication may wait; readers validate current snapshot/hash.
      const [test] = await manager.query(
        'SELECT published_snapshot_id,status,archived_at FROM tests WHERE id=$1',
        [job.test_id],
      );
      if (!test || test.status !== 'PUBLISHED' || test.archived_at) {
        await manager.query(
          'DELETE FROM question_embeddings WHERE test_id=$1',
          [job.test_id],
        );
        await manager.query(
          'UPDATE question_embedding_jobs SET completed_at=now(),error_code=NULL WHERE test_id=$1',
          [job.test_id],
        );
        return true;
      }
      const rows = await manager.query(
        `SELECT q.*,e.question_hash stored_hash,e.question_key stored_key,e.content_text stored_text,e.embedding_model stored_model,e.embedding_version stored_version
    FROM topic_question_catalog q JOIN topic_snapshot_questions sq ON sq.snapshot_id=$2 AND sq.question_id=q.id AND sq.question_hash=q.question_hash
    LEFT JOIN question_embeddings e ON e.question_id=q.id WHERE q.test_id=$1 ORDER BY q.part_number,q.position,q.id`,
        [job.test_id, test.published_snapshot_id],
      );
      try {
        const prepared = rows.map((q: any) => ({
          ...q,
          text: buildQuestionText(q),
        }));
        const changed = prepared.filter(
          (q: any) =>
            q.stored_hash !== q.question_hash ||
            q.stored_key !== q.question_key ||
            q.stored_text !== q.text ||
            q.stored_model !== EMBEDDING_MODEL ||
            q.stored_version !== QUESTION_TEXT_VERSION,
        );
        // One batch per transaction bounds provider calls and preserves earlier batches if the next call fails.
        const batch = changed.slice(0, 20);
        // Identical public question text has an identical embedding input. Reuse it
        // across seed variants; each question still retains its own hash/snapshot.
        const texts = [...new Set<string>(batch.map((q: any) => q.text))];
        const cached = texts.length
          ? await manager.query(
              `SELECT DISTINCT ON (content_text) content_text,embedding::text vector
           FROM question_embeddings WHERE content_text=ANY($1::text[])
           AND embedding_model=$2 AND embedding_version=$3 ORDER BY content_text,question_id`,
              [texts, EMBEDDING_MODEL, QUESTION_TEXT_VERSION],
            )
          : [];
        const byText = new Map<string, number[]>(
          cached.map((row: any) => [
            row.content_text,
            normalizeEmbedding(JSON.parse(row.vector)),
          ]),
        );
        const missing = texts.filter((text) => !byText.has(text));
        const generated = missing.length
          ? await this.embeddings.embedMany(missing, AbortSignal.timeout(60000))
          : [];
        missing.forEach((text, i) => byText.set(text, generated[i]));
        for (let i = 0; i < batch.length; i++) {
          const q = batch[i];
          await manager.query(
            `INSERT INTO question_embeddings(question_id,question_hash,test_id,component,part_number,question_key,content_text,search_vector,embedding,embedding_model,embedding_version)
      VALUES($1,$2,$3,$4,$5,$6,$7,to_tsvector('simple',$7),$8::vector,$9,$10)
      ON CONFLICT(question_id) DO UPDATE SET question_hash=EXCLUDED.question_hash,test_id=EXCLUDED.test_id,component=EXCLUDED.component,
      part_number=EXCLUDED.part_number,question_key=EXCLUDED.question_key,content_text=EXCLUDED.content_text,search_vector=EXCLUDED.search_vector,
      embedding=EXCLUDED.embedding,embedding_model=EXCLUDED.embedding_model,embedding_version=EXCLUDED.embedding_version,updated_at=now()`,
            [
              q.id,
              q.question_hash,
              q.test_id,
              q.component,
              q.part_number,
              q.question_key,
              q.text,
              JSON.stringify(byText.get(q.text)),
              EMBEDDING_MODEL,
              QUESTION_TEXT_VERSION,
            ],
          );
        }
        await manager.query(
          'DELETE FROM question_embeddings WHERE test_id=$1 AND NOT(question_id=ANY($2::uuid[]))',
          [job.test_id, prepared.map((q: any) => q.id)],
        );
        await manager.query(
          `UPDATE question_embedding_jobs SET completed_at=CASE WHEN $2 THEN now() ELSE NULL END,error_code=NULL,retry_count=0,next_retry_at=now() WHERE test_id=$1`,
          [job.test_id, changed.length <= 20],
        );
      } catch (error) {
        // Provider/text errors only; database errors must roll back rather than execute queries in an aborted transaction.
        if ((error as any)?.query) throw error;
        const quota =
          error instanceof AiProviderError && error.reason === 'QUOTA';
        const delay = quota
          ? Math.max(60000, (error as AiProviderError).retryAfterMs ?? 0)
          : Math.min(3600000, 15000 * 2 ** job.retry_count);
        if (quota) this.quotaUntil = Date.now() + delay;
        await manager.query(
          "UPDATE question_embedding_jobs SET retry_count=retry_count+$2,error_code=$3,next_retry_at=now()+$4*interval '1 millisecond' WHERE test_id=$1",
          [
            job.test_id,
            quota ? 0 : 1,
            error instanceof AiProviderError
              ? error.reason
              : 'EMBEDDING_FAILED',
            delay,
          ],
        );
      }
      return true;
    });
  }
}
