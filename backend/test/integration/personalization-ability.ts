import { AddGoalBaselineProfile1760000021000 } from '../../src/database/migrations/1760000021000-AddGoalBaselineProfile';
import { StudentDashboardService } from '../../src/features/test-attempts/services/student-dashboard.service';
import { TestAttemptsRepository } from '../../src/features/test-attempts/repositories/test-attempts.repository';
import { StudentDashboardQueryDto } from '../../src/features/test-attempts/dto/student-dashboard-query.dto';
import { ChatbotContext } from '../../src/features/chatbot/chatbot.context';
import { TestAttemptsService } from '../../src/features/test-attempts/services/test-attempts.service';
import { PracticeAttemptsService } from '../../src/features/test-attempts/services/practice-attempts.service';
import { AuthUser } from "../../src/features/auth/types/auth-user.type";
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
import { PlanCandidatesService } from "../../src/features/personalization/services/plan-candidates.service";
import { PersonalizationAiService } from "../../src/features/personalization/services/personalization-ai.service";
import { ReportJobsService } from "../../src/features/personalization/services/report-jobs.service";

import { readAbilityProfile } from "../../src/features/ai-shared/ability-profile.repository";
import { buildRulePlan } from "../../src/features/personalization/policies/rule-plan";
withPersonalizationDatabase(async (db, alice, bob) => {
  const migration=new AddGoalBaselineProfile1760000021000(), runner=db.createQueryRunner();
  await runner.connect();
  try {
    await migration.down(runner);
    const columns=await runner.query("SELECT column_name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='learning_goals' AND column_name='baseline_profile'");
    assert.equal(columns.length,0);
    const [old]=await runner.query("INSERT INTO learning_goals(user_id,target_cefr,target_test_count,duration_days,start_date,timezone,status) VALUES($1,'B2',6,7,'2026-09-01','Asia/Bangkok','CANCELLED') RETURNING id",[bob]);
    await migration.up(runner);
    assert.equal((await runner.query('SELECT baseline_profile FROM learning_goals WHERE id=$1',[old.id]))[0].baseline_profile,null);
  } finally { await runner.release(); }
  let now = new Date("2026-10-10T05:00Z");
  const clock = { now: () => now };
  const repo = new LearningGoalsRepository(db),
    plans = new StudyPlansRepository(db),
    progress = new PlanProgressRepository(plans);
  const goals = new GoalsService(db, repo, clock, progress);
  const snapshots = new SnapshotService(
    db,
    goals,
    repo,
    { recent: async () => [] } as unknown as MistakeSourceService,
    clock,
  );
  const config = new ConfigService({ PERSONALIZATION_AI_ENABLED: false });
  const ai = new PersonalizationAiService(
    config,
    createGeminiServices(config, db).jsonGeneration,
  );
  const jobs = new ReportJobsService(
    db,
    goals,
    repo,
    new LearningInsightsRepository(db),
    snapshots,
    new PlanCandidatesService(),
    plans,
    progress,
    clock,
    ai,
  );
  const ids: Record<string, string> = {};
  for (const skill of ["READING", "LISTENING"]) {
    const tid = randomUUID(),
      sid = randomUUID();
    ids[skill] = sid;
    await db.query(
      "INSERT INTO tests(id,created_by,title,component,purpose,scope) VALUES($1,$2,'Ability fixture',$3,'PRACTICE','FULL_SKILL')",
      [tid, alice, skill],
    );
    await db.query(
      "INSERT INTO test_snapshots(id,test_id,version,schema_version,snapshot,content_hash) VALUES($1,$2,1,1,'{}',$3)",
      [sid, tid, "a".repeat(64)],
    );
    await db.query(
      "UPDATE tests SET status='PUBLISHED',published_snapshot_id=$2 WHERE id=$1",
      [tid, sid],
    );
  }
  const insert = async (skill: string, band: string, date: string) =>
    db.query(
      `INSERT INTO test_attempts(student_id,snapshot_id,component,scope,status,purpose,started_at,submitted_at,score,max_score,estimated_cefr,result)
 VALUES($1,$2,$3,'FULL_SKILL','SUBMITTED','PRACTICE',$4,$4,2,10,$5,$6)`,
      [
        alice,
        ids[skill],
        skill,
        date,
        band,
        {
          method: "OBJECTIVE",
          parts: [{ partNumber: 1, score: 2, maxScore: 10 }],
        },
      ],
    );
  for (const skill of ["READING", "LISTENING"])
    for (const day of [8, 9])
      await insert(skill, "A2", "2026-10-" + day + "T05:00Z");
  const created = (
    await goals.create(alice, {
      targetCefr: "B2",
      targetTests: 6,
      durationDays: 7,
    })
  ).goal;
  const goal = (await repo.findById(alice, created.id))!;
  assert.equal(goal.baseline_profile?.overall.band, "A2");
  const start = await snapshots.build(
    { id: alice, role: "STUDENT" } as AuthUser,
    goal,
    { kind: "GOAL" },
    now,
  );
  assert.equal(start.goal?.completed, 0);
  assert.equal(start.band.overallEstimate, "A2");
  assert.ok(start.weak.parts.some((p) => p.skill === "READING"));
  const actor = {id:alice,role:'STUDENT'} as AuthUser;
  const dashboard = await new StudentDashboardService(new TestAttemptsRepository(db)).get(actor,new StudentDashboardQueryDto());
  assert.equal(dashboard.averageBand,start.band.overallEstimate);
  const chat = await new ChatbotContext(db,{} as TestAttemptsService,{} as PracticeAttemptsService,snapshots).stats(actor);
  assert.equal('band' in chat ? chat.band.overallEstimate : null,start.band.overallEstimate);
  const weakId = randomUUID(),
    weakSnapshot = randomUUID();
  await db.query(
    "INSERT INTO tests(id,created_by,title,component,purpose,scope,part_number) VALUES($1,$2,'Weak Part','READING','PRACTICE','PART',1)",
    [weakId, alice],
  );
  await db.query(
    "INSERT INTO test_snapshots(id,test_id,version,schema_version,snapshot,content_hash) VALUES($1,$2,1,1,'{}',$3)",
    [weakSnapshot, weakId, "c".repeat(64)],
  );
  await db.query(
    "UPDATE tests SET status='PUBLISHED',published_snapshot_id=$2 WHERE id=$1",
    [weakId, weakSnapshot],
  );
  const candidates = await new PlanCandidatesService().build(
    db.manager,
    alice,
    start,
    1,
  );
  assert.ok(
    buildRulePlan(candidates, "2026-10-10", "2026-10-16", 1, 6).some(
      (i) => i.activityType === "TEST" && i.testId === weakId,
    ),
  );
  for (const skill of ["READING", "LISTENING"])
    for (const day of [11, 12, 13])
      await insert(skill, "B2", "2026-10-" + day + "T05:00Z");
  // A later result must not change the final cutoff profile.
  for (const skill of ["READING", "LISTENING"])
    await insert(skill, "C", "2026-10-15T05:00Z");
  now = new Date("2026-10-14T05:00Z");
  const historical = await snapshots.build(
    { id: alice, role: "STUDENT" } as AuthUser,
    goal,
    { kind: "FINAL" },
    now,
  );
  assert.equal(historical.band.overallEstimate, "B2");
  assert.equal(historical.baseline?.overall.band, "A2");
  assert.deepEqual(
    historical.bandChange.find((x) => x.skill === "READING"),
    { skill: "READING", baseline: "A2", current: "B2" },
  );
  await goals.current(alice);
  await goals.end(alice, goal.id, true);
  await jobs.scheduleBatch();
  const [final] = await db.query(
    "SELECT snapshot FROM learning_insights WHERE goal_id=$1 AND kind='FINAL'",
    [goal.id],
  );
  assert.equal(final.snapshot.outcome.bandTargetStatus, "REACHED");
  assert.equal(final.snapshot.learner.band.overallEstimate, "B2");
  const current = await readAbilityProfile(db.manager, alice, now);
  assert.equal(current.overall.band, historical.band.overallEstimate);
  const second = (
    await goals.create(alice, {
      targetCefr: "C",
      targetTests: 6,
      durationDays: 7,
    })
  ).goal;
  assert.equal(
    (await repo.findById(alice, second.id))?.baseline_profile?.overall.band,
    "B2",
  );
  const replaced = (
    await goals.replace(alice, {
      goalId: second.id,
      targetCefr: "C",
      targetTests: 6,
      durationDays: 7,
    })
  ).goal;
  assert.equal(
    (await repo.findById(alice, replaced.id))?.baseline_profile?.overall.band,
    "B2",
  );
  assert.equal(
    (await repo.findById(alice, goal.id))?.baseline_profile?.overall.band,
    "A2",
  );
  console.log(
    "PASS S2: migration up/down/up, old NULL baseline, history before goal, zero in-goal count, A2 to B2 FINAL cutoff, create/replace baseline preservation.",
  );
}).catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
