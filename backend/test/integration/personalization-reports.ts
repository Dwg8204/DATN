import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { withPersonalizationDatabase } from './personalization-fixture';
import { createGeminiServices } from '../../src/features/ai-shared/create-gemini-services';
import { LearningGoalsRepository } from '../../src/features/personalization/repositories/learning-goals.repository';
import { LearningInsightsRepository } from '../../src/features/personalization/repositories/learning-insights.repository';
import { StudyPlansRepository } from '../../src/features/personalization/repositories/study-plans.repository';
import { PlanProgressRepository } from '../../src/features/personalization/repositories/plan-progress.repository';
import { GoalsService } from '../../src/features/personalization/services/goals.service';
import { SnapshotService } from '../../src/features/personalization/services/snapshot.service';
import { MistakeSourceService } from '../../src/features/personalization/services/mistake-source.service';
import { PlanCandidatesService } from '../../src/features/personalization/services/plan-candidates.service';
import { PlanService } from '../../src/features/personalization/services/plan.service';
import { PersonalizationAiService } from '../../src/features/personalization/services/personalization-ai.service';
import { ReportJobsService } from '../../src/features/personalization/services/report-jobs.service';
import { ReportsService } from '../../src/features/personalization/services/reports.service';
import { CommentGenerationWorker } from '../../src/features/personalization/workers/comment-generation.worker';
import { NotificationsRepository } from '../../src/features/notifications/repositories/notifications.repository';
import { NotificationsService } from '../../src/features/notifications/services/notifications.service';
import { MailService } from '../../src/features/auth/services/mail.service';
import { NotificationsGateway } from '../../src/features/notifications/gateways/notifications.gateway';
import { ReportJob, WeeklyContent } from '../../src/features/personalization/ai/report.contract';
import { AuthUser } from '../../src/features/auth/types/auth-user.type';

withPersonalizationDatabase(async (db, alice, bob) => {
  let now = new Date('2026-10-01T02:00:00Z');
  const clock = { now: () => now };
  const config = new ConfigService({
    PERSONALIZATION_AI_ENABLED: true, PERSONALIZATION_MAX_RPM: 100, CHATBOT_MODEL: 'fixture',
    GEMINI_BILLING_TIER: 'FREE', GEMINI_FREE_PROJECT_CONFIRMED: true, GEMINI_PAID_PROJECT_CONFIRMED: false,
    GEMINI_API_KEY: 'fixture-only', GEMINI_MAX_RPM: 100,
  });
  const ai = new PersonalizationAiService(config, createGeminiServices(config, db).jsonGeneration);
  const goalRepo = new LearningGoalsRepository(db);
  const planRepo = new StudyPlansRepository(db);
  const progress = new PlanProgressRepository(planRepo);
  const goals = new GoalsService(db, goalRepo, clock, progress);
  const mistakes = { recent: async () => [] } as unknown as MistakeSourceService;
  const snapshots = new SnapshotService(db, goals, goalRepo, mistakes, clock);
  const candidates = new PlanCandidatesService();
  const jobs = new ReportJobsService(db, goals, goalRepo, new LearningInsightsRepository(db), snapshots, candidates, planRepo, progress, clock, ai);
  const plans = new PlanService(db, goals, planRepo, progress, snapshots, candidates, clock, mistakes, jobs);
  const reports = new ReportsService(db, clock);
  const workers = [0, 1].map(() => new CommentGenerationWorker(db, ai, clock, jobs));
  const actor = { id: alice, role: 'STUDENT' } as AuthUser;
  const testId = randomUUID(), snapshotId = randomUUID();
  await db.query("INSERT INTO tests(id,created_by,title,component,purpose,scope) VALUES($1,$2,'PRIVATE_TITLE','READING','PRACTICE','FULL_SKILL')", [testId, alice]);
  await db.query("INSERT INTO test_snapshots(id,test_id,version,schema_version,snapshot,content_hash) VALUES($1,$2,1,1,'{}',$3)", [snapshotId, testId, 'a'.repeat(64)]);
  await db.query("UPDATE tests SET status='PUBLISHED',published_snapshot_id=$2 WHERE id=$1", [testId, snapshotId]);
  const goal = await goalRepo.create(alice, { targetCefr: 'B2', targetTests: 60, durationDays: 30, startDate: '2026-10-01', timezone: 'Asia/Bangkok' });
  let calls = 0, invalid = false, quota = false;
  const originalFetch = global.fetch;
  global.fetch = async (_url, options) => {
    calls++;
    const payload = JSON.parse(String(options?.body));
    const promptText = payload.contents[0].parts[0].text;
    for (const forbidden of [alice, bob, testId, 'PRIVATE_TITLE', 'sourceAttemptId', 'questionKeys', 'gradingFingerprint'])
      assert.ok(!promptText.includes(forbidden), `prompt excludes ${forbidden}`);
    assert.equal(payload.tools, undefined);
    assert.equal(payload.generationConfig.temperature, 0.2);
    if (quota) return new Response('{}', { status: 429, headers: { 'retry-after': '60' } });
    const prompt = JSON.parse(promptText);
    if (prompt.outcome) return new Response(JSON.stringify({
      candidates: [{ finishReason: 'STOP', content: { role: 'model', parts: [{ text: JSON.stringify({
        headline: 'Tổng kết mục tiêu', narrative: 'Tiếp tục luyện tập.', achievements: [],
        nextGoalSuggestion: { targetCefr: 'B2', targetTests: 40, durationDays: 30 },
      }) }] } }], usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 100 },
    }), { status: 200 });
    const c = prompt.candidates.find((entry: { activityType: string }) => entry.activityType === 'TEST');
    const content: WeeklyContent = { plan: { items: Array.from({ length: prompt.plan.days }, (_, day) => ({
      dayIndex: day + 1, candidateId: c.candidateId, targetCount: Math.max(1, prompt.plan.requiredPace),
      reason: 'Duy trì thói quen luyện tập.',
    })) } };
    if (prompt.kind !== 'PLAN_START') content.report = {
      headline: 'Tiếp tục luyện tập', narrative: 'Hãy duy trì việc học để tiến tới mục tiêu.', wins: [], nextSteps: [],
      ...(prompt.kind === 'MIDTERM' ? { progressSoFar: 'Bạn đang xây dựng thói quen học tập.' } : {}),
    };
    if (invalid) { invalid = false; content.plan.items[0].candidateId = 'invented'; }
    return new Response(JSON.stringify({
      candidates: [{ finishReason: 'STOP', content: { role: 'model', parts: [{ text: JSON.stringify(content) }] } }],
      usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 100 },
    }), { status: 200 });
  };
  const runAi = () => Promise.all(workers.map(worker => worker.runBatch()));
  const inserted = async (date: string) => db.query(
    `INSERT INTO test_attempts(student_id,snapshot_id,component,scope,status,purpose,started_at,submitted_at,score,max_score,result)
     VALUES($1,$2,'READING','FULL_SKILL','SUBMITTED','PRACTICE',$3,$3,7,10,'{"method":"OBJECTIVE","parts":[]}')`,
    [alice, snapshotId, new Date(date)],
  );
  const emailSends: Array<{ to: string; reports: Array<{ headline: string; summary: string; actionPath: string }> }> = [];
  const notificationRepo = new NotificationsRepository(db);
  const notificationService = new NotificationsService(notificationRepo, {
    sendLearningReportEmail: async (to: string, entries: Array<{ headline: string; summary: string; actionPath: string }>) => { emailSends.push({ to, reports: entries }); },
  } as unknown as MailService, { emitCreated: () => {} } as unknown as NotificationsGateway);
  try {
    await plans.afterGoalCreated(actor);
    assert.equal((await db.query("SELECT count(*)::int n FROM learning_insights WHERE kind='PLAN_START'"))[0].n, 1);
    const rule = (await plans.current(actor)).plan!;
    assert.equal(rule.source, 'RULE');
    await inserted('2026-10-01T02:00:00Z');
    await plans.current(actor); // One submitted attempt partially completes today's target of two.
    const before = await planRepo.findItems(alice, rule.id);
    const partial = before.find(item => item.activity_type === 'TEST' && item.scheduled_on === '2026-10-01')!;
    assert.equal(partial.done_count, 1);
    await runAi();
    assert.equal(calls, 1, 'two workers generate the initial plan once');
    const after = await planRepo.findItems(alice, rule.id);
    assert.deepEqual(after.find(item => item.id === partial.id), partial, 'partial task and its identifier are preserved');
    assert.equal((await plans.current(actor)).plan!.source, 'AI');
    await runAi();
    assert.equal(calls, 1, 'completed input does not call AI again');
    assert.equal((await db.query('SELECT count(*)::int n FROM notifications'))[0].n, 0, 'PLAN_START is not a report notification');

    now = new Date('2026-10-08T00:00:00Z'); // 07:00 local
    await inserted('2026-10-07T16:59:59Z');
    await inserted('2026-10-07T17:00:00Z'); // Next local day, excluded from W1.
    await Promise.all([jobs.scheduleBatch(), jobs.scheduleBatch()]);
    invalid = true;
    await runAi();
    assert.equal(calls, 3, 'unknown candidate causes exactly one repair');
    const [weekly] = await db.query("SELECT * FROM learning_insights WHERE goal_id=$1 AND period_key='W1'", [goal.id]);
    assert.equal(weekly.status, 'READY');
    assert.equal((weekly.snapshot as ReportJob).learner.period.completed, 2);
    assert.equal((weekly.snapshot as ReportJob).learner.cumulative.completed, 2);
    assert.equal(new Date(weekly.deliver_at).toISOString(), '2026-10-08T01:00:00.000Z');
    assert.equal((await reports.read(alice, weekly.id)).source, 'AI');
    await assert.rejects(() => reports.read(bob, weekly.id), (error: { statusCode: number }) => error.statusCode === 404);
    assert.equal((await reports.list(bob, goal.id)).items.length, 0);
    await reports.enqueueDeliveries();
    assert.equal((await db.query("SELECT count(*)::int n FROM notifications WHERE type='LEARNING_REPORT'"))[0].n, 0);
    now = new Date('2026-10-08T01:00:00Z');
    await Promise.all([reports.enqueueDeliveries(), reports.enqueueDeliveries()]);
    assert.equal((await db.query("SELECT count(*)::int n FROM notifications WHERE type='LEARNING_REPORT'"))[0].n, 2);
    await Promise.all([notificationService.processDueScheduledBatch(25, now), notificationService.processDueScheduledBatch(25, now)]);
    assert.equal(emailSends.length, 1);
    assert.equal(emailSends[0].to, `${alice}@example.invalid`);
    assert.ok(!JSON.stringify(emailSends).includes('PRIVATE_TITLE'));
    assert.ok((await db.query('SELECT notified_at,emailed_at FROM learning_insights WHERE id=$1', [weekly.id]))[0].emailed_at);
    await reports.enqueueDeliveries();
    await notificationService.processDueScheduledBatch(25, now);
    assert.equal(emailSends.length, 1);

    // Downtime: create W2, W3, W4 using each historical cutoff, even after the goal expired.
    now = new Date('2026-11-01T02:00:00Z');
    await goals.current(alice);
    await jobs.scheduleBatch();
    const periods = await db.query("SELECT period_key,kind FROM learning_insights WHERE goal_id=$1 AND kind IN ('WEEKLY','MIDTERM') ORDER BY period_key", [goal.id]);
    assert.deepEqual(periods.map((p: { kind: string }) => p.kind), ['WEEKLY', 'MIDTERM', 'WEEKLY', 'WEEKLY']);
    assert.equal(periods.length, 4);
    await runAi();
    assert.equal(calls, 7);
    const finalPartial = (await db.query("SELECT snapshot FROM learning_insights WHERE goal_id=$1 AND period_key='W4'", [goal.id]))[0].snapshot as ReportJob;
    assert.equal(finalPartial.plan.days, 2);
    assert.equal((await db.query("SELECT count(*)::int n FROM study_plans WHERE goal_id=$1 AND week_index>=3", [goal.id]))[0].n, 0, 'historical AI must not create plans for expired goals');

    // AI off: numeric reports remain readable and no provider call occurs.
    config.set('PERSONALIZATION_AI_ENABLED', false);
    const secondGoal = await goalRepo.create(alice, { targetCefr: 'B1', targetTests: 10, durationDays: 10, startDate: '2026-10-20', timezone: 'Asia/Bangkok' });
    await jobs.scheduleBatch();
    await runAi();
    assert.equal(calls, 7);
    const [fallback] = await db.query("SELECT * FROM learning_insights WHERE goal_id=$1 AND kind='WEEKLY'", [secondGoal.id]);
    assert.equal(fallback.status, 'FALLBACK');
    assert.equal((await reports.read(alice, fallback.id)).source, 'RULE');
    assert.equal(new Date(fallback.deliver_at).toISOString(), '2026-11-02T01:00:00.000Z', 'finished after 08:00 defers until next morning');
    now = new Date('2026-11-02T01:00:00Z');
    await reports.enqueueDeliveries();
    await notificationService.processDueScheduledBatch(25, now);
    assert.equal(emailSends.length, 2);
    assert.equal(emailSends[1].reports.length, 5, 'multiple goals, final and overdue periods share one email');

    // Delivery rechecks opt-out after enqueue; web remains available.
    await db.query("UPDATE learning_goals SET status='EXPIRED',ended_at=$2 WHERE id=$1", [secondGoal.id, now]);
    const thirdGoal = await goalRepo.create(alice, { targetCefr: 'B1', targetTests: 10, durationDays: 10, startDate: '2026-11-01', timezone: 'Asia/Bangkok' });
    now = new Date('2026-11-08T00:00:00Z');
    await jobs.scheduleBatch();
    now = new Date('2026-11-08T01:00:00Z');
    await reports.enqueueDeliveries();
    await db.query("INSERT INTO learner_preferences(user_id,email_report_enabled) VALUES($1,false) ON CONFLICT(user_id) DO UPDATE SET email_report_enabled=false", [alice]);
    await notificationService.processDueScheduledBatch(25, now);
    assert.equal(emailSends.length, 2);
    const [optout] = await db.query("SELECT notified_at,emailed_at FROM learning_insights WHERE goal_id=$1 AND kind='WEEKLY'", [thirdGoal.id]);
    assert.ok(optout.notified_at);
    assert.equal(optout.emailed_at, null);

    // Re-enable: 429 keeps retry_count and permits a later successful attempt.
    config.set('PERSONALIZATION_AI_ENABLED', true);
    quota = true;
    await runAi();
    const [deferred] = await db.query("SELECT retry_count,status,next_retry_at FROM learning_insights WHERE status='FAILED' ORDER BY created_at LIMIT 1");
    assert.equal(deferred.retry_count, 0);
    assert.ok(deferred.next_retry_at > now);
    assert.equal(deferred.status, 'FAILED');
    console.log('PASS GĐ7: START, single-call weekly+plan, MIDTERM, historical cutoff, 30-day schedule, partial progress preservation, 08:00, concurrent workers, email grouping, opt-out, ownership, fallback, 429 and candidate repair.');
  } finally { global.fetch = originalFetch; }
}).catch(error => { console.error(error); process.exitCode = 1; });
