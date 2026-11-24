import { AiRequestRecorder } from "../../ai-shared/ai-request-recorder.service";
import { Injectable, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DataSource } from "typeorm";
import { ApplicationError } from "../../../common/errors/application.error";
import { AuthUser } from "../../auth/types/auth-user.type";
import { JsonGenerationService } from "../../ai-shared/json-generation.service";
import { KnowledgeSearchService } from "../../retrieval/knowledge-search.service";
import { MistakeSourceService } from "./mistake-source.service";
import {
  explanationContext,
  explanationQuery,
} from "../ai/explanation-context";
import {
  EXPLAIN_PROMPT_VERSION,
  explanationSchema,
  EXPLAIN_SYSTEM,
  PERSONAL_EXPLAIN,
  ExplanationValidationError,
  plainText,
  validateExplanation,
  VI_MARKS,
} from "../ai/explanation.contract";

const unavailable = () =>
  new ApplicationError(
    "MISTAKE_SOURCE_UNAVAILABLE",
    "The submitted question is unavailable.",
    404,
  );
@Injectable()
export class MistakeExplanationService {
  private readonly pending = new Map<string, Promise<any>>();
  constructor(
    private readonly db: DataSource,
    private readonly config: ConfigService,
    private readonly mistakes: MistakeSourceService,
    private readonly knowledge: KnowledgeSearchService,
    private readonly generation: JsonGenerationService,
    @Optional() private readonly recorder?: AiRequestRecorder,
  ) {}
  get enabled() {
    return (
      String(this.config.get("PERSONALIZATION_RAG_ENABLED", false)) === "true"
    );
  }
  async explain(
    actor: AuthUser,
    attemptId: string,
    questionKey: string,
    locale: "vi" | "en",
  ) {
    if (!this.enabled) throw unavailable();
    const part = Number(/^p([1-4]):[qs]\d{1,4}$/.exec(questionKey)?.[1]);
    if (!part || !["vi", "en"].includes(locale))
      throw new ApplicationError(
        "MISTAKE_CONTEXT_INVALID",
        "Invalid explanation context.",
        400,
      );
    const [attempt] = await this.db.query(
      `SELECT id,purpose,component,snapshot_id,assessment_revision FROM test_attempts
      WHERE id=$1 AND student_id=$2 AND status='SUBMITTED' AND result->>'method'='OBJECTIVE'`,
      [attemptId, actor.id],
    );
    if (!attempt) throw unavailable();
    let detail: any;
    try {
      detail = await this.mistakes.details(
        actor,
        attemptId,
        attempt.purpose,
        part,
      );
    } catch {
      throw unavailable();
    }
    const item = detail.items.find((i: any) => i.key === questionKey);
    if (!item) throw unavailable();
    if (!["INCORRECT", "SKIPPED"].includes(item.outcome?.outcome))
      throw new ApplicationError(
        "MISTAKE_QUESTION_NOT_INCORRECT",
        "Choose an incorrect or skipped question.",
        400,
      );
    const key = JSON.stringify([
      actor.id,
      attemptId,
      attempt.assessment_revision,
      questionKey,
      locale,
    ]);
    const existing = this.pending.get(key);
    if (existing) return existing;
    const work = this.run(actor.id, attempt, item, detail, locale)
      .then(async (result) => {
        await this.stillCurrent(actor.id, attempt);
        return result;
      })
      .finally(() => this.pending.delete(key));
    this.pending.set(key, work);
    return work;
  }
  private async sources(ids: string[]) {
    if (!ids.length) return [];
    const rows = await this.db.query(
      `SELECT c.id AS "chunkId",d.title,c.content AS excerpt,d.source_uri AS url
      FROM knowledge_chunks c JOIN knowledge_documents d ON d.id=c.document_id
      WHERE c.id=ANY($1::uuid[]) AND d.status='READY' AND d.access_scope='LEARNER'
      AND d.metadata->>'examVariant' IN ('APTIS_ESOL_GENERAL','ENGLISH')
      AND NOT EXISTS(SELECT 1 FROM knowledge_documents newer WHERE newer.document_key=d.document_key AND newer.version_no>d.version_no AND newer.status='READY')`,
      [ids],
    );
    return ids
      .map((id) => rows.find((r: any) => r.chunkId === id))
      .filter(Boolean)
      .map((r: any) => ({
        chunkId: r.chunkId,
        title: plainText(r.title, 255),
        excerpt: plainText(r.excerpt, 500),
        url: this.safeUrl(r.url),
      }));
  }
  private safeUrl(value: unknown) {
    try {
      const url = new URL(String(value));
      return url.protocol === "https:" && !url.username && !url.password
        ? url.href
        : null;
    } catch {
      return null;
    }
  }
  private async stillCurrent(userId: string, attempt: any) {
    const rows = await this.db.query(
      `SELECT id FROM test_attempts WHERE id=$1 AND student_id=$2 AND status='SUBMITTED'
      AND assessment_revision=$3 AND result->>'method'='OBJECTIVE'`,
      [attempt.id, userId, attempt.assessment_revision],
    );
    if (!rows.length) throw unavailable();
  }
  private async run(
    userId: string,
    attempt: any,
    item: any,
    detail: any,
    locale: "vi" | "en",
  ) {
    const params = [
      userId,
      attempt.id,
      attempt.assessment_revision,
      item.key,
      locale,
      EXPLAIN_PROMPT_VERSION,
    ];
    const [cached] = await this.db.query(
      `SELECT * FROM mistake_explanations WHERE user_id=$1 AND attempt_id=$2 AND assessment_revision=$3
      AND question_key=$4 AND locale=$5 AND prompt_version=$6 AND (status='READY' OR created_at>now()-interval '15 minutes')`,
      params,
    );
    const context = explanationContext(detail, item);
    if (cached) {
      const sources = await this.sources(cached.chunk_ids);
      if (
        cached.status === "FALLBACK" ||
        (sources.length === cached.chunk_ids.length && sources.length > 0)
      ) {
        await this.stillCurrent(userId, attempt);
        return { ...cached.content, status: cached.status, sources };
      }
    }
    const fallback = (notice: string) => {
      const raw = plainText(
        item.explanation?.text ?? item.explanation ?? item.outcome?.explanation,
        600,
      );
      const compatible =
        locale === "vi" ? VI_MARKS.test(raw) : !VI_MARKS.test(raw);
      return {
        status: "FALLBACK",
        explanation:
          raw && compatible
            ? raw
            : locale === "vi"
              ? "Hãy đối chiếu đáp án đúng và phần giải thích của đề. Hiện chưa có giải thích chi tiết phù hợp."
              : "Compare the correct answer with the test explanation. A detailed explanation is not available yet.",
        ruleSummary: "",
        tip: "",
        sources: [],
        notice,
      };
    };
    if (!context.correctAnswer) return fallback("EXPLAIN_UNAVAILABLE");
    const [usage] = await this.db.query(
      `SELECT calls FROM mistake_explanation_usage WHERE user_id=$1 AND usage_day=(now() AT TIME ZONE 'UTC')::date`,
      [userId],
    );
    if (
      Number(usage?.calls ?? 0) >=
      Number(this.config.get("RAG_EXPLAIN_DAILY_LIMIT", 50))
    )
      return fallback("EXPLAIN_LIMIT_REACHED");
    const [question] = await this.db.query(
      `SELECT sq.question_id,COALESCE(array_agg(DISTINCT t.code) FILTER(WHERE t.code IS NOT NULL),'{}') topic_codes
      FROM topic_snapshot_questions sq LEFT JOIN question_topics l ON l.question_id=sq.question_id AND l.question_hash=sq.question_hash AND l.status='APPROVED'
      LEFT JOIN learning_topics t ON t.id=l.topic_id AND t.is_active
      WHERE sq.snapshot_id=$1 AND sq.question_key=$2 GROUP BY sq.question_id`,
      [attempt.snapshot_id, item.key],
    );
    const deadline = AbortSignal.timeout(60000);
    const filters = {
      component: attempt.component,
      part: detail.partNumber,
      usage: "LESSON",
      limit: 3,
      minSimilarity: Number(
        this.config.get("RAG_KNOWLEDGE_MIN_SIMILARITY", 0.7),
      ),
    };
    const query = explanationQuery(context);
    let chunks: any[];
    try {
      chunks = await this.knowledge.search(
        query,
        {
          ...filters,
          ...(question?.topic_codes?.length
            ? { topicCodes: question.topic_codes }
            : {}),
        },
        deadline,
      );
      if (!chunks.length && question?.topic_codes?.length)
        chunks = await this.knowledge.search(query, filters, deadline);
    } catch {
      return fallback("EXPLAIN_UNAVAILABLE");
    }
    if (!chunks.length) {
      const result = fallback("NO_LESSON");
      await this.save(params, attempt, result, [], null, {
        component: attempt.component,
        part: detail.partNumber,
        topics: question?.topic_codes ?? [],
        questionId: question?.question_id ?? null,
      });
      return result;
    }
    let issues: string[] = [];
    for (let retry = 0; retry < 2; retry++) {
      if (deadline.aborted) return fallback("EXPLAIN_UNAVAILABLE");
      // Atomic daily reservation includes failed calls and validation retries, across replicas.
      const reserved = await this.db.query(
        `INSERT INTO mistake_explanation_usage(user_id,usage_day,calls) VALUES($1,(now() AT TIME ZONE 'UTC')::date,1)
        ON CONFLICT(user_id,usage_day) DO UPDATE SET calls=mistake_explanation_usage.calls+1
        WHERE mistake_explanation_usage.calls<$2 RETURNING calls`,
        [userId, Number(this.config.get("RAG_EXPLAIN_DAILY_LIMIT", 50))],
      );
      if (!reserved.length) return fallback("EXPLAIN_LIMIT_REACHED");
      let generated;
      try {
        const provider = this.config.get<string>(
          "PERSONALIZATION_PROVIDER",
          "gemini",
        );
        generated = await this.generation.generate(
          {
            provider,
            model:
              this.config.get<string>("PERSONALIZATION_MODEL") ||
              (provider === "gemini"
                ? this.config.get<string>(
                    "CHATBOT_MODEL",
                    "gemini-3.5-flash-lite",
                  )
                : ""),
            system: EXPLAIN_SYSTEM,
            schema: explanationSchema(
              locale,
              context.correctAnswer,
              chunks.map((c) => c.chunkId),
            ),
            temperature: 0.2,
            maxOutputTokens: 4096,
            prompt: JSON.stringify({
              locale,
              ...context,
              lessons: chunks.map((c) => ({
                chunkId: c.chunkId,
                title: c.title,
                content: c.content,
              })),
              validationErrors: issues,
            }),
            context: {
              userId,
              purpose: PERSONAL_EXPLAIN,
              promptVersion: EXPLAIN_PROMPT_VERSION,
              errorCodePrefix: "PERSONAL_EXPLAIN",
            },
          },
          AbortSignal.any([
            deadline,
            AbortSignal.timeout(
              Number(this.config.get("PERSONALIZATION_AI_TIMEOUT_MS", 20000)),
            ),
          ]),
        );
      } catch {
        return fallback("EXPLAIN_UNAVAILABLE");
      }
      try {
        let parsed;
        try {
          parsed = JSON.parse(generated.text);
        } catch {
          throw new ExplanationValidationError(["INVALID_JSON"]);
        }
        const content = validateExplanation(
          parsed,
          locale,
          context.correctAnswer,
          chunks.map((c) => c.chunkId),
          context.alternatives,
        );
        await this.recorder?.validation(generated.requestId, retry + 1, true);
        const sources = await this.sources(content.citations);
        if (sources.length !== content.citations.length)
          return fallback("EXPLAIN_UNAVAILABLE");
        const result = {
          status: "READY",
          explanation: content.explanation,
          ruleSummary: content.ruleSummary,
          tip: content.tip,
          sources,
        };
        await this.save(
          params,
          attempt,
          result,
          content.citations,
          generated.requestId,
        );
        return result;
      } catch (error) {
        if (!(error instanceof ExplanationValidationError)) throw error;
        await this.recorder?.validation(
          generated.requestId,
          retry + 1,
          false,
          error.issues,
        );
        issues = error.issues;
      }
    }
    const result = fallback("EXPLAIN_UNAVAILABLE");
    await this.save(params, attempt, result, [], null);
    return result;
  }
  private async save(
    params: any[],
    attempt: any,
    result: any,
    ids: string[],
    requestId: string | null,
    gap?: any,
  ) {
    await this.db.transaction(async (m) => {
      const current = await m.query(
        `SELECT id FROM test_attempts WHERE id=$1 AND student_id=$2 AND assessment_revision=$3
        AND status='SUBMITTED' AND result->>'method'='OBJECTIVE' FOR SHARE`,
        [attempt.id, params[0], attempt.assessment_revision],
      );
      if (!current.length) throw unavailable();
      const { status, sources, ...content } = result;
      await m.query(
        `INSERT INTO mistake_explanations(user_id,attempt_id,assessment_revision,question_key,locale,prompt_version,status,content,chunk_ids,ai_request_id)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(user_id,attempt_id,assessment_revision,question_key,locale,prompt_version)
        DO UPDATE SET status=EXCLUDED.status,content=EXCLUDED.content,chunk_ids=EXCLUDED.chunk_ids,ai_request_id=EXCLUDED.ai_request_id,created_at=now()
        WHERE mistake_explanations.status<>'READY' OR EXCLUDED.status='READY'`,
        [...params, status, JSON.stringify(content), ids, requestId],
      );
      if (gap)
        await m.query(
          `INSERT INTO retrieval_gaps(user_id,feature,component,part_number,topic_codes,source_question_id)
        VALUES($1,'EXPLAIN',$2,$3,$4,$5)`,
          [params[0], gap.component, gap.part, gap.topics, gap.questionId],
        );
    });
  }
}
