import "reflect-metadata";
import * as assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { ConfigService } from "@nestjs/config";
import { withPersonalizationDatabase } from "./personalization-fixture";
import { PlanService } from "../../src/features/personalization/services/plan.service";
import { GoalsService } from "../../src/features/personalization/services/goals.service";
import { SnapshotService } from "../../src/features/personalization/services/snapshot.service";
import { MistakeSourceService } from "../../src/features/personalization/services/mistake-source.service";
import { ReportJobsService } from "../../src/features/personalization/services/report-jobs.service";
import { PlanCandidatesService } from "../../src/features/personalization/services/plan-candidates.service";
import { RetrievalCandidatesService } from "../../src/features/personalization/services/retrieval-candidates.service";
import { LearningGoalsRepository } from "../../src/features/personalization/repositories/learning-goals.repository";
import { StudyPlansRepository } from "../../src/features/personalization/repositories/study-plans.repository";
import { PlanProgressRepository } from "../../src/features/personalization/repositories/plan-progress.repository";
import { LearningInsightsRepository } from "../../src/features/personalization/repositories/learning-insights.repository";
import { PersonalizationWorker } from "../../src/features/personalization/workers/personalization.worker";
import { PersonalizationOverviewController } from "../../src/features/personalization/controllers/personalization-overview.controller";
import { QuestionSearchService } from "../../src/features/retrieval/question-search.service";
import { QuestionEmbeddingWorker } from "../../src/features/retrieval/question-embedding.worker";

withPersonalizationDatabase(async (db, alice) => {
  let now = new Date("2026-11-15T05:00:00Z"); // Day 3 in Bangkok.
  const clock = { now: () => now },
    config = new ConfigService({ PERSONALIZATION_RAG_ENABLED: true });
  const repo = new StudyPlansRepository(db),
    progress = new PlanProgressRepository(repo),
    goalRepo = new LearningGoalsRepository(db);
  const goals = new GoalsService(db, goalRepo, clock, progress);
  // Public question fixtures supply outcomes; snapshot/profile/ranking/transactions are real.
  const details = {
    details: async (id: string, part: number) => {
      const [a] = await db.query(
        "SELECT component FROM test_attempts WHERE id=$1",
        [id],
      );
      return {
        items:
          a.component === "READING" && part === 1
            ? [1, 2].map((i) => ({
                key: `p1:q${i}`,
                outcome: { outcome: "INCORRECT" },
              }))
            : [],
      };
    },
  };
  const mistakes = new MistakeSourceService(db, details as any, details as any);
  const snapshots = new SnapshotService(db, goals, goalRepo, mistakes, clock);
  const candidates = new PlanCandidatesService(
    new RetrievalCandidatesService(config, new QuestionSearchService(db)),
  );
  const reports = new ReportJobsService(
    db,
    goals,
    goalRepo,
    new LearningInsightsRepository(db),
    snapshots,
    candidates,
    repo,
    progress,
    clock,
    {} as any,
  );
  const plans = new PlanService(
    db,
    goals,
    repo,
    progress,
    snapshots,
    candidates,
    clock,
    mistakes,
    reports,
    config,
  );
  const worker = new PersonalizationWorker(db, goals, plans, clock, {
    enqueueLocked: async () => {},
  } as any);
  const overview = new PersonalizationOverviewController(
    db,
    goals,
    snapshots,
    plans,
    {
      current: async () => ({ status: "HIDDEN" }),
      needsSync: async () => false,
      syncLocked: async () => {},
    } as any,
    { list: async () => ({ items: [] }) } as any,
    clock,
  );
  let embeddingCalls = 0;
  const embeddingWorker = new QuestionEmbeddingWorker(
    db,
    {
      embedMany: async (texts: string[]) => {
        embeddingCalls++;
        return texts.map((text) => {
          const v = Array(768).fill(0);
          v[text.includes("conditionals") ? 0 : 1] = 1;
          return v;
        });
      },
    } as any,
    config,
  );
  const make = async (component: string, title: string, placement = false) => {
    const id = randomUUID();
    await db.query(
      `INSERT INTO tests(id,created_by,title,component,scope,purpose,is_placement)
      VALUES($1,$2,$3,$4,'FULL_SKILL','PRACTICE',$5)`,
      [id, alice, title, component, placement],
    );
    if (component === "READING")
      for (let i = 1; i <= 2; i++)
        await db.query(
          `INSERT INTO questions(test_id,part_number,position,question_type,content,correct_answer)
      VALUES($1,1,$2,'READING_GAP_CHOICE',$3,'{"answer":"on"}')`,
          [id, i, { text: `${title} ${i}`, options: ["on", "in"] }],
        );
    const [s] = await db.query(
      `INSERT INTO test_snapshots(test_id,version,schema_version,snapshot,content_hash) VALUES($1,1,1,'{}',$2) RETURNING id`,
      [id, id],
    );
    await db.query(
      "UPDATE tests SET status='PUBLISHED',published_snapshot_id=$2 WHERE id=$1",
      [id, s.id],
    );
    await embeddingWorker.runBatch();
    return { id, snapshot: s.id, component };
  };
  const grammar = await make("GRAMMAR_VOCAB", "Grammar placement", true),
    reading = await make("READING", "conditionals placement", true),
    listening = await make("LISTENING", "Listening placement", true);
  const matched = await make("READING", "conditionals practice"),
    unrelated = await make("READING", "unrelated practice");
  const beforeEmbeddings = embeddingCalls;
  const user = async () => {
    const id = randomUUID();
    await db.query(
      `INSERT INTO users(id,email,password_hash,first_name,last_name,role_id,status,timezone)
    SELECT $1,$2,'fixture','Lan','R4',id,'ACTIVE','Asia/Bangkok' FROM roles WHERE code='STUDENT'`,
      [id, `${id}@example.invalid`],
    );
    return id;
  };
  const submit = async (uid: string, test: typeof grammar, day: number) => {
    const [a] = await db.query(
      `INSERT INTO test_attempts(student_id,snapshot_id,component,scope,status,purpose,started_at,submitted_at,score,max_score,estimated_cefr,result)
      VALUES($1,$2,$3,'FULL_SKILL','SUBMITTED','PRACTICE',$4::timestamptz-interval '1 hour',$4,2,10,$5,$6) RETURNING id`,
      [
        uid,
        test.snapshot,
        test.component,
        `2026-11-${12 + day}T04:00:00Z`,
        test.component === "GRAMMAR_VOCAB" ? null : "A2",
        {
          method: "OBJECTIVE",
          parts: [{ partNumber: 1, score: 2, maxScore: 10 }],
        },
      ],
    );
    return a.id;
  };
  const scenario = async (
    opts: { third?: boolean; placement?: boolean; partial?: boolean } = {},
  ) => {
    const uid = await user(),
      actor = { id: uid, role: "STUDENT" } as any;
    const goal = await goalRepo.create(uid, {
      targetCefr: "B2",
      targetTests: 7,
      durationDays: 7,
      startDate: "2026-11-13",
      timezone: "Asia/Bangkok",
    });
    const source = await submit(uid, grammar, 1);
    await submit(uid, reading, 2);
    if (opts.third !== false) await submit(uid, listening, 3);
    const items: any[] = Array.from({ length: 7 }, (_, i) => ({
      activityType: "TEST",
      scheduledOn: `2026-11-${13 + i}`,
      sortOrder: 0,
      targetCount: 1,
      component: i < 3 ? [grammar, reading, listening][i].component : "READING",
      testId: i < 3 ? [grammar, reading, listening][i].id : unrelated.id,
      reason: i < 3 && opts.placement !== false ? "PLACEMENT" : "GOAL_PACE",
    }));
    if (opts.partial)
      items.push({
        activityType: "MISTAKE_REVIEW",
        scheduledOn: "2026-11-16",
        sortOrder: 1,
        targetCount: 1,
        sourceAttemptId: source,
        questionKeys: ["p1:q1"],
        component: "GRAMMAR_VOCAB",
        reason: "RECENT_MISTAKES",
      });
    const plan = await repo.create(
      uid,
      {
        goalId: goal.id,
        weekIndex: 1,
        startsOn: "2026-11-13",
        endsOn: "2026-11-19",
        source: "RULE",
      },
      items,
    );
    await db.transaction((m) => progress.syncPlan(m, goal, plan, now));
    if (opts.partial)
      await db.query(
        "UPDATE study_plan_items SET done_count=1,completed_at=$2 WHERE plan_id=$1 AND activity_type='MISTAKE_REVIEW'",
        [plan.id, now],
      );
    return {
      uid,
      actor,
      goal,
      plan,
      original: await repo.findItems(uid, plan.id),
    };
  };
  const lan = await scenario({ third: false });
  assert.equal((await plans.current(lan.actor)).needsPlacementReplan, false);
  await plans.replanAfterPlacementBatch();
  assert.deepEqual(await repo.findItems(lan.uid, lan.plan.id), lan.original);
  await submit(lan.uid, listening, 3);
  await db.transaction((m) => progress.syncPlan(m, lan.goal, lan.plan, now));
  const completedOriginal = await repo.findItems(lan.uid, lan.plan.id);
  const read = await overview.overview(lan.actor);
  assert.equal(read.needsSync, true);
  assert.equal(read.plan!.replannedAfterPlacementAt, null);
  assert.deepEqual(
    await repo.findItems(lan.uid, lan.plan.id),
    completedOriginal,
    "GET overview remains read-only",
  );
  const start = Date.now();
  await Promise.all([
    worker.runBatch(),
    plans.sync(lan.actor),
    plans.current(lan.actor),
    overview.sync(lan.actor),
  ]);
  assert.ok(
    Date.now() - start < 60000,
    "one worker cycle completes within 60 seconds on local fixture",
  );
  const after = await repo.findItems(lan.uid, lan.plan.id),
    view = await plans.current(lan.actor);
  assert.ok(view.plan!.replannedAfterPlacementAt);
  assert.equal(view.needsPlacementReplan, false);
  assert.deepEqual(
    after.filter((i) => i.scheduled_on <= "2026-11-15"),
    completedOriginal.filter((i) => i.scheduled_on <= "2026-11-15"),
  );
  assert.equal(
    after.find(
      (i) => i.scheduled_on === "2026-11-16" && i.activity_type === "TEST",
    )!.test_id,
    matched.id,
  );
  assert.equal(
    after.find(
      (i) => i.scheduled_on === "2026-11-16" && i.activity_type === "TEST",
    )!.retrieval!.matchCount,
    2,
  );
  for (const old of completedOriginal.filter(
    (i) => i.scheduled_on > "2026-11-15",
  ))
    assert.ok(!after.some((i) => i.id === old.id));
  await Promise.all([worker.runBatch(), plans.sync(lan.actor)]);
  assert.deepEqual(await repo.findItems(lan.uid, lan.plan.id), after);
  const history = await scenario({ placement: false });
  assert.equal(
    (await plans.current(history.actor)).needsPlacementReplan,
    false,
  );
  const partial = await scenario({ partial: true });
  now = new Date("2026-11-16T05:00:00Z");
  await plans.sync(partial.actor);
  const partialAfter = await repo.findItems(partial.uid, partial.plan.id);
  assert.deepEqual(
    partialAfter.filter((i) => i.scheduled_on <= "2026-11-16"),
    partial.original.filter((i) => i.scheduled_on <= "2026-11-16"),
  );
  assert.equal(
    partialAfter.find(
      (i) => i.scheduled_on === "2026-11-17" && i.activity_type === "TEST",
    )!.test_id,
    matched.id,
  );
  // Old AI jobs can finish, but must not replace the post-placement RULE plan.
  await db.transaction((m) =>
    (reports as any).applyPlanLocked(
      m,
      {
        user_id: lan.uid,
        goal_id: lan.goal.id,
        kind: "PLAN_START",
        created_at: new Date("2026-11-13"),
        snapshot: { plan: { weekIndex: 1, endsOn: "2026-11-19" } },
      },
      { plan: { items: [] } },
    ),
  );
  assert.deepEqual(await repo.findItems(lan.uid, lan.plan.id), after);
  const interrupted = await scenario();
  const replace = reports.replaceUntouched.bind(reports);
  reports.replaceUntouched = async (...args) => {
    await replace(...args);
    throw new Error("SIMULATED_COMMIT_FAILURE");
  };
  await assert.rejects(
    plans.sync(interrupted.actor),
    /SIMULATED_COMMIT_FAILURE/,
  );
  assert.deepEqual(
    await repo.findItems(interrupted.uid, interrupted.plan.id),
    interrupted.original,
    "replacement and marker roll back together",
  );
  assert.equal(
    (await repo.findWeek(interrupted.uid, interrupted.goal.id, 1))!
      .replanned_after_placement_at,
    null,
  );
  reports.replaceUntouched = replace;
  const build = candidates.build.bind(candidates);
  candidates.build = async (...args) => {
    const result = await build(...args);
    await args[0].query("UPDATE tests SET archived_at=now() WHERE id=$1", [
      matched.id,
    ]);
    return result;
  };
  await plans.sync(interrupted.actor);
  assert.equal(
    (await repo.findWeek(interrupted.uid, interrupted.goal.id, 1))!
      .replanned_after_placement_at,
    null,
    "archive race defers replan",
  );
  assert.deepEqual(
    await repo.findItems(interrupted.uid, interrupted.plan.id),
    interrupted.original,
  );
  candidates.build = build;
  await db.query("UPDATE tests SET archived_at=NULL WHERE id=$1", [matched.id]);
  await plans.sync(interrupted.actor);
  assert.ok(
    (await plans.current(interrupted.actor)).plan!.replannedAfterPlacementAt,
  );
  const disabled = await scenario();
  config.set("PERSONALIZATION_RAG_ENABLED", false);
  assert.equal(
    (await plans.current(disabled.actor)).needsPlacementReplan,
    false,
  );
  assert.equal(await plans.replanAfterPlacementBatch(), 0);
  await plans.sync(disabled.actor);
  assert.equal(
    (await plans.current(disabled.actor)).plan!.replannedAfterPlacementAt,
    null,
  );
  assert.equal(embeddingCalls, beforeEmbeddings, "R4 never invokes embeddings");
  console.log(
    "PASS R4 Lan: 2/3 no-op, 3/3 replans day4 with matching questions, progress frozen, concurrent worker/sync/GET once, day4 progress preserved, prior-band plan excluded, stale AI guard, rollback, archive race retry, flag off, no provider calls.",
  );
});
