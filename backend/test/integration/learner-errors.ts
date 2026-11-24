import "reflect-metadata";
import * as assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { ConfigService } from "@nestjs/config";
import { withPersonalizationDatabase } from "./personalization-fixture";
import { AddLearnerErrorChunks1760000027000 } from "../../src/database/migrations/1760000027000-AddLearnerErrorChunks";
import { LearnerErrorsWorker } from "../../src/features/retrieval/learner-errors.worker";
import { ErrorPatternsService } from "../../src/features/personalization/services/error-patterns.service";
import { LearnerKnowledgeService } from "../../src/features/retrieval/learner-knowledge.service";
import { LearningGoalsRepository } from "../../src/features/personalization/repositories/learning-goals.repository";
import { LearningInsightsRepository } from "../../src/features/personalization/repositories/learning-insights.repository";
import { ReportJobsService } from "../../src/features/personalization/services/report-jobs.service";
import { ReportsService } from "../../src/features/personalization/services/reports.service";
import { InsightContextService } from "../../src/features/personalization/services/insight-context.service";
import { SnapshotService } from "../../src/features/personalization/services/snapshot.service";
import { reportSnapshot } from "../../src/features/personalization/ai/report.contract";
import { QUESTION_TEXT_VERSION } from "../../src/features/retrieval/question-text";
import { EMBEDDING_MODEL } from "../../src/features/retrieval/embedding.service";
import { AiProviderError } from "../../src/features/ai-shared/ai-provider.error";
withPersonalizationDatabase(async (db, alice, bob) => {
  const migration = new AddLearnerErrorChunks1760000027000(),
    runner = db.createQueryRunner();
  await runner.connect();
  await migration.down(runner);
  await migration.up(runner);
  await runner.release();
  const config = new ConfigService({
      PERSONALIZATION_RAG_ENABLED: true,
      RAG_KNOWLEDGE_MIN_SIMILARITY: 0.9,
    }),
    vector = JSON.stringify([1, ...Array(767).fill(0)]);
  let calls = 0,
    fail = false;
  const embed = {
    embedMany: async (texts: string[]) => {
      calls++;
      if (fail) throw new AiProviderError("QUOTA");
      assert.ok(texts.every((t) => !t.includes("PRIVATE")));
      return texts.map(() => JSON.parse(vector));
    },
  };
  const worker = new LearnerErrorsWorker(db, embed as any, config),
    patterns = new ErrorPatternsService(config),
    knowledge = new LearnerKnowledgeService(db);
  const test = randomUUID(),
    snapshot = randomUUID(),
    question = randomUUID(),
    doc = randomUUID(),
    chunk = randomUUID();
  await db.query(
    `INSERT INTO tests(id,created_by,title,component,scope,part_number,purpose) VALUES($1,$2,'R5 synthetic','READING','PART',1,'PRACTICE')`,
    [test, alice],
  );
  await db.query(
    `INSERT INTO questions(id,test_id,part_number,position,question_type,content,correct_answer) VALUES($1,$2,1,1,'READING_GAP_CHOICE','{"text":"Meet on Monday","options":["on","in"]}','{"answer":"on"}')`,
    [question, test],
  );
  await db.query(
    `INSERT INTO test_snapshots(id,test_id,version,schema_version,snapshot,content_hash) VALUES($1,$2,1,1,'{}','synthetic')`,
    [snapshot, test],
  );
  const [sq] = await db.query(
    "SELECT * FROM topic_snapshot_questions WHERE snapshot_id=$1",
    [snapshot],
  );
  assert.ok(sq);
  await db.query(
    `INSERT INTO question_embeddings(question_id,question_hash,test_id,component,part_number,question_key,content_text,search_vector,embedding,embedding_model,embedding_version) VALUES($1,$2,$3,'READING',1,$4,'Meet on Monday',to_tsvector('simple','Monday'),$5::vector,$6,$7)`,
    [
      question,
      sq.question_hash,
      test,
      sq.question_key,
      vector,
      EMBEDDING_MODEL,
      QUESTION_TEXT_VERSION,
    ],
  );
  await db.query(
    `INSERT INTO knowledge_documents(id,document_key,version_no,title,document_type,component,language_code,access_scope,status,content_hash,rights_note,created_by,metadata,usage) VALUES($1,'r5-test',1,'Days','AUTHORED_SUMMARY','READING','vi','LEARNER','READY','hash','fixture',$2,'{"examVariant":"ENGLISH"}','LESSON')`,
    [doc, alice],
  );
  await db.query(
    `INSERT INTO knowledge_chunks(id,document_id,chunk_index,content,content_hash,search_vector,embedding,embedding_model) VALUES($1,$2,0,'Use on with weekdays.','hash',to_tsvector('simple','on'),$3::vector,$4)`,
    [chunk, doc, vector, EMBEDDING_MODEL],
  );
  const attempt = async (
    user: string,
    day: string,
    result: any,
    component = "READING",
  ) => {
    const id = randomUUID();
    await db.query(
      `INSERT INTO test_attempts(id,student_id,snapshot_id,component,scope,part_number,status,purpose,result,started_at,submitted_at) VALUES($1,$2,$3,$4,'PART',1,'SUBMITTED','PRACTICE',$5,$6,$6)`,
      [id, user, snapshot, component, result, new Date(day)],
    );
    return id;
  };
  const objective = {
    method: "OBJECTIVE",
    items: [
      { key: sq.question_key, outcome: "INCORRECT" },
      { key: "correct-ignored", outcome: "CORRECT" },
    ],
  };
  const prior = await attempt(alice, "2026-10-01", objective),
    current = await attempt(alice, "2026-11-01", objective);
  await attempt(bob, "2026-11-01", objective);
  await Promise.all([worker.runBatch(), worker.runBatch()]);
  assert.equal(calls, 0, "objective indexing copies vectors");
  assert.equal(
    (await db.query("SELECT * FROM learner_error_chunks")).length,
    3,
    "SKIP LOCKED has no duplicates",
  );
  const from = new Date("2026-11-01"),
    to = new Date("2026-11-07");
  assert.deepEqual(
    (await patterns.forPeriod(db.manager, alice, from, to)).map((p) => [
      p.count,
      p.priorCount,
    ]),
    [[1, 1]],
  );
  assert.deepEqual(
    (await patterns.forPeriod(db.manager, bob, from, to)).map((p) => [
      p.count,
      p.priorCount,
    ]),
    [[1, 0]],
  );
  const snapshots = new SnapshotService(
    db,
    {} as any,
    {} as any,
    { recent: async () => [] } as any,
    { now: () => to },
    patterns,
  );
  const full = await snapshots.build(
    { id: alice, role: "STUDENT" } as any,
    null,
    { kind: "WEEKLY", from: "2026-11-01", to: "2026-11-07" } as any,
    to,
  );
  assert.equal(full.snapshotVersion, 6);
  assert.equal(full.errorPatterns?.[0].count, 1);
  assert.equal(full.errorPatterns?.[0].priorCount, 1);
  assert.ok(
    !JSON.stringify(reportSnapshot(full, 1)).includes("Meet on Monday"),
  );
  assert.equal(
    (
      await snapshots.build(
        { id: alice, role: "STUDENT" } as any,
        null,
        { kind: "GOAL" },
        to,
      )
    ).errorPatterns,
    undefined,
  );
  await db.query(
    `UPDATE test_attempts SET assessment_revision=assessment_revision+1,result='{"method":"OBJECTIVE","items":[]}' WHERE id=$1`,
    [current],
  );
  assert.equal(
    (
      await db.query("SELECT * FROM learner_error_chunks WHERE attempt_id=$1", [
        current,
      ])
    ).length,
    0,
    "revision invalidates immediately",
  );
  await worker.runBatch();
  assert.deepEqual(await patterns.forPeriod(db.manager, alice, from, to), []);
  await db.query("UPDATE test_attempts SET result=$2 WHERE id=$1", [
    current,
    objective,
  ]);
  await worker.runBatch();
  assert.equal(
    (await patterns.forPeriod(db.manager, alice, from, to))[0].count,
    1,
    "same revision result changes requeue",
  );
  const missing = await attempt(alice, "2026-11-02", {
    method: "OBJECTIVE",
    items: [{ key: "missing", outcome: "SKIPPED" }],
  });
  await worker.runBatch();
  assert.equal(
    (
      await db.query(
        "SELECT error_code FROM learner_error_jobs WHERE attempt_id=$1",
        [missing],
      )
    )[0].error_code,
    "QUESTION_VECTOR_MISSING",
  );
  const writing = await attempt(
    alice,
    "2026-11-03",
    {
      method: "AI",
      writing: {
        details: {
          parts: [
            {
              partNumber: 1,
              questions: [
                {
                  questionKey: "q",
                  corrections: Array.from({ length: 12 }, (_, i) => ({
                    kind: "ERROR",
                    criterion: "GRAMMAR",
                    explanation: "Rule " + i,
                    original: "PRIVATE",
                    replacement: "PRIVATE",
                  })),
                },
              ],
            },
          ],
        },
      },
    },
    "WRITING",
  );
  fail = true;
  await worker.processOne();
  assert.equal(
    (
      await db.query(
        "SELECT error_code FROM learner_error_jobs WHERE attempt_id=$1",
        [writing],
      )
    )[0].error_code,
    "QUOTA",
  );
  assert.equal(
    (
      await db.query("SELECT * FROM learner_error_chunks WHERE attempt_id=$1", [
        writing,
      ])
    ).length,
    0,
  );
  fail = false;
  await db.query(
    "UPDATE learner_error_jobs SET next_retry_at=now() WHERE attempt_id=$1",
    [writing],
  );
  await new LearnerErrorsWorker(db, embed as any, config).runBatch();
  assert.equal(
    (
      await db.query("SELECT * FROM learner_error_chunks WHERE attempt_id=$1", [
        writing,
      ])
    ).length,
    10,
  );
  assert.equal(calls, 2);
  assert.equal((await knowledge.read(chunk)).title, "Days");
  const goal = await new LearningGoalsRepository(db).create(alice, {
    targetCefr: "B1",
    targetTests: 10,
    durationDays: 14,
    startDate: "2026-11-01",
    timezone: "Asia/Bangkok",
  });
  const repo = new LearningInsightsRepository(db),
    clock = { now: () => to };
  const job = {
    learner: reportSnapshot(full, 1),
    sources: await knowledge.sources([chunk]),
    candidates: [],
  };
  const row = await repo.createPending(alice, {
    goalId: goal.id,
    kind: "FINAL",
    periodKey: "FINAL",
    snapshotVersion: 6,
    inputHash: "a".repeat(64),
    snapshot: job,
    coversFrom: "2026-11-01",
    coversTo: "2026-11-07",
  } as any);
  const content = {
    headline: "Report",
    narrative: "Review.",
    nextSteps: ["Read Days."],
    citations: [{ nextStepIndex: 0, chunkId: chunk }],
  };
  // The worker has already validated the content. Exercise the transactional source check and persistence here.
  const complete = () =>
    db.transaction((m) =>
      ReportJobsService.prototype.completeLocked.call(
        { clock } as any,
        m,
        row!,
        content as any,
        null as any,
        "Asia/Bangkok",
      ),
    );
  await complete();
  const reports = new ReportsService(db, clock, knowledge);
  assert.equal((await reports.read(alice, row!.id)).sources[0].chunkId, chunk);
  await assert.rejects(() => reports.read(bob, row!.id));
  const context = await new InsightContextService(repo, knowledge).read(
    alice,
    row!.id,
  );
  assert.equal(context.sources[0].id, chunk);
  const saved = (await repo.findById(alice, row!.id))!.content;

  await db.query(
    `UPDATE knowledge_documents SET access_scope='STAFF' WHERE id=$1`,
    [doc],
  );
  await assert.rejects(() => knowledge.read(chunk));
  await assert.rejects(complete, (e: any) =>
    e.issues?.includes("REPORT_CITATION_UNAVAILABLE"),
  );
  assert.deepEqual(
    (await repo.findById(alice, row!.id))!.content,
    saved,
    "retiring a lesson does not rewrite READY reports",
  );
  assert.deepEqual((await reports.read(alice, row!.id)).sources, []);

  assert.deepEqual(await knowledge.sources([chunk]), []);
  assert.deepEqual(await patterns.forPeriod(db.manager, alice, from, to), []);
  await db.query("DELETE FROM test_attempts WHERE id=$1", [prior]);
  assert.equal(
    (
      await db.query("SELECT * FROM learner_error_chunks WHERE attempt_id=$1", [
        prior,
      ])
    ).length,
    0,
  );
  await db.query("DELETE FROM test_attempts WHERE student_id=$1", [bob]);
  await db.query("DELETE FROM users WHERE id=$1", [bob]);
  assert.equal(
    (
      await db.query("SELECT * FROM learner_error_chunks WHERE user_id=$1", [
        bob,
      ])
    ).length,
    0,
  );
  console.log(
    "R5 database PASS: migration round trip, vector reuse, SKIP LOCKED, user isolation, prior counts, revisions, quota, scope, cascades",
  );
}).catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
