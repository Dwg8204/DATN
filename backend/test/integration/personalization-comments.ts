import * as assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { ConfigService } from "@nestjs/config";
import { withPersonalizationDatabase } from "./personalization-fixture";
import { createGeminiServices } from "../../src/features/ai-shared/create-gemini-services";
import { LearningGoalsRepository } from "../../src/features/personalization/repositories/learning-goals.repository";
import { LearningInsightsRepository } from "../../src/features/personalization/repositories/learning-insights.repository";
import { StudyPlansRepository } from "../../src/features/personalization/repositories/study-plans.repository";
import { PlanProgressRepository } from "../../src/features/personalization/repositories/plan-progress.repository";
import { GoalsService } from "../../src/features/personalization/services/goals.service";
import { SnapshotService } from "../../src/features/personalization/services/snapshot.service";
import { MistakeSourceService } from "../../src/features/personalization/services/mistake-source.service";
import { PersonalizationAiService } from "../../src/features/personalization/services/personalization-ai.service";
import { CommentsService } from "../../src/features/personalization/services/comments.service";
import { CommentGenerationWorker } from "../../src/features/personalization/workers/comment-generation.worker";
import { AuthUser } from "../../src/features/auth/types/auth-user.type";
import { localDay } from "../../src/features/personalization/policies/calendar";

withPersonalizationDatabase(async (db, alice, bob) => {
  let now = new Date();
  const clock = { now: () => now };
  const config = new ConfigService({
    PERSONALIZATION_AI_ENABLED: true,
    PERSONALIZATION_MAX_RPM: 100,
    CHATBOT_MODEL: "fixture-free-model",
    GEMINI_BILLING_TIER: "FREE",
    GEMINI_FREE_PROJECT_CONFIRMED: true,
    GEMINI_PAID_PROJECT_CONFIRMED: false,
    GEMINI_API_KEY: "fixture-only",
    GEMINI_MAX_RPM: 100,
  });
  const { jsonGeneration } = createGeminiServices(config, db);
  const ai = new PersonalizationAiService(config, jsonGeneration);
  const goalRepo = new LearningGoalsRepository(db);
  const goals = new GoalsService(
    db,
    goalRepo,
    clock,
    new PlanProgressRepository(new StudyPlansRepository(db)),
  );
  const snapshots = new SnapshotService(
    db,
    goals,
    goalRepo,
    { recent: async () => [] } as unknown as MistakeSourceService,
    clock,
  );
  const insights = new LearningInsightsRepository(db);
  const comments = new CommentsService(
    db,
    goals,
    goalRepo,
    insights,
    snapshots,
    clock,
    ai,
  );
  const syncComment = (actor: AuthUser) =>
    db.transaction(async (manager) => {
      const timezone = await goals.lockUser(manager, actor.id);
      return comments.syncLocked(actor, manager, timezone);
    });

  const workers = [0, 1].map(() => new CommentGenerationWorker(db, ai, clock));
  const actor = (id: string) => ({ id, role: "STUDENT" }) as AuthUser;
  const good = {
    statusEcho: "ON_TRACK",
    bandClaim: "NONE",
    summary: "Bạn đang duy trì luyện tập.",
    strengths: [],
    focus: ["Tiếp tục luyện tập để có thêm dữ liệu."],
  };
  let calls = 0,
    invalid = 0,
    quota = false;
  const originalFetch = global.fetch;
  global.fetch = async (_url, options) => {
    calls++;
    const payload = JSON.parse(String(options?.body));
    assert.equal(payload.generationConfig.temperature, 0.2);
    assert.equal(payload.tools, undefined);
    const prompt = payload.contents[0].parts[0].text;
    for (const forbidden of [
      alice,
      bob,
      "PRIVATE_ANSWER",
      "@example.invalid",
      "attemptId",
      "gradingFingerprint",
    ])
      assert.ok(!prompt.includes(forbidden));
    if (quota)
      return new Response("{}", {
        status: 429,
        headers: { "retry-after": "60" },
      });
    const text = invalid-- > 0 ? "{invalid-json" : JSON.stringify(good);
    return new Response(
      JSON.stringify({
        candidates: [
          {
            finishReason: "STOP",
            content: { role: "model", parts: [{ text }] },
          },
        ],
        usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 30 },
      }),
      { status: 200 },
    );
  };
  try {
    assert.equal((await syncComment(actor(alice))).status, "HIDDEN");
    const testId = randomUUID(),
      snapshotId = randomUUID();
    await db.query(
      "INSERT INTO tests(id,created_by,title,component,purpose,scope) VALUES($1,$2,'PRIVATE_ANSWER','READING','EXAM','FULL_SKILL')",
      [testId, alice],
    );
    await db.query(
      "INSERT INTO test_snapshots(id,test_id,version,schema_version,snapshot,content_hash) VALUES($1,$2,1,1,'{}',$3)",
      [snapshotId, testId, "a".repeat(64)],
    );
    const submit = async (user: string, method = "OBJECTIVE") => {
      const [row] = await db.query<Array<{ id: string }>>(
        `INSERT INTO test_attempts(student_id,snapshot_id,component,scope,status,purpose,started_at,submitted_at,score,max_score,result)
        VALUES($1,$2,'READING','FULL_SKILL','SUBMITTED','EXAM',$3,$3,7,10,$4) RETURNING id`,
        [
          user,
          snapshotId,
          now,
          {
            method,
            privateAnswer: "PRIVATE_ANSWER",
            parts: [{ partNumber: 1, score: 7, maxScore: 10 }],
          },
        ],
      );
      return row.id;
    };
    const pending = await submit(alice, "PENDING_AI");
    assert.equal((await syncComment(actor(alice))).status, "HIDDEN");
    await db.query(
      "UPDATE test_attempts SET result=jsonb_set(result,'{method}','\"OBJECTIVE\"') WHERE id=$1",
      [pending],
    );
    assert.equal(await comments.needsSync(actor(alice)), true);
    assert.equal((await comments.current(actor(alice))).status, "HIDDEN");
    assert.equal(
      (await db.query("SELECT count(*)::int n FROM learning_insights"))[0].n,
      0,
    );
    const queued = await Promise.all([
      syncComment(actor(alice)),
      syncComment(actor(alice)),
    ]);
    assert.ok(queued.every((row) => row.status === "PENDING"));
    assert.equal(
      (await db.query("SELECT count(*)::int n FROM learning_insights"))[0].n,
      1,
    );
    await Promise.all(workers.map((worker) => worker.runBatch()));
    assert.equal(calls, 1);
    const ready = await syncComment(actor(alice));
    assert.equal(ready.status, "READY");
    assert.deepEqual(ready.comment?.content, good);
    assert.equal((await syncComment(actor(bob))).status, "HIDDEN");
    assert.equal(await insights.findById(bob, ready.comment!.id), null);
    const [request] = await db.query(
      "SELECT status,input_tokens,output_tokens FROM ai_requests WHERE purpose='PERSONAL_COMMENT'",
    );
    assert.equal(request.status, "COMPLETED");
    assert.equal(Number(request.input_tokens), 100);
    assert.equal(Number(request.output_tokens), 30);
    await submit(alice);
    assert.equal(
      (await syncComment(actor(alice))).comment?.id,
      ready.comment?.id,
      "one comment per local day",
    );
    now = new Date(now.getTime() + 86_400_000);
    assert.equal((await syncComment(actor(alice))).status, "PENDING");
    invalid = 1;
    await workers[0].runBatch();
    assert.equal(calls, 3, "invalid output gets exactly one immediate repair");
    assert.equal((await syncComment(actor(alice))).status, "READY");
    now = new Date(now.getTime() + 86_400_000);
    await syncComment(actor(alice));
    await workers[0].runBatch();
    assert.equal(calls, 3, "time alone cannot trigger generation");

    await submit(bob);
    await syncComment(actor(bob));
    config.set("PERSONALIZATION_AI_ENABLED", false);
    await workers[0].runBatch();
    assert.equal(calls, 3);
    assert.equal(
      (await syncComment(actor(alice))).status,
      "HIDDEN",
      "disabled hides old comments too",
    );
    config.set("PERSONALIZATION_AI_ENABLED", true);
    quota = true;
    await workers[0].runBatch();
    assert.equal(calls, 4);
    const [failed] = await db.query(
      "SELECT retry_count,status,next_retry_at FROM learning_insights WHERE user_id=$1",
      [bob],
    );
    assert.equal(failed.retry_count, 0, "429 does not consume a retry");
    assert.equal(failed.status, "FAILED");
    assert.ok(failed.next_retry_at > now);
    assert.equal((await comments.current(actor(bob))).status, "RETRYING");
    const retrying = await comments.current(actor(bob));
    assert.ok('nextRetryAt' in retrying);
    assert.equal(retrying.nextRetryAt?.getTime(), failed.next_retry_at.getTime());
    assert.equal(
      (
        await db.query(
          "SELECT status FROM ai_requests WHERE error_code='PERSONALIZATION_QUOTA'",
        )
      )[0].status,
      "FAILED",
    );

    // Feature quota uses persisted request reservations, including failures, across worker instances.
    await db.query("UPDATE ai_requests SET started_at=$1 WHERE user_id=$2", [
      now,
      bob,
    ]);
    await db.query(
      `INSERT INTO ai_requests(user_id,purpose,provider,model,status,started_at,idempotency_key,request_fingerprint,config_snapshot,pricing_snapshot,currency)
      SELECT $1,'PERSONAL_COMMENT','gemini','fixture','FAILED',$2,gen_random_uuid(),repeat('a',64),'{}','{}','USD' FROM generate_series(1,5)`,
      [bob, now],
    );
    await db.query(
      "UPDATE learning_insights SET next_retry_at=NULL WHERE user_id=$1",
      [bob],
    );
    await Promise.all(workers.map((worker) => worker.runBatch()));
    assert.equal(calls, 4, "six daily calls blocks a seventh");
    assert.equal(
      (
        await db.query(
          "SELECT retry_count FROM learning_insights WHERE user_id=$1",
          [bob],
        )
      )[0].retry_count,
      0,
    );
    await submit(alice);
    assert.equal((await syncComment(actor(alice))).status, "PENDING");
    config.set("PERSONALIZATION_MAX_RPM", 1);
    await workers[0].runBatch();
    assert.equal(calls, 4, "persisted RPM window blocks calls across users");
    config.set("PERSONALIZATION_MAX_RPM", 100);
    await db.query(
      "UPDATE learning_insights SET status='FALLBACK',next_retry_at=NULL WHERE user_id=$1",
      [bob],
    );
    quota = false;
    invalid = 100;
    // A fresh process has no in-memory 429 cooldown; retry accounting remains in PostgreSQL.
    const freshAi = new PersonalizationAiService(
      config,
      createGeminiServices(config, db).jsonGeneration,
    );
    const freshWorker = new CommentGenerationWorker(db, freshAi, clock);
    const delays = [15 * 60_000, 60 * 60_000, 4 * 60 * 60_000];
    for (let retry = 0; retry < 4; retry++) {
      now = new Date(now.getTime() + 86_400_000);
      await freshWorker.runBatch();
      const [state] = await db.query(
        "SELECT status,retry_count,next_retry_at FROM learning_insights WHERE user_id=$1 ORDER BY created_at DESC,id DESC LIMIT 1",
        [alice],
      );
      assert.equal(state.retry_count, retry + 1);
      assert.equal(state.status, retry < 3 ? "FAILED" : "FALLBACK");
      assert.equal(
        (await comments.current(actor(alice))).status,
        retry < 3 ? "RETRYING" : "FALLBACK",
      );
      if (retry < 3)
        assert.equal(
          state.next_retry_at.getTime() - now.getTime(),
          delays[retry],
        );
      else assert.equal(state.next_retry_at, null);
    }
    assert.equal(
      calls,
      12,
      "initial attempt and three retries each permit only one schema repair",
    );
    await freshWorker.runBatch();
    assert.equal(calls, 12, "fallback stops further automatic retries");
    assert.ok(localDay(now, "Asia/Bangkok"));
    console.log(
      "PASS GĐ6: private prompt, scored-only triggers, ownership, concurrent queue/workers, daily comment, repair, token recording, AI disabled, 429 backoff, unchanged inputs and six-call quota.",
    );
  } finally {
    global.fetch = originalFetch;
  }
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
