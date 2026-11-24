import "reflect-metadata";
import * as assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { ConfigService } from "@nestjs/config";
import { withPersonalizationDatabase } from "./personalization-fixture";
import { AddPlanRetrievalTrace1760000026000 } from "../../src/database/migrations/1760000026000-AddPlanRetrievalTrace";
import { QuestionEmbeddingWorker } from "../../src/features/retrieval/question-embedding.worker";
import { QuestionSearchService } from "../../src/features/retrieval/question-search.service";
import { RetrievalCandidatesService } from "../../src/features/personalization/services/retrieval-candidates.service";
import { PlanCandidatesService } from "../../src/features/personalization/services/plan-candidates.service";
import { buildRulePlan } from "../../src/features/personalization/policies/rule-plan";

withPersonalizationDatabase(async (db, alice, bob) => {
  const runner = db.createQueryRunner();
  await runner.connect();
  const migration = new AddPlanRetrievalTrace1760000026000();
  await migration.down(runner);
  await migration.up(runner);
  await runner.release();
  let calls = 0;
  const vector = (text: string) => {
    const v = Array(768).fill(0);
    v[Number(/axis(\d)/.exec(text)?.[1] ?? 9)] = 1;
    return v;
  };
  const worker = new QuestionEmbeddingWorker(
    db,
    {
      embedMany: async (texts: string[]) => {
        calls++;
        return texts.map(vector);
      },
    } as any,
    new ConfigService({ PERSONALIZATION_RAG_ENABLED: true }),
  );
  const make = async (
    title: string,
    axes: number[],
    placement = false,
    family: string | null = null,
  ) => {
    const id = randomUUID();
    await db.query(
      `INSERT INTO tests(id,created_by,title,component,scope,part_number,purpose,is_placement,placement_family_id)
      VALUES($1,$2,$3,'READING',CASE WHEN $4 THEN 'FULL_SKILL'::test_scope ELSE 'PART'::test_scope END,CASE WHEN $4 THEN NULL ELSE 1 END,'PRACTICE',$4,$5)`,
      [id, alice, title, placement, family],
    );
    for (let i = 0; i < axes.length; i++)
      await db.query(
        `INSERT INTO questions(test_id,part_number,position,question_type,content,correct_answer)
      VALUES($1,1,$2,'READING_GAP_CHOICE',$3,'{"answer":"on"}')`,
        [
          id,
          i + 1,
          {
            text: `Conditional axis${axes[i]} ${title} ${i}`,
            options: ["on", "in"],
          },
        ],
      );
    const [s] = await db.query(
      `INSERT INTO test_snapshots(test_id,version,schema_version,snapshot,content_hash) VALUES($1,1,1,'{}',$2) RETURNING id`,
      [id, id],
    );
    await db.query(
      `UPDATE tests SET status='PUBLISHED',published_snapshot_id=$2 WHERE id=$1`,
      [id, s.id],
    );
    await worker.runBatch();
    return { id, snapshot: s.id };
  };
  const family = randomUUID();
  const source = await make("source", [0, 1, 2, 3, 4], true, family);
  const dense = await make("dense", [0, 1, 2, 3, 4]);
  const used = await make("used", [0, 1, 2, 3, 4]);
  const sparse = await make("sparse", [0, 1]);
  const familyPart = await make(
    "placement family",
    [0, 1, 2, 3, 4],
    false,
    family,
  );
  for (let i = 0; i < 23; i++) await make(`unrelated ${i}`, [9]);
  const attempt = async (snapshot: string) => {
    const [a] = await db.query(
      `INSERT INTO test_attempts(student_id,snapshot_id,component,scope,part_number,status,purpose,result)
      VALUES($1,$2,'READING','PART',1,'SUBMITTED','PRACTICE','{"method":"OBJECTIVE"}') RETURNING id`,
      [alice, snapshot],
    );
    return a.id;
  };
  const attemptId = await attempt(source.snapshot);
  await attempt(used.snapshot);
  const [topic] = await db.query(
    `INSERT INTO learning_topics(code,name,component,topic_type) VALUES('r3-conditional','Conditionals','READING','KNOWLEDGE') RETURNING id`,
  );
  await db.query(
    `INSERT INTO question_topics(question_id,topic_id,weight,status,source,question_hash)
    SELECT q.id,$1,1,'APPROVED','ADMIN',q.question_hash FROM topic_question_catalog q WHERE q.test_id=ANY($2::uuid[])`,
    [topic.id, [dense.id, used.id, sparse.id]],
  );
  const snapshot: any = {
    weak: {
      parts: [{ skill: "READING", part: 1, percent: 20 }],
      topics: [{ topicId: topic.id, name: "Conditionals" }],
    },
    vocab: { activeCount: 0 },
    band: { bySkill: [] },
    mistakes: {
      references: Array.from({ length: 5 }, (_, i) => ({
        attemptId,
        questionKey: `p1:q${i + 1}`,
        component: "READING",
      })),
    },
  };
  const before = calls,
    retrieval = new RetrievalCandidatesService(
      new ConfigService({ PERSONALIZATION_RAG_ENABLED: true }),
      new QuestionSearchService(db),
    );
  const candidates = await new PlanCandidatesService(retrieval).build(
    db.manager,
    alice,
    snapshot,
    2,
  );
  const tests = candidates.filter((c) => c.activityType === "TEST");
  assert.equal(tests.length, 21);
  assert.equal(tests[0].testId, dense.id);
  assert.equal(tests[1].testId, used.id);
  assert.equal(tests[0].matchCount, 5);
  assert.equal(tests[0].retrieval!.matchedQuestionIds!.length, 5);
  assert.ok(
    !tests.some((t) => t.testId === source.id || t.testId === familyPart.id),
  );
  assert.equal(
    candidates.find((c) => c.activityType === "TOPIC_REVIEW")!.testId,
    dense.id,
  );
  assert.equal(calls, before, "planning never requests embeddings");
  const items = buildRulePlan(candidates, "2026-11-12", "2026-11-12", 1, 1);
  assert.equal(items[0].reason, "SIMILAR_QUESTIONS");
  assert.equal(items[0].retrieval!.matchCount, 5);
  const disabled = new PlanCandidatesService(
    new RetrievalCandidatesService(
      new ConfigService({ PERSONALIZATION_RAG_ENABLED: false }),
      new QuestionSearchService(db),
    ),
  );
  assert.deepEqual(
    await disabled.build(db.manager, alice, snapshot, 2),
    await new PlanCandidatesService().build(db.manager, alice, snapshot, 2),
  );
  assert.equal(
    (await retrieval.rankTests(db.manager, bob, snapshot)).size,
    0,
    "other learner cannot map private attempts",
  );
  const [gap] = await db.query(
    `SELECT count(*)::int n FROM retrieval_gaps WHERE user_id=$1 AND feature='PLAN'`,
    [bob],
  );
  assert.equal(gap.n, 1);
  await db.query(
    `UPDATE question_embeddings SET question_hash='stale' WHERE test_id=$1`,
    [source.id],
  );
  assert.equal(
    (await retrieval.rankTests(db.manager, alice, snapshot)).size,
    0,
  );
  console.log(
    "R3 PostgreSQL passed: migration, top21, distinct matches, used tie-break, placement family, topics, no API, flag off, ownership, stale hash and gaps.",
  );
});
