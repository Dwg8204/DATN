import "reflect-metadata";
import "dotenv/config";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { DataSource } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { createDataSourceOptions } from "../src/database/data-source-options";
import { REGULAR_TEST_SQL } from "../src/features/ai-shared/placement";
import { QuestionSearchService } from "../src/features/retrieval/question-search.service";
import { RetrievalCandidatesService } from "../src/features/personalization/services/retrieval-candidates.service";
import { rankTestCandidates } from "../src/features/personalization/policies/rank-test-candidates";

async function main() {
  const labels = JSON.parse(
    readFileSync(resolve(__dirname, "../test/fixtures/rag-gold.json"), "utf8"),
  );
  const db = await new DataSource(
    createDataSourceOptions(process.env),
  ).initialize();
  const runner = db.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();
  try {
    // Synthetic attempts exist only inside this rolled-back transaction. No provider is constructed.
    const user = randomUUID();
    await runner.query(
      `INSERT INTO users(id,email,password_hash,first_name,last_name,role_id,status,timezone)
      SELECT $1,$2,'fixture','R3','Evaluation',id,'ACTIVE','Asia/Bangkok' FROM roles WHERE code='STUDENT'`,
      [user, `${user}@example.invalid`],
    );
    const tests =
      await runner.query(`SELECT t.id,t.title,t.component,t.part_number,t.purpose FROM tests t
      JOIN test_snapshots s ON s.id=t.published_snapshot_id
      WHERE t.status='PUBLISHED' AND t.archived_at IS NULL AND s.schema_version=1
      AND (t.purpose='PRACTICE' OR t.scope='FULL_SKILL') AND ${REGULAR_TEST_SQL} ORDER BY t.id`);
    const questionTests =
      await runner.query(`SELECT q.id,q.test_id FROM topic_question_catalog q JOIN tests t ON t.id=q.test_id
      JOIN topic_snapshot_questions sq ON sq.snapshot_id=t.published_snapshot_id AND sq.question_id=q.id AND sq.question_hash=q.question_hash`);
    const attempts = new Map<string, string>(),
      mapped: any[] = [];
    for (const sample of labels.samples) {
      const [current] = await runner.query(
        `SELECT t.published_snapshot_id,sq.question_key FROM tests t
        JOIN topic_snapshot_questions sq ON sq.snapshot_id=t.published_snapshot_id
        WHERE t.id=$1 AND sq.question_id=$2 AND sq.question_hash=$3`,
        [sample.testId, sample.questionId, sample.questionHash],
      );
      if (!current) continue;
      let attemptId = attempts.get(sample.testId);
      if (!attemptId) {
        const [a] = await runner.query(
          `INSERT INTO test_attempts(student_id,snapshot_id,component,scope,part_number,status,purpose,result)
          SELECT $1,t.published_snapshot_id,t.component,t.scope,t.part_number,'SUBMITTED',t.purpose,'{"method":"OBJECTIVE"}' FROM tests t WHERE t.id=$2 RETURNING id`,
          [user, sample.testId],
        );
        attemptId = a.id;
        attempts.set(sample.testId, attemptId!);
      }
      mapped.push({ ...sample, attemptId, questionKey: current.question_key });
    }
    const search = new QuestionSearchService(db);
    const similar = search.similar.bind(search);
    const cache = new Map<string, Awaited<ReturnType<typeof similar>>>();
    search.similar = async (vectors, options, manager) => {
      const key = JSON.stringify([vectors, options]);
      if (!cache.has(key)) cache.set(key, await similar(vectors, options, manager));
      return cache.get(key)!;
    };
    const service = new RetrievalCandidatesService(
      new ConfigService({ PERSONALIZATION_RAG_ENABLED: true }),
      search,
    );
    const rows: Array<{
      sampleId: string;
      component: string;
      cohort: string[];
      labelledPairs: number;
      selectedTestId: string | null;
      tier: number | null;
      ragLabelledMatches: number;
      randomMean: number;
      cohortRagMatches: number;
      cohortRandomMean: number;
      randomSeeds: number[];
      evaluationEligible: boolean;
    }> = [];
    for (const sample of mapped) {
      const peers = mapped.filter(
        (s) => s.component === sample.component && s.id !== sample.id,
      );
      const cohort = [sample, ...peers.slice(0, 4)];
      const snapshot: any = {
        mistakes: {
          references: cohort.map((s) => ({
            attemptId: s.attemptId,
            questionKey: s.questionKey,
            component: s.component,
          })),
        },
      };
      const matches = await service.rankTests(runner.manager, user, snapshot);
      const allowed = new Set(
        (sample.review?.pairs ?? [])
          .filter((p: any) =>
            ["NEAR_DUPLICATE", "STRATEGY_RELEVANT"].includes(p.status),
          )
          .map((p: any) => p.questionId),
      );
      const cohortAllowed = new Set(
        cohort.flatMap((s) =>
          (s.review?.pairs ?? [])
            .filter((p: any) =>
              ["NEAR_DUPLICATE", "STRATEGY_RELEVANT"].includes(p.status),
            )
            .map((p: any) => p.questionId),
        ),
      );
      const cohortCount = (id: string) =>
        questionTests.filter(
          (q: any) => q.test_id === id && cohortAllowed.has(q.id),
        ).length;
      const count = (id: string) =>
        questionTests.filter((q: any) => q.test_id === id && allowed.has(q.id))
          .length;
      const options = tests
        .filter((t: any) => t.component === sample.component)
        .map((t: any) => ({
          ...t,
          used: attempts.has(t.id),
          random_seed: createHash("md5")
            .update(`r3-evaluation:1:${t.id}`)
            .digest("hex"),
        }));
      const weak = [{ skill: sample.component, part: sample.part }];
      const winner = rankTestCandidates(
        options,
        [sample.component],
        weak,
        matches,
      )[0];
      const random = [],
        cohortRandom = [];
      for (let seed = 1; seed <= 20; seed++) {
        const shuffled = options.map((t: any) => ({
          ...t,
          random_seed: createHash("md5")
            .update(`r3-evaluation:${seed}:${t.id}`)
            .digest("hex"),
        }));
        const first = rankTestCandidates(shuffled, [sample.component], weak)[0];
        random.push(first ? count(first.id) : 0);
        cohortRandom.push(first ? cohortCount(first.id) : 0);
      }
      rows.push({
        sampleId: sample.id,
        component: sample.component,
        cohort: cohort.map((s) => s.id),
        labelledPairs: allowed.size,
        selectedTestId: winner?.id ?? null,
        tier: winner ? (matches.get(winner.id)?.tier ?? 3) : null,
        ragLabelledMatches: winner ? count(winner.id) : 0,
        randomMean: random.reduce((a, b) => a + b, 0) / 20,
        cohortRagMatches: winner ? cohortCount(winner.id) : 0,
        cohortRandomMean: cohortRandom.reduce((a, b) => a + b, 0) / 20,
        randomSeeds: random,
        evaluationEligible: false,
      });
    }
    const eligible = rows.filter((r) => r.labelledPairs > 0);
    const mean = (
      rs: typeof rows,
      key:
        | "ragLabelledMatches"
        | "randomMean"
        | "cohortRagMatches"
        | "cohortRandomMean",
    ) => (rs.length ? rs.reduce((a, r) => a + r[key], 0) / rs.length : 0);
    const report = {
      date: "2026-11-12",
      labelHash: createHash("sha256")
        .update(JSON.stringify(labels))
        .digest("hex"),
      method:
        "Each R0 source plus four same-skill public mistakes; compare top ranked test with legacy weak-Part/used/MD5 ordering over 20 seeds. Report both central-source and whole-cohort unique reviewed NEAR_DUPLICATE/STRATEGY_RELEVANT pairs in selected test.",
      limitations: [
        "Development diagnostic only: all R0 samples remain evaluationEligible=false.",
        "Labels are sparse and not independent gold; unlabelled matches are not necessarily wrong.",
        "Listening AUDIO_UNVERIFIED and REJECTED pairs excluded; near duplicates retained and disclosed.",
        "Synthetic attempts roll back; all vectors already stored; no embedding or generation API calls.",
      ],
      summary: {
        cohort: {
          rag: mean(rows, "cohortRagMatches"),
          random: mean(rows, "cohortRandomMean"),
        },
        samples: rows.length,
        withReviewedPairs: eligible.length,
        all: {
          rag: mean(rows, "ragLabelledMatches"),
          random: mean(rows, "randomMean"),
        },
        withReviewedPairsOnly: {
          rag: mean(eligible, "ragLabelledMatches"),
          random: mean(eligible, "randomMean"),
        },
      },
      rows,
    };
    const out =
      process.env.RAG_BASELINE_OUTPUT_DIR ??
      resolve(__dirname, "../test/fixtures");
    mkdirSync(out, { recursive: true });
    writeFileSync(
      resolve(out, "rag-r3-plan-baseline.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(JSON.stringify(report.summary));
  } finally {
    await runner.rollbackTransaction();
    await runner.release();
    await db.destroy();
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
