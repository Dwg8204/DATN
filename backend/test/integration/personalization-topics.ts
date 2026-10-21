import * as assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import * as request from "supertest";
import { TopicsController } from "../../src/features/topics/topics.controller";
import { JwtAuthGuard } from "../../src/features/auth/guards/jwt-auth.guard";
import { createValidationPipe } from "../../src/common/validation/create-validation.pipe";
import { HttpExceptionFilter } from "../../src/common/filters/http-exception.filter";
import { ReadingTestsRepository } from "../../src/features/reading-tests/repositories/reading-tests.repository";
import { ListeningTestsRepository } from "../../src/features/listening-tests/repositories/listening-tests.repository";
import { SpeakingTestsRepository } from "../../src/features/speaking-tests/repositories/speaking-tests.repository";
import { LearningGoalsRepository } from "../../src/features/personalization/repositories/learning-goals.repository";
import { StudyPlansRepository } from "../../src/features/personalization/repositories/study-plans.repository";
import { PlanProgressRepository } from "../../src/features/personalization/repositories/plan-progress.repository";
import { PlanCandidatesService } from "../../src/features/personalization/services/plan-candidates.service";
import { withPersonalizationDatabase } from "./personalization-fixture";
import { TopicsService } from "../../src/features/topics/topics.service";
import { TopicsWorker } from "../../src/features/topics/topics.worker";
import { AiProviderError } from "../../src/features/ai-shared/ai-provider.error";
import {
  processTopicEvidence,
  readWeakTopics,
} from "../../src/features/topics/topic-evidence";

withPersonalizationDatabase(async (db, alice, bob) => {
  const service = new TopicsService(db);
  const module = await Test.createTestingModule({
    controllers: [TopicsController],
    providers: [{ provide: TopicsService, useValue: service }],
  })
    .overrideGuard(JwtAuthGuard)
    .useValue({
      canActivate(context: any) {
        const req = context.switchToHttp().getRequest();
        const role = req.headers["x-role"];
        if (!role) throw new UnauthorizedException();
        req.user = { id: bob, role };
        return true;
      },
    })
    .compile();
  const app = module.createNestApplication({ logger: false });
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.init();
  try {
    const arbitraryTest = randomUUID();
    await request(app.getHttpServer())
      .get(`/admin/tests/${arbitraryTest}/topic-approval`)
      .set("x-role", "STUDENT")
      .expect(403);
    await request(app.getHttpServer())
      .post(`/admin/tests/${arbitraryTest}/approve-topics`)
      .set("x-role", "STUDENT")
      .send({ revision: "a".repeat(64) })
      .expect(403);
    await request(app.getHttpServer())
      .post(`/admin/tests/${arbitraryTest}/approve-topics`)
      .set("x-role", "ADMIN")
      .send({ revision: "invalid" })
      .expect(400);
    await request(app.getHttpServer())
      .post("/admin/topic-labels/suggest-missing")
      .set("x-role", "STUDENT")
      .send({})
      .expect(403);
    await request(app.getHttpServer())
      .post("/admin/topic-labels/suggest-missing")
      .set("x-role", "ADMIN")
      .send({ component: "INVALID" })
      .expect(400);
    await request(app.getHttpServer())
      .post("/admin/topic-labels/suggest-missing")
      .set("x-role", "ADMIN")
      .send({})
      .expect(201);
    await request(app.getHttpServer())
      .get("/admin/learning-topics")
      .expect(401);
    for (const path of [
      "/admin/learning-topics",
      "/admin/topic-labels",
      "/admin/topic-labels/tests",
      "/admin/topic-labels/progress",
    ])
      await request(app.getHttpServer())
        .get(path)
        .set("x-role", "STUDENT")
        .expect(403);
    await request(app.getHttpServer())
      .post("/admin/topic-labels/review")
      .set("x-role", "STUDENT")
      .send({ items: [] })
      .expect(403);
    await request(app.getHttpServer())
      .get("/admin/learning-topics")
      .set("x-role", "ADMIN")
      .expect(200);
    await request(app.getHttpServer())
      .post("/admin/topic-labels/review")
      .set("x-role", "ADMIN")
      .send({ items: [], source: "AI" })
      .expect(400);
  } finally {
    await app.close();
  }
  assert.equal((await service.topics({ page: 1 })).items.length, 45);
  const test = randomUUID();
  await db.query(
    `INSERT INTO tests(id,created_by,title,component,scope,part_number,purpose) VALUES($1,$2,'Topic fixture','GRAMMAR_VOCAB','PART',1,'PRACTICE')`,
    [test, alice],
  );
  const ids: string[] = [];
  for (let i = 1; i <= 5; i++) {
    const [q] = await db.query(
      `INSERT INTO questions(test_id,part_number,position,question_type,content,correct_answer) VALUES($1,1,$2,'MCQ',$3,$4) RETURNING id`,
      [
        test,
        i,
        { text: "He ___ every day.", options: ["works", "work"] },
        { optionIndex: 0 },
      ],
    );
    ids.push(q.id);
  }
  const [snap] = await db.query(
    `INSERT INTO test_snapshots(test_id,version,schema_version,snapshot,content_hash) VALUES($1,1,1,'{}',$2) RETURNING id`,
    [test, "a".repeat(64)],
  );
  await db.query(
    "UPDATE tests SET status='PUBLISHED',published_snapshot_id=$2 WHERE id=$1",
    [test, snap.id],
  );
  let calls = 0;
  const generation = {
    generate: async (input: any) => {
      calls++;
      assert.equal(input.context.purpose, "TOPIC_TAGGING");
      const payload = JSON.parse(input.prompt);
      assert.ok(
        payload.questions.every(
          (q: any) => Number.isInteger(q.position) && "groupKey" in q,
        ),
        "AI receives question position and answer-bank group",
      );
      const [request] = await db.query(
        `INSERT INTO ai_requests(user_id,purpose,provider,model,status,idempotency_key,request_fingerprint,config_snapshot,pricing_snapshot,currency,started_at) VALUES($1,'TOPIC_TAGGING','fixture','fixture','COMPLETED',gen_random_uuid(),$2,'{}','{}','USD',now()) RETURNING id`,
        [alice, "f".repeat(64)],
      );
      return {
        requestId: request.id,
        text: JSON.stringify({
          labels: payload.questions.map((q: any) => ({
            questionId: q.questionId,
            topics: [
              { topicCode: "present-simple", confidence: 0.9 },
              { topicCode: "made-up", confidence: 0.8 },
            ],
          })),
        }),
      };
    },
  };
  const worker = new TopicsWorker(
    db,
    new ConfigService({ PERSONALIZATION_AI_ENABLED: true }),
    generation as any,
  );
  const capped = new TopicsWorker(
    db,
    new ConfigService({ PERSONALIZATION_MAX_RPM: 0 }),
    generation as any,
  );
  assert.equal(await capped.suggestOne(), false);
  assert.equal(calls, 0, "shared RPM prevents generation");
  const throttled = new TopicsWorker(db, new ConfigService(), {
    generate: async () => {
      throw new AiProviderError("QUOTA", 120000);
    },
  } as any);
  assert.equal(await throttled.suggestOne(), false);
  const [deferred] = await db.query(
    "SELECT retry_count,error_code,next_retry_at>now()+interval '110 seconds' deferred FROM topic_tagging_jobs WHERE test_id=$1",
    [test],
  );
  assert.deepEqual(deferred, {
    retry_count: 0,
    error_code: "TOPIC_QUOTA",
    deferred: true,
  });
  await db.query(
    "UPDATE topic_tagging_jobs SET next_retry_at=now() WHERE test_id=$1",
    [test],
  );
  await worker.suggestOne();
  assert.equal(calls, 1);
  let labels = (await service.labels({ testId: test, page: 1 })).items;
  labels.sort(
    (a: any, b: any) => ids.indexOf(a.question_id) - ids.indexOf(b.question_id),
  );
  assert.equal(labels.length, 5);
  assert.ok(labels.every((l: any) => l.status === "SUGGESTED"));
  const [attempt] = await db.query(
    `INSERT INTO test_attempts(student_id,snapshot_id,component,scope,part_number,purpose,status,submitted_at,result)
    VALUES($1,$2,'GRAMMAR_VOCAB','PART',1,'PRACTICE','SUBMITTED',now(),$3) RETURNING id`,
    [
      alice,
      snap.id,
      {
        method: "OBJECTIVE",
        items: ids.map((_, i) => ({
          key: `p1:q${i + 1}`,
          outcome: "INCORRECT",
          score: 0,
          maxScore: 1,
        })),
      },
    ],
  );
  await db.transaction((m) => processTopicEvidence(m, attempt.id));
  assert.equal((await db.query("SELECT * FROM learning_evidence")).length, 0);
  const review = (n: number) =>
    service.review(bob, {
      items: labels.slice(0, n).map((l: any) => ({
        labelId: l.id,
        questionId: l.question_id,
        topicId: l.topic_id,
        questionHash: l.current_hash,
        status: "APPROVED",
      })),
    });
  await review(3);
  await db.transaction((m) => processTopicEvidence(m, attempt.id));
  assert.equal(
    (await readWeakTopics(db.manager, alice, "2000-01-01", "2100-01-01"))
      .length,
    0,
    "60% coverage remains disabled",
  );
  await review(4);
  await db.transaction((m) => processTopicEvidence(m, attempt.id));
  const weak = await readWeakTopics(
    db.manager,
    alice,
    "2000-01-01",
    "2100-01-01",
  );
  assert.equal(weak.length, 1);
  assert.equal(weak[0].errors, 4);
  const candidates = await new PlanCandidatesService().build(
    db.manager,
    alice,
    { weak: { topics: weak, parts: [] }, mistakes: { references: [] } } as any,
  );
  assert.equal(
    candidates.filter((c) => c.activityType === "TOPIC_REVIEW").length,
    1,
  );
  const day = (
    await db.query(
      "SELECT (now() AT TIME ZONE 'Asia/Bangkok')::date::text AS today",
    )
  )[0].today;
  const goal = await new LearningGoalsRepository(db).create(alice, {
    targetCefr: "B2",
    targetTests: 10,
    durationDays: 30,
    startDate: day,
    timezone: "Asia/Bangkok",
  });
  const plans = new StudyPlansRepository(db);
  const plan = await plans.create(
    alice,
    {
      goalId: goal.id,
      weekIndex: 1,
      startsOn: day,
      endsOn: day,
      source: "RULE",
    },
    [
      {
        activityType: "TOPIC_REVIEW",
        topicId: weak[0].topicId,
        testId: test,
        component: "GRAMMAR_VOCAB",
        partNumber: 1,
        targetCount: 1,
        scheduledOn: day,
        sortOrder: 0,
      },
    ],
  );
  await db.transaction((m) =>
    new PlanProgressRepository(plans).syncPlan(m, goal, plan, new Date()),
  );
  assert.equal((await plans.findItems(alice, plan.id))[0].done_count, 1);
  await db.transaction((m) => processTopicEvidence(m, attempt.id));
  assert.equal(
    (await db.query("SELECT * FROM learning_evidence")).length,
    4,
    "idempotent",
  );
  assert.equal(
    (await readWeakTopics(db.manager, bob, "2000-01-01", "2100-01-01")).length,
    0,
  );
  // Regrading replaces evidence; exercise the user-selected threshold exactly.
  await review(5);
  const grade = async (outcomes: string[]) => {
    await db.query(
      "UPDATE test_attempts SET assessment_revision=assessment_revision+1,result=$2 WHERE id=$1",
      [
        attempt.id,
        {
          method: "OBJECTIVE",
          items: outcomes.map((outcome, i) => ({
            key: `p1:q${i + 1}`,
            outcome,
            score: outcome === "CORRECT" ? 1 : 0,
            maxScore: 1,
          })),
        },
      ],
    );
    await db.transaction((m) => processTopicEvidence(m, attempt.id));
    return readWeakTopics(db.manager, alice, "2000-01-01", "2100-01-01");
  };
  assert.equal(
    (await grade(["INCORRECT", "SKIPPED", "CORRECT", "CORRECT", "CORRECT"]))[0]
      .errorRatio,
    0.4,
    "40% includes skipped answers",
  );
  assert.equal(
    (await grade(["INCORRECT", "CORRECT", "CORRECT", "CORRECT", "CORRECT"]))
      .length,
    0,
    "below 40% is not weak",
  );
  assert.equal(
    (await grade(["INCORRECT", "INCORRECT"])).length,
    0,
    "two graded questions are insufficient",
  );
  assert.equal(
    (await grade(["INCORRECT", "INCORRECT", "CORRECT"])).length,
    1,
    "three graded questions qualify",
  );
  await db.query("UPDATE learning_topics SET is_active=false WHERE id=$1", [
    weak[0].topicId,
  ]);
  assert.equal(
    (await readWeakTopics(db.manager, alice, "2000-01-01", "2100-01-01"))
      .length,
    0,
    "hidden topic is excluded immediately",
  );
  await db.query("UPDATE learning_topics SET is_active=true WHERE id=$1", [
    weak[0].topicId,
  ]);
  await grade(["INCORRECT", "INCORRECT", "INCORRECT", "INCORRECT"]);
  const fifth = labels[4];
  await service.review(bob, {
    items: [
      {
        labelId: fifth.id,
        questionId: fifth.question_id,
        topicId: fifth.topic_id,
        questionHash: fifth.current_hash,
        status: "REJECTED",
      },
    ],
  });
  await service.suggest(bob, test);
  await assert.rejects(() => service.suggest(bob, test));
  await db.query(
    `UPDATE questions SET content='{"text":"Changed"}',updated_at=now() WHERE id=$1`,
    [ids[0]],
  );
  const stale = labels.find((l: any) => l.question_id === ids[0]);
  await assert.rejects(() =>
    service.review(bob, {
      items: [
        {
          labelId: stale.id,
          questionId: stale.question_id,
          topicId: stale.topic_id,
          questionHash: stale.current_hash,
          status: "APPROVED",
        },
      ],
    }),
  );
  assert.equal(
    (await readWeakTopics(db.manager, alice, "2000-01-01", "2100-01-01"))
      .length,
    0,
    "stale label drops coverage",
  );
  await worker.suggestOne();
  labels = (await service.labels({ testId: test, page: 1 })).items;
  assert.ok(
    labels.some(
      (l: any) => l.question_id === ids[0] && l.status === "SUGGESTED",
    ),
  );
  const changed = labels.find((l: any) => l.question_id === ids[0]);
  await service.review(bob, {
    items: [
      {
        labelId: changed.id,
        questionId: changed.question_id,
        topicId: changed.topic_id,
        questionHash: changed.current_hash,
        status: "APPROVED",
      },
    ],
  });
  await db.transaction((m) => processTopicEvidence(m, attempt.id));
  assert.equal(
    (await db.query("SELECT * FROM learning_evidence")).length,
    3,
    "old attempt never inherits new question label",
  );
  // Saving the same draft retains question identity; removing a part soft-deletes only removed questions.
  for (const [component, repo, parts] of [
    [
      "READING",
      new ReadingTestsRepository(db),
      { 1: { questions: [{ options: ["a", "b"], answer: "a" }] } },
    ],
    [
      "LISTENING",
      new ListeningTestsRepository(db),
      {
        1: {
          questions: [
            { text: "Listen", options: ["a", "b"], correctAnswer: 0 },
          ],
        },
      },
    ],
    [
      "SPEAKING",
      new SpeakingTestsRepository(db),
      { 1: { questions: [{ text: "Speak" }] } },
    ],
  ] as const) {
    const [t] = await db.query(
      `INSERT INTO tests(created_by,title,component,scope,part_number,purpose) VALUES($1,'Stable draft',$2,'PART',1,'PRACTICE') RETURNING id`,
      [alice, component],
    );
    const sync = (payload: any) =>
      db.transaction((m) =>
        (repo as any).syncQuestions(m, t.id, { parts: payload }),
      );
    await sync(parts);
    const before = await db.query(
      "SELECT id FROM questions WHERE test_id=$1 AND deleted_at IS NULL",
      [t.id],
    );
    await sync(parts);
    assert.deepEqual(
      await db.query(
        "SELECT id FROM questions WHERE test_id=$1 AND deleted_at IS NULL",
        [t.id],
      ),
      before,
    );
    await sync({});
    assert.equal(
      (
        await db.query(
          "SELECT id FROM questions WHERE test_id=$1 AND deleted_at IS NULL",
          [t.id],
        )
      ).length,
      0,
    );
  }
  // Bulk generation spans all matching tests, preserves reviewed labels and cannot reset active jobs.
  const fixtureIds: string[] = [];
  for (let i = 0; i < 54; i++) {
    const [t] = await db.query(
      `INSERT INTO tests(created_by,title,component,scope,part_number,purpose) VALUES($1,$2,$3,'PART',1,'PRACTICE') RETURNING id`,
      [alice, `Bulk ${i}`, i === 53 ? "READING" : "GRAMMAR_VOCAB"],
    );
    fixtureIds.push(t.id);
    await db.query(
      `INSERT INTO questions(test_id,part_number,position,question_type,content,correct_answer) VALUES($1,1,1,'MCQ','{"text":"Bulk question"}','{"optionIndex":0}')`,
      [t.id],
    );
  }
  await db.query(
    "DELETE FROM topic_tagging_jobs WHERE test_id=ANY($1::uuid[])",
    [fixtureIds],
  );
  const [approved] = await db.query(
    "SELECT * FROM topic_question_catalog WHERE test_id=$1",
    [fixtureIds[0]],
  );
  const [rejected] = await db.query(
    "SELECT * FROM topic_question_catalog WHERE test_id=$1",
    [fixtureIds[1]],
  );
  for (const [q, status] of [
    [approved, "APPROVED"],
    [rejected, "REJECTED"],
  ] as const)
    await service.review(bob, {
      items: [
        {
          questionId: q.id,
          topicId: weak[0].topicId,
          questionHash: q.question_hash,
          status,
        },
      ],
    });
  await db.query("UPDATE tests SET archived_at=now() WHERE id=$1", [
    fixtureIds[2],
  ]);
  const concurrent = await Promise.all([
    service.suggestMissing(bob, { component: "GRAMMAR_VOCAB" }),
    service.suggestMissing(bob, { component: "GRAMMAR_VOCAB" }),
  ]);
  assert.equal(
    concurrent.reduce((n, r) => n + r.queued, 0),
    50,
    "bulk queues all 50 missing eligible tests exactly once",
  );
  assert.equal(
    (await service.suggestMissing(bob, { component: "GRAMMAR_VOCAB" })).queued,
    0,
  );
  const [preserved] = await db.query(
    "SELECT status,source FROM question_topics WHERE question_id=$1",
    [approved.id],
  );
  assert.deepEqual(preserved, { status: "APPROVED", source: "ADMIN" });
  assert.equal(
    (
      await db.query("SELECT * FROM topic_tagging_jobs WHERE test_id=$1", [
        fixtureIds[53],
      ])
    ).length,
    0,
    "skill filter respected",
  );
  await db.query(
    "UPDATE topic_tagging_jobs SET retry_count=4,error_code='TOPIC_GENERATION_FAILED',next_retry_at=now()+interval '1 day' WHERE test_id=$1",
    [fixtureIds[3]],
  );
  assert.equal(
    (await service.suggestMissing(bob, { component: "GRAMMAR_VOCAB" })).queued,
    0,
    "cooldown preserved for failed jobs",
  );
  const failed = await service.tests({
    page: 1,
    component: "GRAMMAR_VOCAB",
    work: "FAILED",
  });
  assert.equal(failed.items.length, 1);
  await db.query(
    "UPDATE topic_tagging_jobs SET manual_requested_at=now()-interval '11 minutes' WHERE test_id=$1",
    [fixtureIds[3]],
  );
  assert.equal(
    (await service.suggestMissing(null, { component: "GRAMMAR_VOCAB" })).queued,
    1,
    "explicit retry after cooldown; CLI has no impersonated actor",
  );
  const progress = await service.progress({
    page: 1,
    component: "GRAMMAR_VOCAB",
  });
  assert.ok(progress.queued >= 50);
  assert.ok(progress.labeled >= 2);
  assert.equal(progress.workerEnabled, false);
  const [low] = await db.query(
    "SELECT * FROM topic_question_catalog WHERE test_id=$1",
    [fixtureIds[4]],
  );
  await db.query(
    `INSERT INTO question_topics(question_id,topic_id,weight,status,source,confidence,question_hash) VALUES($1,$2,1,'SUGGESTED','AI',0.5,$3)`,
    [low.id, weak[0].topicId, low.question_hash],
  );
  assert.equal(
    (
      await service.labels({
        page: 1,
        testId: fixtureIds[4],
        reviewFilter: "LOW_CONFIDENCE",
      })
    ).items.length,
    1,
  );
  await db.query(
    "UPDATE question_topics SET confidence=0.9 WHERE question_id=$1",
    [low.id],
  );
  assert.equal(
    (
      await service.labels({
        page: 1,
        testId: fixtureIds[4],
        reviewFilter: "LOW_CONFIDENCE",
      })
    ).items.length,
    0,
  );
  assert.equal(
    (
      await service.tests({
        page: 1,
        component: "GRAMMAR_VOCAB",
        work: "NEEDS_REVIEW",
      })
    ).items.some((t: any) => t.id === fixtureIds[4]),
    true,
  );
  await db.query(
    `UPDATE question_topics SET question_hash=repeat('0',32) WHERE question_id=$1`,
    [low.id],
  );
  assert.equal(
    (
      await service.labels({
        page: 1,
        testId: fixtureIds[4],
        reviewFilter: "STALE",
      })
    ).items.length,
    1,
  );
  await db.query(
    "UPDATE question_topics SET question_hash=$2 WHERE question_id=$1",
    [low.id, low.question_hash],
  );
  await db.query("UPDATE learning_topics SET is_active=false WHERE id=$1", [
    weak[0].topicId,
  ]);
  assert.equal(
    (
      await service.labels({
        page: 1,
        testId: fixtureIds[4],
        reviewFilter: "HIDDEN_TOPIC",
      })
    ).items.length,
    1,
  );
  await db.query("UPDATE learning_topics SET is_active=true WHERE id=$1", [
    weak[0].topicId,
  ]);
  await db.query(
    `INSERT INTO questions(test_id,part_number,position,question_type,content,correct_answer)
    SELECT $1,1,n,'MCQ','{"text":"Page fixture"}','{"optionIndex":0}' FROM generate_series(2,106) n`,
    [fixtureIds[4]],
  );
  await db.query(
    `INSERT INTO question_topics(question_id,topic_id,weight,status,source,confidence,question_hash)
    SELECT q.id,$2,1,'SUGGESTED','AI',0.9,q.question_hash FROM topic_question_catalog q WHERE q.test_id=$1 AND position>1`,
    [fixtureIds[4], weak[0].topicId],
  );
  const page1 = await service.labels({ page: 1, testId: fixtureIds[4] }),
    page2 = await service.labels({ page: 2, testId: fixtureIds[4] });
  assert.equal(page1.totalItems, 106);
  const searched = await service.labels({
    page: 2,
    pageSize: 10,
    testId: fixtureIds[4],
    search: "Page fixture",
  });
  assert.equal(searched.totalItems, 105);
  assert.equal(searched.items.length, 10);
  const absent = await service.labels({
    page: 1,
    testId: fixtureIds[4],
    search: "no-matching-label-xyz",
  });
  assert.equal(absent.totalItems, 0);
  assert.deepEqual(absent.items, []);
  const testSearch = await service.tests({
    page: 1,
    pageSize: 1,
    search: "Topic fixture",
  });
  assert.ok(testSearch.totalItems >= 1);
  assert.equal(testSearch.items.length, 1);
  const noTests = await service.tests({
    page: 1,
    search: "no-matching-test-xyz",
  });
  assert.equal(noTests.totalItems, 0);
  assert.deepEqual(noTests.items, []);
  assert.equal(page1.items.length, 100);
  assert.equal(page1.hasMore, true);
  assert.equal(page2.items.length, 6);
  assert.equal(page2.hasMore, false);
  assert.equal(
    new Set([...page1.items, ...page2.items].map((l: any) => l.id)).size,
    106,
  );
  const target = fixtureIds[4];
  const [hidden] = await db.query(
    "SELECT id FROM learning_topics WHERE code='past-simple'",
  );
  const [kept] = await db.query(
    "SELECT id FROM learning_topics WHERE code='present-perfect'",
  );
  await db.query("UPDATE learning_topics SET is_active=false WHERE id=$1", [
    hidden.id,
  ]);
  await db.query(
    `INSERT INTO question_topics(question_id,topic_id,weight,status,source,question_hash)
    SELECT q.id,$2,1,'SUGGESTED','AI',q.question_hash FROM topic_question_catalog q WHERE q.test_id=$1 AND q.position=2`,
    [target, hidden.id],
  );
  await db.query(
    `INSERT INTO question_topics(question_id,topic_id,weight,status,source,question_hash)
    SELECT q.id,$2,1,'APPROVED','ADMIN',q.question_hash FROM topic_question_catalog q WHERE q.test_id=$1 AND q.position=3`,
    [target, kept.id],
  );
  await db.query(
    "UPDATE question_topics SET question_hash=repeat('0',32) WHERE question_id=$1",
    [low.id],
  );
  await db.query(
    `UPDATE question_topics l SET status='REJECTED' FROM questions q WHERE q.id=l.question_id AND q.test_id=$1 AND q.position=4`,
    [target],
  );
  const firstPreview = await service.approvalPreview(target);
  assert.equal(firstPreview.labels, 104);
  assert.equal(firstPreview.questions, 104);
  assert.equal(firstPreview.skipped, 2);
  await db.query(
    `UPDATE question_topics l SET confidence=0.7 FROM questions q WHERE q.id=l.question_id AND q.test_id=$1 AND q.position=5`,
    [target],
  );
  await assert.rejects(
    () => service.approveTest(bob, target, firstPreview.revision),
    "a changed preview must be rejected",
  );
  const freshPreview = await service.approvalPreview(target);
  const reviewed = await Promise.allSettled([
    service.approveTest(bob, target, freshPreview.revision),
    service.approveTest(bob, target, freshPreview.revision),
  ]);
  assert.equal(reviewed.filter((r) => r.status === "fulfilled").length, 1);
  const success = reviewed.find(
    (r) => r.status === "fulfilled",
  ) as PromiseFulfilledResult<any>;
  assert.deepEqual(success.value, {
    reviewed: 104,
    questions: 104,
    skipped: 2,
  });
  const [counts] = await db.query(
    `SELECT count(*) FILTER(WHERE l.status='APPROVED')::int approved,count(*) FILTER(WHERE l.status='REJECTED')::int rejected,
    count(*) FILTER(WHERE l.status='SUGGESTED')::int pending FROM question_topics l JOIN questions q ON q.id=l.question_id WHERE q.test_id=$1`,
    [target],
  );
  assert.deepEqual(counts, { approved: 105, rejected: 1, pending: 2 });
  assert.equal(
    (
      await db.query(
        "SELECT * FROM audit_logs WHERE changes->>'bulkTestId'=$1",
        [target],
      )
    ).length,
    104,
  );
  assert.equal(
    (
      await db.query(
        "SELECT * FROM question_topics l JOIN questions q ON q.id=l.question_id WHERE q.test_id=$1 AND l.reviewed_by=$2 AND l.status='APPROVED' AND l.source='AI'",
        [target, bob],
      )
    ).length,
    104,
  );
  assert.equal(
    (
      await db.query(
        "SELECT status FROM question_topics WHERE question_id=$1",
        [rejected.id],
      )
    )[0].status,
    "REJECTED",
    "other tests untouched",
  );
  const emptyPreview = await service.approvalPreview(target);
  assert.equal(
    (await service.approveTest(bob, target, emptyPreview.revision)).reviewed,
    0,
  );
  console.log(
    "PASS whole-test approval: 104 labels across pages, exact preview, concurrent confirmation, skips stale/hidden, preserves approved/rejected and AI source, per-label audit.",
  );
  console.log(
    "PASS bulk topics: concurrent queue, skill scope, cooldown, retries, progress, review filters and label pagination.",
  );
  console.log(
    "PASS GĐ10: seed, auto queue, constrained AI suggestions, approval, 80% coverage, exact version evidence, idempotency, ownership, cooldown and stale review protection.",
  );
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
