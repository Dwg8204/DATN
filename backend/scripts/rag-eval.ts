import "reflect-metadata";
import "dotenv/config";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { DataSource } from "typeorm";
import { createDataSourceOptions } from "../src/database/data-source-options";
import { EMBEDDING_MODEL } from "../src/features/retrieval/embedding.service";
import {
  QUESTION_TEXT_VERSION,
  buildQuestionText,
} from "../src/features/retrieval/question-text";
import {
  knowledgeWhere,
  reciprocalRankFusion,
} from "../src/features/retrieval/hybrid-search";
import { REGULAR_TEST_SQL } from "../src/features/ai-shared/placement";
import {
  rankingMetrics,
  thresholdSweep,
  chooseThreshold,
} from "../src/features/retrieval/rag-eval-metrics";
const root = resolve(__dirname, ".."),
  out = process.env.RAG_EVAL_OUTPUT_DIR || resolve(root, "../docs");
const read = (p: string) => JSON.parse(readFileSync(resolve(root, p), "utf8"));
const hash = (v: unknown) =>
  createHash("sha256").update(JSON.stringify(v)).digest("hex");
function clean(v: any): any {
  return Array.isArray(v)
    ? v.map(clean)
    : v && typeof v === "object"
      ? Object.fromEntries(
          Object.entries(v)
            .filter(([k]) => !/(answer|explanation|correct|audio|url)/i.test(k))
            .map(([k, x]) => [k, clean(x)]),
        )
      : v;
}
const official = (s: any) =>
  s.evaluationEligible === true && s.review?.humanReviewed === true;
async function main() {
  mkdirSync(out, { recursive: true });
  const gold = read("test/fixtures/rag-gold.json"),
    labels = read("test/fixtures/rag-r1-baseline-labels.json"),
    questions = read("test/fixtures/rag-r0-review-questions.json");
  const cachePath = resolve(
      root,
      "test/fixtures/rag-r1-query-vectors.local.json",
    ),
    cache = existsSync(cachePath)
      ? JSON.parse(readFileSync(cachePath, "utf8"))
      : {};
  const db = await new DataSource({
    ...createDataSourceOptions(),
    logging: false,
  }).initialize();
  const results: any[] = [],
    sweepRows: any = { knowledge: [], questions: [] },
    skipped: any[] = [];
  try {
    for (const sample of gold.samples) {
      const q = questions.find((r: any) => r.id === sample.questionId),
        label = labels.samples.find((r: any) => r.id === sample.id);
      const [source] = await db.query(
        `SELECT e.*,e.embedding::text vector FROM question_embeddings e JOIN topic_question_catalog q ON q.id=e.question_id AND q.question_hash=e.question_hash JOIN tests t ON t.id=e.test_id JOIN topic_snapshot_questions sq ON sq.snapshot_id=t.published_snapshot_id AND sq.question_id=e.question_id AND sq.question_hash=e.question_hash WHERE e.question_id=$1 AND e.question_hash=$2 AND e.embedding_model=$3 AND e.embedding_version=$4 AND t.status='PUBLISHED' AND t.archived_at IS NULL`,
        [
          sample.questionId,
          sample.questionHash,
          EMBEDDING_MODEL,
          QUESTION_TEXT_VERSION,
        ],
      );
      if (!q || !source) {
        skipped.push({ id: sample.id, reason: "STALE_OR_MISSING_SOURCE" });
        continue;
      }
      const query = buildQuestionText({
        ...q,
        content: clean(q.content),
        part_contents: clean(q.part_contents),
        correct_answer: undefined,
        sample_answer: undefined,
        explanation: undefined,
      });
      const vector =
        cache[hash({ query, model: EMBEDDING_MODEL, task: "RETRIEVAL_QUERY" })];
      for (const corpus of ["knowledge", "questions"]) {
        const args: any[] =
          corpus === "knowledge"
            ? [query, JSON.stringify(vector ?? null), EMBEDDING_MODEL]
            : [
                query,
                source.vector,
                EMBEDDING_MODEL,
                QUESTION_TEXT_VERSION,
                sample.component,
                sample.testId,
              ];
        const base =
          corpus === "knowledge"
            ? `FROM knowledge_chunks c JOIN knowledge_documents d ON d.id=c.document_id WHERE ${knowledgeWhere({ usage: "LESSON" }, args)} AND c.embedding_model=$3 AND c.embedding IS NOT NULL`
            : `FROM question_embeddings e JOIN topic_question_catalog q ON q.id=e.question_id AND q.question_hash=e.question_hash JOIN tests t ON t.id=e.test_id JOIN topic_snapshot_questions sq ON sq.snapshot_id=t.published_snapshot_id AND sq.question_id=e.question_id AND sq.question_hash=e.question_hash WHERE e.embedding_model=$3 AND e.embedding_version=$4 AND e.component=$5 AND e.test_id<>$6 AND t.status='PUBLISHED' AND t.archived_at IS NULL AND ${REGULAR_TEST_SQL} AND (t.purpose='PRACTICE' OR t.scope='FULL_SKILL') AND EXISTS(SELECT 1 FROM test_snapshots ps WHERE ps.id=t.published_snapshot_id AND ps.schema_version=1)`;
        const id = corpus === "knowledge" ? "c.id" : "e.question_id",
          key =
            corpus === "knowledge" ? "d.document_key" : "e.question_id::text",
          prefix = corpus === "knowledge" ? "c" : "e";
        const semantic =
          corpus === "knowledge" && !vector
            ? null
            : await db.query(
                `SELECT ${id} id,${key} key,(1-(${prefix}.embedding <=> $2::vector))::float score ${base} AND ($1::text IS NULL OR $1::text IS NOT NULL) ORDER BY ${prefix}.embedding <=> $2::vector,${id}`,
                args,
              );
        // The unused vector parameter still needs a type in keyword-only SQL.
        const lexical = await db.query(
          `SELECT ${id} id,${key} key ${base} AND ($2::text IS NULL OR $2::text IS NOT NULL) AND ${prefix}.search_vector @@ plainto_tsquery('simple',$1) ORDER BY ts_rank_cd(${prefix}.search_vector,plainto_tsquery('simple',$1)) DESC,${id}`,
          args,
        );
        const positives = new Set<string>(
          corpus === "knowledge"
            ? [
                label?.documentKey ?? sample.documentKey,
                ...(label?.judgements ?? [])
                  .filter((p: any) => p.relevant === true)
                  .map((p: any) => p.documentKey),
              ]
            : (sample.review?.pairs ?? [])
                .filter((p: any) =>
                  ["NEAR_DUPLICATE", "STRATEGY_RELEVANT"].includes(p.status),
                )
                .map((p: any) => p.questionId),
        );
        const negatives = new Set<string>(
          corpus === "knowledge"
            ? (label?.judgements ?? [])
                .filter((p: any) => p.relevant === false)
                .map((p: any) => p.documentKey)
            : (sample.review?.pairs ?? [])
                .filter((p: any) => p.status === "REJECTED")
                .map((p: any) => p.questionId),
        );
        if ([...negatives].some((key) => positives.has(key)))
          throw Error("CONFLICTING_RELEVANCE_LABELS");
        const modes: any = {
          keyword: lexical,
          vector: semantic,
          rrf: semantic
            ? reciprocalRankFusion(
                [semantic.slice(0, 50), lexical.slice(0, 50)],
                100,
              )
            : null,
        };
        for (const [mode, rows] of Object.entries(modes))
          results.push({
            sampleId: sample.id,
            component: sample.component,
            corpus,
            mode,
            official:
              official(sample) &&
              (corpus === "questions" || labels.review?.humanReviewed === true),
            labelledRelevant: positives.size,
            available: rows !== null,
            ...(rows
              ? rankingMetrics(
                  (rows as any[]).map((r) => r.key),
                  positives,
                )
              : { recall1: null, recall3: null, recall5: null, mrr: null }),
          });
        if (!semantic)
          skipped.push({ id: sample.id, reason: "MISSING_QUERY_VECTOR" });
        for (const row of (semantic ?? [])
          .filter(
            (r: any, i: number, all: any[]) =>
              corpus !== "knowledge" ||
              all.findIndex((x: any) => x.key === r.key) === i,
          )
          .slice(0, 10))
          sweepRows[corpus].push({
            score: row.score,
            label: positives.has(row.key)
              ? true
              : negatives.has(row.key)
                ? false
                : null,
            official:
              official(sample) &&
              (corpus === "questions" || labels.review?.humanReviewed === true),
          });
      }
    }
    const metrics: any[] = [];
    for (const corpus of ["knowledge", "questions"])
      for (const mode of ["keyword", "vector", "rrf"])
        for (const component of [
          "ALL",
          "GRAMMAR_VOCAB",
          "READING",
          "LISTENING",
          "WRITING",
          "SPEAKING",
        ]) {
          const rows = results.filter(
            (r) =>
              r.corpus === corpus &&
              r.mode === mode &&
              (component === "ALL" || r.component === component) &&
              r.available &&
              r.labelledRelevant > 0,
          );
          metrics.push({
            corpus,
            mode,
            component,
            n: rows.length,
            officialN: rows.filter((r) => r.official).length,
            ...Object.fromEntries(
              ["recall1", "recall3", "recall5", "mrr"].map((k) => [
                k,
                rows.length
                  ? rows.reduce((sum, r) => sum + r[k], 0) / rows.length
                  : null,
              ]),
            ),
          });
        }
    const thresholds = Object.fromEntries(
      ["knowledge", "questions"].map((c) => [c, thresholdSweep(sweepRows[c])]),
    );
    const recommendations = Object.fromEntries(
      Object.entries(thresholds).map(([k, v]) => [k, chooseThreshold(v)]),
    );
    const generation =
      await db.query(`SELECT purpose,count(*)::int requests,count(*) FILTER(WHERE status='COMPLETED')::int provider_completed,count(*) FILTER(WHERE config_snapshot->'validation' IS NULL)::int validation_unknown,
   count(*) FILTER(WHERE config_snapshot->'validation'->>'attempt'='1')::int initial_validated,
   count(*) FILTER(WHERE config_snapshot->'validation'->>'attempt'='1' AND config_snapshot->'validation'->>'valid'='true')::int initial_passed
   FROM ai_requests WHERE purpose IN ('PERSONAL_EXPLAIN','PERSONAL_WEEKLY','PERSONAL_FINAL') GROUP BY purpose ORDER BY purpose`);
    const completion = await db.query(
      `SELECT retrieval->>'tier' tier,count(*)::int items,count(*) FILTER(WHERE done_count>=target_count)::int completed FROM study_plan_items WHERE retrieval->>'tier' IN ('1','3') GROUP BY retrieval->>'tier' ORDER BY tier`,
    );
    const gaps = await db.query(
      `WITH g AS (SELECT date_trunc('week',created_at AT TIME ZONE 'UTC')::date week,count(*)::int events,count(DISTINCT user_id)::int learners FROM retrieval_gaps GROUP BY 1), a AS (SELECT date_trunc('week',submitted_at AT TIME ZONE 'UTC')::date week,count(*)::int submissions FROM test_attempts WHERE status='SUBMITTED' AND submitted_at IS NOT NULL GROUP BY 1) SELECT g.*,COALESCE(a.submissions,0) submissions FROM g LEFT JOIN a USING(week) ORDER BY week`,
    );
    const plan = spawnSync(
      process.execPath,
      ["-r", "ts-node/register", resolve(__dirname, "rag-plan-baseline.ts")],
      {
        env: { ...process.env, RAG_BASELINE_OUTPUT_DIR: out },
        encoding: "utf8",
      },
    );
    if (plan.status !== 0) throw Error("PLAN_EVALUATION_FAILED");
    const planResult = JSON.parse(
      readFileSync(resolve(out, "rag-r3-plan-baseline.json"), "utf8"),
    );
    const explanations = read("test/fixtures/rag-r2-explanation-eval.json");
    const reportFile =
      process.env.RAG_REPORT_REVIEW_SOURCE ||
      resolve(root, "../docs/rag-r5-smoke.json");
    const reports = existsSync(reportFile)
      ? JSON.parse(readFileSync(reportFile, "utf8")).results
      : [];
    const reviewPath = resolve(out, "rag-r7-human-review.json");
    if (!existsSync(reviewPath))
      writeFileSync(
        reviewPath,
        JSON.stringify(
          {
            rubric: {
              scale: "1 poor; 2 weak; 3 acceptable; 4 good; 5 excellent",
              dimensions: ["knowledge", "grounding", "clarity"],
            },
            reviewer: null,
            humanReviewed: false,
            items: [
              ...explanations.results.map((r: any) => ({
                id: r.id,
                kind: "EXPLANATION",
                context: r.context,
                content: r.content,
                sources: r.sources,
                knowledge: null,
                grounding: null,
                clarity: null,
                note: "",
              })),
              ...reports.map((r: any) => ({
                id: "report-" + r.case,
                kind: r.kind,
                generationStatus: r.status,
                content: r.content ?? (r.raw ? JSON.parse(r.raw) : null),
                sourcesNote:
                  "Synthetic fixture lesson: on + weekdays, at + time, in + month/year. Review counts against backend/scripts/rag-report-smoke.ts. Rejected outputs are not published.",
                knowledge: null,
                grounding: null,
                clarity: null,
                note: "",
              })),
            ],
          },
          null,
          2,
        ),
      );
    const review = JSON.parse(readFileSync(reviewPath, "utf8")),
      reviewed = review.items.filter((r: any) =>
        ["knowledge", "grounding", "clarity"].every(
          (k) => Number.isInteger(r[k]) && r[k] >= 1 && r[k] <= 5,
        ),
      );
    const envPath = resolve(root, ".env.example");
    let env = readFileSync(envPath, "utf8");
    if (process.argv.includes("--apply-thresholds")) {
      if (
        skipped.length ||
        Object.values(recommendations).some((v) => v === null)
      )
        throw Error(
          "THRESHOLD_REVIEW_REQUIRED: no fully judged, independently reviewed threshold qualifies",
        );
      env = env
        .replace(
          /^RAG_QUESTION_MIN_SIMILARITY=.+$/m,
          `RAG_QUESTION_MIN_SIMILARITY=${recommendations.questions}`,
        )
        .replace(
          /^RAG_KNOWLEDGE_MIN_SIMILARITY=.+$/m,
          `RAG_KNOWLEDGE_MIN_SIMILARITY=${recommendations.knowledge}`,
        )
        .replace(
          /^# R7: retained defaults;.*$/m,
          "# R7: thresholds selected from reviewed evaluation; see docs/PERSONALIZATION_RAG_EVAL.md.",
        );
      writeFileSync(envPath, env);
    }
    const configured = {
      questions: Number(env.match(/^RAG_QUESTION_MIN_SIMILARITY=(.+)$/m)?.[1]),
      knowledge: Number(env.match(/^RAG_KNOWLEDGE_MIN_SIMILARITY=(.+)$/m)?.[1]),
    };
    const report = {
      generatedAt: new Date().toISOString(),
      labelHash: hash(gold),
      status:
        gold.samples.every(official) &&
        review.humanReviewed === true &&
        typeof review.reviewer === "string" &&
        review.reviewer.trim().length > 0 &&
        reviewed.length === 40 &&
        new Set(reviewed.map((r: any) => r.id)).size === 40 &&
        reviewed.filter((r: any) => r.kind === "EXPLANATION").length === 30 &&
        skipped.length === 0 &&
        Object.entries(recommendations).every(
          ([k, v]) =>
            v !== null && configured[k as keyof typeof configured] === v,
        )
          ? "REVIEWED"
          : "REVIEW_REQUIRED",
      metrics,
      thresholds,
      recommendations,
      configured,
      skipped,
      generation,
      completion,
      gaps,
      plan: planResult.summary,
      manualReview: {
        required: 40,
        scored: reviewed.length,
        humanReviewed: review.humanReviewed,
      },
      results,
    };
    writeFileSync(
      resolve(out, "rag-r7-evaluation.json"),
      JSON.stringify(report, null, 2),
    );
    const fmt = (v: any) =>
      v === null || v === undefined
        ? "N/A"
        : typeof v === "number"
          ? Number(v.toFixed(4))
          : v;
    const table = (headers: string[], rows: any[][]) =>
      "| " +
      headers.join(" | ") +
      " |\n| " +
      headers.map(() => "---").join(" | ") +
      " |\n" +
      rows.map((r) => "| " + r.map(fmt).join(" | ") + " |").join("\n") +
      "\n";
    const text = [
      "# RAG R7 — Đánh giá và đối chiếu",
      "",
      "Trạng thái: **" +
        report.status +
        "**. Không gọi provider; dùng vector hiện có và truy vấn DB. Bộ R0 có " +
        gold.samples.filter(official).length +
        "/60 mẫu đủ điều kiện chính thức. Không biến nhãn AI thành gold giáo viên.",
      "",
      "## Truy xuất (chẩn đoán phát triển, chưa phải nghiệm thu độc lập)",
      "Recall = số relevant truy xuất / tổng relevant đã gán nhãn; không gọi hit-rate là Recall cho nhiều relevant. MRR vector/keyword theo toàn thứ hạng khả dụng; RRF chỉ hợp nhất top50 mỗi nhánh. Đơn vị knowledge là document (loại chunk trùng); questions là question. Loại đề nguồn; nhãn câu hỏi chưa đầy đủ, unlabelled không được coi là sai. Listening chưa xác minh audio. Writing/Speaking không có mẫu R0 => N/A.",
      table(
        [
          "Kho",
          "Cách",
          "Kỹ năng",
          "N",
          "Official N",
          "R@1",
          "R@3",
          "R@5",
          "MRR",
        ],
        metrics.map((r) => [
          r.corpus,
          r.mode,
          r.component,
          r.n,
          r.officialN,
          r.recall1,
          r.recall3,
          r.recall5,
          r.mrr,
        ]),
      ),
      "## Quét ngưỡng (top10 vector mỗi query)",
      ...Object.entries(thresholds).flatMap(([k, rs]) => [
        "### " + k,
        table(
          [
            "Ngưỡng",
            "Retrieved",
            "Judged",
            "Unknown",
            "Precision trên judged",
            "Đủ điều kiện chốt",
          ],
          rs.map((r) => [
            r.threshold,
            r.retrieved,
            r.judged,
            r.unknown,
            r.precision,
            r.eligible,
          ]),
        ),
      ]),
      "Chỉ chốt khi nhãn người duyệt hợp lệ và toàn bộ kết quả tại ngưỡng được đánh giá. Không dùng precision trên một phần judged để tự nâng chất lượng. Đề xuất: " +
        JSON.stringify(recommendations) +
        ". .env.example hiện tại: " +
        JSON.stringify(configured) +
        ". Nếu không có ngưỡng đủ điều kiện, giữ cấu hình cũ; không tuyên bố đó là tối ưu.",
      "## Chọn đề R3 so với cách cũ (20 seed)",
      "Cùng luồng R3 với nguồn + 4 lỗi cùng kỹ năng; bảng tách central source và toàn nhóm. Nhãn NEAR_DUPLICATE/STRATEGY_RELEVANT chỉ là chẩn đoán; bỏ REJECTED/AUDIO_UNVERIFIED. Không khẳng định RAG tốt hơn nếu kết quả không cho thấy điều đó.",
      table(
        ["Đơn vị", "RAG", "Cách cũ"],
        [
          [
            "Nguồn trung tâm",
            planResult.summary.all.rag,
            planResult.summary.all.random,
          ],
          [
            "Toàn nhóm",
            planResult.summary.cohort.rag,
            planResult.summary.cohort.random,
          ],
        ],
      ),
      "## Sinh văn bản — từ ai_requests",
      "COMPLETED chỉ là provider thành công, không phải validator pass. Validation mới ghi attempt=1/2 cho lượt đầu/sửa trong một chu kỳ sinh; retry worker ở chu kỳ sau tính riêng. Request cũ không có metadata giữ UNKNOWN, không hồi tố. Tỷ lệ sau đây chỉ tính initial đã có kết quả validation; lỗi provider được phản ánh riêng qua requests/provider_completed.",
      table(
        [
          "Purpose",
          "Requests",
          "Provider completed",
          "Validation unknown",
          "Initial validated",
          "Initial passed",
          "Pass rate",
        ],
        generation.map((r: any) => [
          r.purpose,
          r.requests,
          r.provider_completed,
          r.validation_unknown,
          r.initial_validated,
          r.initial_passed,
          r.initial_validated ? r.initial_passed / r.initial_validated : null,
        ]),
      ),
      "## Chấm tay 30 giải thích + 10 báo cáo (thang 1–5)",
      "Bộ rà soát: rag-r7-human-review.json. Đã chấm " +
        reviewed.length +
        "/40; humanReviewed=" +
        review.humanReviewed +
        ". Chưa có điểm giáo viên thì để N/A, không quy đổi tự động điểm AI 0–2 của R2.",
      table(
        ["Loại", "Cần", "Đã chấm", "Đúng kiến thức", "Bám nguồn", "Dễ hiểu"],
        ["EXPLANATION", "REPORT"].map((kind) => {
          const rows = reviewed.filter((r: any) =>
            kind === "EXPLANATION"
              ? r.kind === "EXPLANATION"
              : r.kind !== "EXPLANATION",
          );
          return [
            kind,
            kind === "EXPLANATION" ? 30 : 10,
            rows.length,
            ...["knowledge", "grounding", "clarity"].map((k) =>
              rows.length
                ? rows.reduce((n: number, r: any) => n + r[k], 0) / rows.length
                : null,
            ),
          ];
        }),
      ),
      "## Vận hành (quan sát, không có đối chứng)",
      table(
        ["Tier", "Items", "Completed", "Completion rate"],
        ["1", "3"].map((t) => {
          const r = completion.find((v: any) => v.tier === t);
          return [
            t,
            r?.items ?? 0,
            r?.completed ?? 0,
            r?.items ? r.completed / r.items : null,
          ];
        }),
      ),
      "Chưa ghi tổng số lượt retrieval nên không thể suy ra gap/request rate. Bảng dùng events/submissions làm proxy công khai, có thể >100%; không phải xác suất truy xuất thất bại. Retention chỉ giữ khoảng 180 ngày.",
      table(
        [
          "Tuần UTC",
          "Gap events",
          "Learners",
          "Submissions",
          "Events/submission",
        ],
        gaps.map((r: any) => [
          String(r.week).slice(0, 10),
          r.events,
          r.learners,
          r.submissions,
          r.submissions ? r.events / r.submissions : null,
        ]),
      ),
      "## Phần cần hoàn tất để nghiệm thu R7",
      `- Duyệt bộ nhãn độc lập (đặc biệt các cặp câu và audio), bổ sung judgement cho kết quả trả về và chấm 40 mẫu 1–5.
- Chạy lại rag:eval, chỉ cập nhật ngưỡng khi có precision >=0.8 trên tập đủ điều kiện.
- Kết quả chức năng R0–R6 nằm trong PERSONALIZATION_RAG_R0_R7_CHECK.md.`,
    ];
    writeFileSync(
      resolve(out, "PERSONALIZATION_RAG_EVAL.md"),
      text.join("\n\n") + "\n",
    );
    console.log(
      JSON.stringify({
        status: report.status,
        samples: gold.samples.length,
        rankings: results.length,
        skipped: skipped.length,
        recommendations,
        output: out,
      }),
    );
  } finally {
    await db.destroy();
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
