import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DataSource } from "typeorm";
import { JsonGenerationService } from "../ai-shared/json-generation.service";
import { AiProviderError } from "../ai-shared/ai-provider.error";
import {
  TOPIC_SCHEMA,
  TOPIC_SYSTEM,
  validateTopicLabels,
} from "./topic-contract";
import { processTopicEvidence } from "./topic-evidence";
import { CURRENT_TOPIC_LABEL_SQL } from "./topics.service";

@Injectable()
export class TopicsWorker implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private pending?: Promise<void>;
  private readonly logger = new Logger(TopicsWorker.name);
  constructor(
    readonly db: DataSource,
    private readonly config: ConfigService,
    private readonly generation: JsonGenerationService,
  ) {}
  onModuleInit() {
    if (
      String(this.config.get("PERSONALIZATION_WORKER_ENABLED", false)) !==
      "true"
    )
      return;
    this.tick();
    this.timer = setInterval(() => this.tick(), 60_000);
    this.timer.unref();
  }
  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    await this.pending;
  }
  private tick() {
    if (!this.pending)
      this.pending = this.runBatch()
        .catch(() => {
          this.logger.warn("Topic work deferred; retrying next tick.");
        })
        .finally(() => {
          this.pending = undefined;
        });
  }
  async runBatch() {
    for (let i = 0; i < 50; i++) {
      const worked = await this.db.transaction(async (m) => {
        const [job] = await m.query(
          "SELECT * FROM topic_evidence_jobs ORDER BY requested_at LIMIT 1 FOR UPDATE SKIP LOCKED",
        );
        if (!job) return false;
        await processTopicEvidence(m, job.attempt_id);
        await m.query("DELETE FROM topic_evidence_jobs WHERE attempt_id=$1", [
          job.attempt_id,
        ]);
        return true;
      });
      if (!worked) break;
    }
    if (String(this.config.get("PERSONALIZATION_AI_ENABLED", false)) !== "true")
      return;
    for (let i = 0; i < 50; i++) if (!(await this.suggestOne())) break;
  }
  async suggestOne() {
    return this.db.transaction(async (m) => {
      // Same advisory lock and per-minute accounting as personalization report calls.
      const [lock] = await m.query(
        "SELECT pg_try_advisory_xact_lock(167740,6) acquired",
      );
      if (!lock.acquired) return false;
      const [quota] = await m.query(
        `SELECT count(*)::int count FROM ai_requests WHERE purpose IN ('TOPIC_TAGGING','PERSONAL_COMMENT','PERSONAL_PLAN','PERSONAL_WEEKLY','PERSONAL_FINAL') AND started_at>=now()-interval '1 minute'`,
      );
      if (quota.count >= Number(this.config.get("PERSONALIZATION_MAX_RPM", 5)))
        return false;
      const [job] =
        await m.query(`SELECT j.*,t.component,t.part_contents FROM topic_tagging_jobs j JOIN tests t ON t.id=j.test_id
        WHERE j.completed_at IS NULL AND j.next_retry_at<=now() AND j.retry_count<4 AND t.archived_at IS NULL
        ORDER BY j.requested_at LIMIT 1 FOR UPDATE OF j SKIP LOCKED`);
      if (!job) return false;
      const all = await m.query(
        `SELECT q.* FROM topic_question_catalog q WHERE q.test_id=$1 AND NOT EXISTS(
        ${CURRENT_TOPIC_LABEL_SQL})
        ORDER BY q.part_number,q.position`,
        [job.test_id],
      );
      if (!all.length) {
        await m.query(
          "UPDATE topic_tagging_jobs SET completed_at=now(),error_code=NULL WHERE test_id=$1",
          [job.test_id],
        );
        return true;
      }
      const questions =
        all.length > 30
          ? all.filter((q: any) => q.part_number === all[0].part_number)
          : all;
      const topics = await m.query(
        "SELECT id,code,name FROM learning_topics WHERE component=$1 AND is_active ORDER BY code",
        [job.component],
      );
      if (!topics.length) {
        await m.query(
          "UPDATE topic_tagging_jobs SET error_code='NO_ACTIVE_TOPICS',next_retry_at=now()+interval '1 hour' WHERE test_id=$1",
          [job.test_id],
        );
        return false;
      }
      try {
        const input = {
          component: job.component,
          context: job.part_contents,
          questions: questions.map((q: any) => ({
            questionId: q.id,
            part: q.part_number,
            position: q.position,
            groupKey: q.group_key,
            content: q.content,
            answer: q.correct_answer ?? q.sample_answer,
          })),
          topics: topics.map((t: any) => ({ code: t.code, name: t.name })),
        };
        if (JSON.stringify(input).length > 180000)
          throw new Error("TOPIC_INPUT_TOO_LARGE");
        const result = await this.generation.generate(
          {
            provider: this.config.get("PERSONALIZATION_PROVIDER", "gemini"),
            model:
              this.config.get("PERSONALIZATION_MODEL") ||
              this.config.get("CHATBOT_MODEL", "gemini-3.5-flash-lite"),
            system: TOPIC_SYSTEM,
            prompt: JSON.stringify(input),
            schema: TOPIC_SCHEMA,
            temperature: 0.2,
            maxOutputTokens: 8192,
            context: {
              userId: job.requested_by,
              purpose: "TOPIC_TAGGING",
              promptVersion: "topic-v1",
              errorCodePrefix: "TOPIC",
            },
          },
          AbortSignal.timeout(
            Number(this.config.get("PERSONALIZATION_AI_TIMEOUT_MS", 20000)),
          ),
        );
        const labels = validateTopicLabels(
          JSON.parse(result.text),
          questions,
          topics,
        );
        for (const label of labels)
          await m.query(
            `INSERT INTO question_topics(question_id,topic_id,weight,status,source,confidence,ai_request_id,question_hash)
          SELECT q.id,p.id,1,'SUGGESTED','AI',$3,$4,q.question_hash FROM topic_question_catalog q JOIN learning_topics p ON p.id=$2 AND p.is_active AND p.component=q.component
          WHERE q.id=$1 AND q.question_hash=$5
          ON CONFLICT(question_id,topic_id) DO UPDATE SET status='SUGGESTED',source='AI',confidence=EXCLUDED.confidence,ai_request_id=EXCLUDED.ai_request_id,question_hash=EXCLUDED.question_hash,reviewed_by=NULL,reviewed_at=NULL
          WHERE question_topics.question_hash IS DISTINCT FROM EXCLUDED.question_hash`,
            [
              label.question.id,
              label.topic.id,
              label.confidence,
              result.requestId,
              label.question.question_hash,
            ],
          );
        await m.query(
          "UPDATE topic_tagging_jobs SET error_code=NULL,retry_count=0 WHERE test_id=$1",
          [job.test_id],
        );
        return true;
      } catch (error) {
        const quotaError =
          error instanceof AiProviderError && error.reason === "QUOTA";
        const delay = quotaError
          ? Math.max(60000, error.retryAfterMs ?? 0)
          : [900000, 3600000, 14400000, 86400000][job.retry_count];
        await m.query(
          `UPDATE topic_tagging_jobs SET retry_count=retry_count+$2,error_code=$3,next_retry_at=now()+($4::text||' milliseconds')::interval WHERE test_id=$1`,
          [
            job.test_id,
            quotaError ? 0 : 1,
            quotaError ? "TOPIC_QUOTA" : "TOPIC_GENERATION_FAILED",
            delay,
          ],
        );
        return !quotaError;
      }
    });
  }
}
