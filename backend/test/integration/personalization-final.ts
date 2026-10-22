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
import { PersonalizationAiService } from '../../src/features/personalization/services/personalization-ai.service';
import { ReportJobsService } from '../../src/features/personalization/services/report-jobs.service';
import { ReportsService } from '../../src/features/personalization/services/reports.service';
import { CommentGenerationWorker } from '../../src/features/personalization/workers/comment-generation.worker';
import { NotificationsRepository } from '../../src/features/notifications/repositories/notifications.repository';
import { NotificationsService } from '../../src/features/notifications/services/notifications.service';
import { MailService } from '../../src/features/auth/services/mail.service';
import { NotificationsGateway } from '../../src/features/notifications/gateways/notifications.gateway';
import { ReportJob } from '../../src/features/personalization/ai/report.contract';
import { queueFinalReport } from '../../src/features/personalization/services/final-report-queue';
import { FinalContent } from '../../src/features/personalization/ai/final.contract';

withPersonalizationDatabase(async (db, alice, bob) => {
  let now = new Date('2026-10-01T02:00:00Z');
  const clock = { now: () => now };
  const config = new ConfigService({
    PERSONALIZATION_AI_ENABLED: false, PERSONALIZATION_MAX_RPM: 100, CHATBOT_MODEL: 'fixture',
    GEMINI_BILLING_TIER: 'FREE', GEMINI_FREE_PROJECT_CONFIRMED: true, GEMINI_PAID_PROJECT_CONFIRMED: false,
    GEMINI_API_KEY: 'fixture-only', GEMINI_MAX_RPM: 100,
  });
  const ai = new PersonalizationAiService(config, createGeminiServices(config, db).jsonGeneration);
  const goalRepo = new LearningGoalsRepository(db), planRepo = new StudyPlansRepository(db);
  const progress = new PlanProgressRepository(planRepo);
  const goals = new GoalsService(db, goalRepo, clock, progress);
  const snapshots = new SnapshotService(db, goals, goalRepo, { recent: async () => [] } as unknown as MistakeSourceService, clock);
  const jobs = new ReportJobsService(db, goals, goalRepo, new LearningInsightsRepository(db), snapshots, new PlanCandidatesService(), planRepo, progress, clock, ai);
  const reports = new ReportsService(db, clock);
  const workers = [0, 1].map(() => new CommentGenerationWorker(db, ai, clock, jobs));
  const testId = randomUUID(), snapshotId = randomUUID();
  await db.query("INSERT INTO tests(id,created_by,title,component,purpose,scope) VALUES($1,$2,'PRIVATE_TITLE','READING','PRACTICE','FULL_SKILL')", [testId, alice]);
  await db.query("INSERT INTO test_snapshots(id,test_id,version,schema_version,snapshot,content_hash) VALUES($1,$2,1,1,'{}',$3)", [snapshotId, testId, 'b'.repeat(64)]);
  const insertAttempt = (date: Date) => db.query(
    `INSERT INTO test_attempts(student_id,snapshot_id,component,scope,status,purpose,started_at,submitted_at)
     VALUES($1,$2,'READING','FULL_SKILL','SUBMITTED','PRACTICE',$3,$3)`, [alice, snapshotId, date]);
  const readFinal = async (id: string) => (await db.query("SELECT * FROM learning_insights WHERE goal_id=$1 AND kind='FINAL'", [id]))[0];
  const start = async (days: number, tests = 40) => (await goals.create(alice, { targetCefr: 'B2', targetTests: tests, durationDays: days })).goal;
  // Required duration schedules: FINAL only once and no weekly on the last day.
  for (const [days, weekly] of [[3, 0], [10, 1], [14, 1], [30, 4]]) {
    now = new Date('2026-10-01T02:00:00Z');
    const goal = await start(days);
    now = new Date(Date.parse('2026-09-30T17:00:00Z') + days * 86400000);
    await goals.current(alice);
    assert.ok(await readFinal(goal.id), 'lifecycle transaction persists FINAL intent');
    await Promise.all([jobs.scheduleBatch(), jobs.scheduleBatch()]);
    await jobs.scheduleBatch(); // Recover periods skipped while the other worker held the learner lock.
    const rows = await db.query('SELECT * FROM learning_insights WHERE goal_id=$1', [goal.id]);
    assert.equal(rows.filter((r: { kind: string }) => r.kind === 'FINAL').length, 1);
    assert.equal(rows.filter((r: { kind: string }) => ['WEEKLY', 'MIDTERM'].includes(r.kind)).length, weekly);
    assert.equal((await readFinal(goal.id)).status, 'FALLBACK');
  }
  // Reached on day 20/30 remains active: finalize at deadline or explicit early finish.
  now = new Date('2026-12-01T02:00:00Z');
  const delayed = await start(30, 1);
  now = new Date('2026-12-20T02:00:00Z');
  await insertAttempt(now);
  assert.equal((await goals.current(alice)).goal!.status, 'ACTIVE');
  assert.equal(await readFinal(delayed.id), undefined);
  now = new Date('2026-12-30T17:00:00Z');
  await goals.current(alice);
  await jobs.scheduleBatch();
  const delayedJob = (await readFinal(delayed.id)).snapshot as ReportJob;
  assert.equal(delayedJob.outcome!.lifecycle, 'COMPLETED');
  assert.equal(delayedJob.outcome!.targetReachedOn, '2026-12-20');
  assert.equal(delayedJob.outcome!.bandTargetStatus, 'INSUFFICIENT_DATA', 'ungraded test counts but cannot prove band');
  assert.equal(delayedJob.outcome!.endedOn, '2026-12-30', 'deadline midnight belongs to previous goal day');

  now = new Date('2027-01-01T02:00:00Z');
  const early = await start(30, 1);
  await assert.rejects(() => goals.end(alice, early.id, true));
  now = new Date('2027-01-20T02:00:00Z');
  await insertAttempt(now);
  await goals.end(alice, early.id, true);
  assert.ok(await readFinal(early.id));
  await insertAttempt(new Date(now.getTime() + 1000)); // Excluded after early close.
  await jobs.scheduleBatch();
  const earlyFinal = await readFinal(early.id);
  assert.equal(earlyFinal.snapshot.learner.goal.completed, 1);
  assert.equal(earlyFinal.snapshot.learner.period.activeDays, 1);
  assert.equal(earlyFinal.snapshot.outcome.testTargetReached, true);
  assert.equal(earlyFinal.snapshot.outcome.bandTargetStatus, 'INSUFFICIENT_DATA');
  assert.equal(await planRepo.findWeek(alice, early.id, 1), null, 'FINAL never creates a plan');

  // Replacement uses inclusive goal calendar days (same rule as elapsedDays).
  now = new Date('2027-02-01T02:00:00Z');
  const short = await start(30);
  now = new Date('2027-02-02T02:00:00Z');
  const replacement = (await goals.replace(alice, { goalId: short.id, targetCefr: 'B1', targetTests: 20, durationDays: 10 })).goal;
  assert.equal(await readFinal(short.id), undefined, 'replacement on day two has no FINAL');
  now = new Date('2027-02-04T02:00:00Z');
  const next = (await goals.replace(alice, { goalId: replacement.id, targetCefr: 'B2', targetTests: 30, durationDays: 14 })).goal;
  assert.ok(await readFinal(replacement.id), 'replacement on day three queues FINAL atomically');
  await goals.end(alice, next.id, false);
  await jobs.scheduleBatch();
  assert.equal(await readFinal(next.id), undefined, 'CANCELLED never produces FINAL');
  await assert.rejects(() => db.transaction(async manager => {
    const rollbackGoal = await goalRepo.create(bob, { targetCefr: 'B1', targetTests: 10, durationDays: 3, startDate: '2027-02-01', timezone: 'Asia/Bangkok' }, manager);
    await manager.query("UPDATE learning_goals SET status='EXPIRED',ended_at=$2 WHERE id=$1", [rollbackGoal.id, now]);
    await queueFinalReport(manager, rollbackGoal.id);
    throw new Error('ROLLBACK');
  }));
  assert.equal((await reports.list(bob, undefined)).items.length, 0);
  await assert.rejects(() => reports.read(bob, earlyFinal.id), (e: { statusCode: number }) => e.statusCode === 404);
  assert.equal((await reports.list(alice, early.id)).items.filter(r => r.kind === 'FINAL').length, 1);

  // Every metadata attempt counts, while score samples stay bounded at 200.
  now = new Date('2027-03-01T02:00:00Z');
  const many = await start(3, 500);
  await db.query(
    `INSERT INTO test_attempts(student_id,snapshot_id,component,scope,status,purpose,started_at,submitted_at,score,max_score,result)
     SELECT $1,$2,'READING','FULL_SKILL','SUBMITTED','PRACTICE',$3,$3,7,10,'{"method":"OBJECTIVE","parts":[]}'::jsonb FROM generate_series(1,205)`,
    [alice, snapshotId, now]);
  now = new Date('2027-03-03T17:00:00Z');
  await goals.current(alice);
  await jobs.scheduleBatch();
  const manyFinal = await readFinal(many.id);
  assert.equal(manyFinal.snapshot.learner.goal.completed, 205);
  assert.equal(manyFinal.snapshot.learner.cumulative.statistics[0].sampleSize, 200);

  // Account delivery time and frozen goal boundaries also work across DST.
  await db.query("UPDATE users SET timezone='America/New_York' WHERE id=$1", [bob]);
  const ny = await goalRepo.create(bob, { targetCefr: 'B2', targetTests: 10, durationDays: 3, startDate: '2027-11-06', timezone: 'America/New_York' });
  now = new Date('2027-11-09T05:00:00Z');
  await goals.current(bob);
  await jobs.scheduleBatch();
  const nyFinal = await readFinal(ny.id);
  assert.equal(nyFinal.snapshot.outcome.endedOn, '2027-11-08');
  assert.equal(new Date(nyFinal.deliver_at).toISOString(), '2027-11-09T13:00:00.000Z');
  now = new Date('2027-03-03T17:00:00Z');

  // Actual adapter + recorder with synthetic HTTP; one repair, one READY, no repeated call.
  const originalFetch = global.fetch;
  let calls = 0;
  global.fetch = async (_url, options) => {
    calls++;
    const payload = JSON.parse(String(options?.body));
    const prompt = JSON.parse(payload.contents[0].parts[0].text);
    assert.ok(prompt.outcome);
    for (const secret of [alice, bob, testId, 'PRIVATE_TITLE', 'sourceAttemptId', 'questionKeys'])
      assert.ok(!JSON.stringify(prompt).includes(secret));
    const content = { headline: 'Tổng kết mục tiêu', narrative: 'Tiếp tục luyện tập để tiến tới mục tiêu.', achievements: [],
      nextGoalSuggestion: { targetCefr: 'B2', targetTests: 40, durationDays: calls === 1 ? 181 : 30 } };
    return new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { role: 'model', parts: [{ text: JSON.stringify(content) }] } }],
      usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 80 } }), { status: 200 });
  };
  try {
    // Keep older fixtures out of the queue to isolate this request's retry/quota assertions.
    await db.query("UPDATE learning_insights SET next_retry_at='2099-01-01' WHERE id<>$1", [manyFinal.id]);
    config.set('PERSONALIZATION_AI_ENABLED', true);
    await Promise.all(workers.map(w => w.runBatch()));
    assert.equal(calls, 2);
    assert.equal((await readFinal(many.id)).status, 'READY');
    assert.equal(((await reports.read(alice, manyFinal.id)).content as FinalContent).nextGoalSuggestion.durationDays, 30);
    assert.equal((await db.query("SELECT count(*)::int n FROM ai_requests WHERE purpose='PERSONAL_FINAL'"))[0].n, 2);
    await Promise.all(workers.map(w => w.runBatch()));
    assert.equal(calls, 2);
    const sent: unknown[] = [];
    const notifier = new NotificationsService(new NotificationsRepository(db), {
      sendLearningReportEmail: async (_to: string, entries: unknown[]) => { sent.push(...entries); },
    } as unknown as MailService, { emitCreated: () => {} } as unknown as NotificationsGateway);
    now = new Date('2027-03-04T01:00:00Z');
    await Promise.all([reports.enqueueDeliveries(), reports.enqueueDeliveries()]);
    await Promise.all([notifier.processDueScheduledBatch(50, now), notifier.processDueScheduledBatch(50, now)]);
    assert.ok(sent.some(entry => JSON.stringify(entry).includes(manyFinal.id)));
    const delivered = await readFinal(many.id);
    assert.ok(delivered.notified_at && delivered.emailed_at);
    const count = sent.length;
    await reports.enqueueDeliveries(); await notifier.processDueScheduledBatch(50, now);
    assert.equal(sent.length, count);
  } finally { global.fetch = originalFetch; }
  console.log('PASS GĐ8: 3/10/14/30-day schedules, day-20 achievement, deadline/early FINAL, replacement day 2/3, cancellation, atomic rollback, cutoff, 205 counts/200 scores, ownership, retry, cache, quota recording, 08:00 dedupe and email.');
}).catch(error => { console.error(error); process.exitCode = 1; });
