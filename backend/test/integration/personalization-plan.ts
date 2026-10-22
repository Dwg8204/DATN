import { PlanCandidatesService } from '../../src/features/personalization/services/plan-candidates.service';
import { SnapshotService } from '../../src/features/personalization/services/snapshot.service';
import { PlanService } from '../../src/features/personalization/services/plan.service';
import { buildRulePlan } from '../../src/features/personalization/policies/rule-plan';
import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { ExecutionContext, Global, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { withPersonalizationDatabase } from './personalization-fixture';
import { PersonalizationModule } from '../../src/features/personalization/personalization.module';
import { PersonalizationClock } from '../../src/features/personalization/services/personalization-clock';
import { GoalsService } from '../../src/features/personalization/services/goals.service';
import { LearningGoalsRepository } from '../../src/features/personalization/repositories/learning-goals.repository';
import { StudyPlansRepository } from '../../src/features/personalization/repositories/study-plans.repository';
import { PlanProgressRepository } from '../../src/features/personalization/repositories/plan-progress.repository';
import { PersonalizationProgressService } from '../../src/features/personalization/services/personalization-progress.service';
import { PersonalizationWorker } from '../../src/features/personalization/workers/personalization.worker';
import { TestAttemptsModule } from '../../src/features/test-attempts/test-attempts.module';
import { TestAttemptsRepository } from '../../src/features/test-attempts/repositories/test-attempts.repository';
import { TestAttemptsService } from '../../src/features/test-attempts/services/test-attempts.service';
import { PracticeAttemptsService } from '../../src/features/test-attempts/services/practice-attempts.service';
import { AssessmentPaperFactory } from '../../src/features/test-attempts/assessments/assessment-paper.factory';
import { ObjectiveGraderService } from '../../src/features/test-attempts/assessments/objective-grader.service';
import { AuthUser } from '../../src/features/auth/types/auth-user.type';
import { JwtAuthGuard } from '../../src/features/auth/guards/jwt-auth.guard';
import { UserNotebookService } from '../../src/features/vocabulary/services/user-notebook.service';
import { UserNotebookRepository } from '../../src/features/vocabulary/repositories/user-notebook.repository';
import { VocabularyRating } from '../../src/features/vocabulary/dto/flashcard-review.dto';
import { createValidationPipe } from '../../src/common/validation/create-validation.pipe';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import { NotificationsRepository } from '../../src/features/notifications/repositories/notifications.repository';
import { NotificationsService } from '../../src/features/notifications/services/notifications.service';
import { NotificationsGateway } from '../../src/features/notifications/gateways/notifications.gateway';
import { MailService } from '../../src/features/auth/services/mail.service';

withPersonalizationDatabase(async (db, alice, bob) => {
  let future: Date | undefined;
  const clock = { now: () => future ?? new Date() };
  const goals = new GoalsService(
    db,
    new LearningGoalsRepository(db),
    clock,
    new PlanProgressRepository(new StudyPlansRepository(db)),
  );
  const progress = new PersonalizationProgressService(db, goals, clock);
  const attempts = new TestAttemptsRepository(db),
    factory = new AssessmentPaperFactory(),
    grader = new ObjectiveGraderService();
  const exams = new TestAttemptsService(
    attempts,
    factory,
    grader,
    undefined,
    undefined,
    progress,
  );
  const practice = new PracticeAttemptsService(
    attempts,
    factory,
    grader,
    undefined,
    undefined,
    progress,
  );
  @Global()
  @Module({
    providers: [{ provide: DataSource, useValue: db }],
    exports: [DataSource],
  })
  class DatabaseFixture {}
  @Module({
    providers: [
      { provide: TestAttemptsService, useValue: exams },
      { provide: PracticeAttemptsService, useValue: practice },
    ],
    exports: [TestAttemptsService, PracticeAttemptsService],
  })
  class AttemptsFixture {}
  const module = await Test.createTestingModule({
    imports: [DatabaseFixture, PersonalizationModule],
  })
    .overrideModule(TestAttemptsModule)
    .useModule(AttemptsFixture)
    .overrideProvider(PersonalizationClock)
    .useValue(clock)
    .overrideGuard(JwtAuthGuard)
    .useValue({
      canActivate(context: ExecutionContext) {
        const req = context.switchToHttp().getRequest();
        req.user = {
          id: req.headers['x-user'] ?? alice,
          role: req.headers['x-role'] ?? 'STUDENT',
        };
        return true;
      },
    })
    .compile();
  const app = module.createNestApplication();
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());
  await app.init();
  const api = () => request(app.getHttpServer());
  const actor = (id: string) => ({ id, role: 'STUDENT' }) as AuthUser;
  const testId = randomUUID(),
    snapshotId = randomUUID();
  const source = {
    mode: 'part1',
    details: { title: 'Reading practice fixture' },
    parts: {
      '1': {
        passage: 'A passage with five gaps.',
        questions: Array.from({ length: 5 }, (_, i) => ({
          position: i + 1,
          options: ['correct', 'wrong'],
          answer: 'correct',
          explanation: 'Choose the matching word.',
        })),
      },
    },
  };
  try {
    await db.query(
      "INSERT INTO tests(id,created_by,title,component,purpose,scope,part_number) VALUES($1,$2,'Published reading','READING','PRACTICE','PART',1)",
      [testId, alice],
    );
    await db.query(
      'INSERT INTO test_snapshots(id,test_id,version,schema_version,snapshot,content_hash) VALUES($1,$2,1,1,$3,$4)',
      [snapshotId, testId, source, 'a'.repeat(64)],
    );
    await db.query(
      "UPDATE tests SET status='PUBLISHED',published_snapshot_id=$2 WHERE id=$1",
      [testId, snapshotId],
    );
    const submit = async (user: string) => {
      const id = randomUUID();
      await practice.start(
        { testId, attemptId: id, mode: 'part1' },
        actor(user),
      );
      await practice.complete(
        id,
        { answers: {}, revealedKeys: [] },
        actor(user),
      );
      return id;
    };
    const invalid = await api().post('/me/learning-goal').send({targetCefr:'B2',targetTests:10,durationDays:3}).expect(400);
    assert.equal(invalid.body.error.code,'GOAL_PACE_TOO_HIGH');
    const sourceAttempt = await submit(alice);
    const emptySnapshot=await module.get(SnapshotService).build(actor(alice),null,{kind:'GOAL'},clock.now());
    assert.equal(emptySnapshot.vocab.activeCount,0);
    assert.ok(!(await module.get(PlanCandidatesService).build(db.manager,alice,emptySnapshot,1)).some(c=>c.activityType==='VOCAB_REVIEW'));
    const [seedFolder]=await db.query("INSERT INTO vocabulary_folders(owner_id,name) VALUES($1,'Initial active cards') RETURNING id",[alice]);
    await db.query(`INSERT INTO user_notebook_items(user_id,folder_id,item_type,custom_content) SELECT $1,$2,'WORD',jsonb_build_object('term','word '||n) FROM generate_series(1,20) n`,[alice,seedFolder.id]);
    const goal = (
      await api()
        .post('/me/learning-goal')
        .send({ targetCefr: 'B2', targetTests: 3, durationDays: 8 })
        .expect(201)
    ).body.goal;
    let plan = (await api().get('/me/study-plan/current').expect(200)).body
      .plan;
    assert.equal(plan.source, 'RULE');
    assert.equal(plan.weekIndex, 1);
    const review = plan.items.find(
      (item: any) => item.activityType === 'MISTAKE_REVIEW',
    );
    assert.ok(review);
    assert.equal(review.questionCount, 5);
    const details = (
      await api().get(`/me/mistakes?itemId=${review.id}`).expect(200)
    ).body;
    assert.equal(details.attemptId, sourceAttempt);
    assert.equal(details.details[0].items.length, 5);
    await api()
      .get(`/me/mistakes?itemId=${review.id}`)
      .set('x-user', bob)
      .expect(404);
    await api()
      .post(`/me/study-plan/items/${review.id}/done`)
      .set('x-user', bob)
      .expect(404);
    await api()
      .get('/me/study-plan/current')
      .set('x-role', 'ADMIN')
      .expect(403);
    const testTask = plan.items.find(
      (item: any) => item.activityType === 'TEST',
    );
    await api().post(`/me/study-plan/items/${testTask.id}/done`).expect(400);
    await db.query("UPDATE study_plan_items SET scheduled_on=scheduled_on+1 WHERE id=$1 AND completed_at IS NULL",[review.id]);
    assert.equal((await api().get(`/me/mistakes?itemId=${review.id}`)).body.canMarkDone,true);
    await api().post(`/me/study-plan/items/${review.id}/done`).expect(200);
    await api().post(`/me/study-plan/items/${review.id}/done`).expect(200);
    assert.equal(
      (await api().get(`/me/mistakes?itemId=${review.id}`)).body.done,
      true,
    );

    const bobGoal = (
      await api()
        .post('/me/learning-goal')
        .set('x-user', bob)
        .send({ targetCefr: 'B1', targetTests: 5, durationDays: 3 })
        .expect(201)
    ).body.goal;
    let bobPlan = (await api().get('/me/study-plan/current').set('x-user', bob))
      .body.plan;
    assert.equal(
      bobPlan.items.find((item: any) => item.activityType === 'TEST').doneCount,
      0,
    );
    const bobAttempt = await submit(bob);
    bobPlan = (await api().get('/me/study-plan/current').set('x-user', bob))
      .body.plan;
    assert.equal(
      bobPlan.items
        .filter((item: any) => item.activityType === 'TEST')
        .reduce((sum: number, item: any) => sum + item.doneCount, 0),
      1,
    );
    await practice.complete(
      bobAttempt,
      { answers: {}, revealedKeys: [] },
      actor(bob),
    );
    await submit(alice);
    await submit(alice);
    await progress.afterLearning(alice);
    await progress.afterLearning(alice);
    const reached = (await api().get('/me/learning-goal')).body.goal;
    assert.equal(reached.status, 'ACTIVE');
    assert.equal(reached.completed, 3);
    assert.ok(reached.targetReachedAt);
    assert.equal(reached.canFinish, true);
    let delivered = 0;
    const notifications = new NotificationsService(
      new NotificationsRepository(db),
      {} as MailService,
      {
        emitCreated: (items: unknown[]) => {
          delivered += items.length;
        },
      } as unknown as NotificationsGateway,
    );
    assert.equal(await notifications.processDueScheduledBatch(), 1);
    assert.equal(delivered, 1);
    assert.equal(await notifications.processDueScheduledBatch(), 0);
    assert.equal(
      (
        await db.query(
          'SELECT count(*)::int n FROM notifications WHERE dedupe_key=$1',
          [`goal-reached:${goal.id}:IN_APP`],
        )
      )[0].n,
      1,
    );

    const folderId = randomUUID(),
      notebookId = randomUUID();
    await db.query(
      "INSERT INTO vocabulary_folders(id,owner_id,name) VALUES($1,$2,'Review fixture')",
      [folderId, alice],
    );
    await db.query(
      `INSERT INTO user_notebook_items(id,user_id,folder_id,item_type,custom_content) VALUES($1,$2,$3,'WORD','{"term":"learn"}')`,
      [notebookId, alice, folderId],
    );
    const notebook = new UserNotebookService(
      new UserNotebookRepository(db),
      progress,
    );
    const eventIds = Array.from({ length: 20 }, () => randomUUID());
    for (const clientEventId of [...eventIds, eventIds[0]])
      await notebook.recordFlashcardReview(alice, {
        notebookItemId: notebookId,
        clientEventId,
        rating: VocabularyRating.LEARNING,
      });
    plan = (await api().get('/me/study-plan/current')).body.plan;
    const vocab = plan.items.find(
      (item: any) => item.activityType === 'VOCAB_REVIEW',
    );
    assert.equal(vocab.doneCount, 20);
    assert.ok(vocab.completedAt);
    assert.equal(
      (
        await db.query(
          'SELECT count(*)::int n FROM vocabulary_review_events WHERE notebook_item_id=$1',
          [notebookId],
        )
      )[0].n,
      20,
    );

    const repair=module.get(PlanService);
    const untouched=plan.items.find((i:any)=>i.activityType==='TEST'&&!i.doneCount&&i.scheduledOn>plan.startsOn);
    if(untouched)await db.query('UPDATE study_plan_items SET target_count=3 WHERE id=$1',[untouched.id]);
    const dry=await repair.replanCurrent(false);assert.ok(dry.eligible>=1);assert.equal(dry.updated,0);
    const markedBefore=await db.query('SELECT done_count,completed_at FROM study_plan_items WHERE id=$1',[review.id]);
    assert.ok((await repair.replanCurrent(true)).updated>=1);
    assert.deepEqual(await db.query('SELECT done_count,completed_at FROM study_plan_items WHERE id=$1',[review.id]),markedBefore);
    assert.equal((await repair.replanCurrent(true)).updated,0);
    const worker = module.get(PersonalizationWorker);
    future = new Date(Date.now() + 7 * 86_400_000);
    await Promise.all([worker.runBatch(), worker.runBatch()]);
    const week2 = (await api().get('/me/study-plan/current')).body.plan;
    assert.equal(week2.weekIndex, 2);
    assert.equal(week2.startsOn, week2.endsOn);
    assert.equal(
      week2.items.find((item: any) => item.activityType === 'TEST').targetCount,
      1,
    );
    assert.equal(
      week2.items.find((item: any) => item.activityType === 'VOCAB_REVIEW')
        .doneCount,
      0,
    );
    assert.equal(
      (
        await db.query(
          'SELECT count(*)::int n FROM study_plans WHERE goal_id=$1 AND week_index=2',
          [goal.id],
        )
      )[0].n,
      1,
    );
    assert.equal(
      (
        await db.query('SELECT status FROM learning_goals WHERE id=$1', [
          bobGoal.id,
        ])
      )[0].status,
      'EXPIRED',
    );
    future = new Date(future.getTime() + 86_400_000);
    await worker.runBatch();
    assert.equal(
      (
        await db.query('SELECT status FROM learning_goals WHERE id=$1', [
          goal.id,
        ])
      )[0].status,
      'COMPLETED',
    );
    const early = await goals.create(alice, {
      targetCefr: 'B2',
      targetTests: 1,
      durationDays: 3,
    });
    await db.query(
      `INSERT INTO test_attempts(student_id,snapshot_id,component,purpose,scope,part_number,status,started_at,submitted_at,result)
      VALUES($1,$2,'READING','PRACTICE','PART',1,'SUBMITTED',$3,$3,'{"method":"PENDING_AI"}')`,
      [alice, snapshotId, future],
    );
    await progress.afterLearning(alice);
    await goals.end(alice, early.goal.id, true);
    assert.equal(
      (
        await db.query('SELECT status FROM learning_goals WHERE id=$1', [
          early.goal.id,
        ])
      )[0].status,
      'COMPLETED',
    );
    // Ranking happens in SQL before truncation: 30 candidates per skill, weak Part 2 must survive.
    for(const component of ['GRAMMAR_VOCAB','READING','LISTENING','WRITING','SPEAKING']){
      for(let n=0;n<30;n++){
        const [test]=await db.query("INSERT INTO tests(created_by,title,component,purpose,scope,part_number) VALUES($1,$2,$3,'PRACTICE','PART',$4) RETURNING id",[alice,'Ranking '+n,component,n===29?2:1]);
        const [snap]=await db.query('INSERT INTO test_snapshots(test_id,version,schema_version,snapshot,content_hash) VALUES($1,1,1,$2,$3) RETURNING id',[test.id,source,'b'.repeat(64)]);
        await db.query("UPDATE tests SET status='PUBLISHED',published_snapshot_id=$2 WHERE id=$1",[test.id,snap.id]);
      }
    }
    const profile=await module.get(SnapshotService).build(actor(alice),null,{kind:'GOAL'},clock.now());
    profile.weak.parts=[{skill:'READING',part:2,percent:10,sampleSize:3} as any];
    const candidatesService=module.get(PlanCandidatesService);
    const choices=await candidatesService.build(db.manager,alice,profile,3);
    assert.deepEqual(choices,await candidatesService.build(db.manager,alice,profile,3));
    assert.equal(choices.filter(c=>c.activityType==='TEST').length,105);
    const rule=buildRulePlan(choices,'2026-10-01','2026-10-07',3,21);
    assert.equal(rule.length,21);
    assert.ok(rule.some(i=>i.activityType==='TEST'&&i.component==='READING'&&i.partNumber===2));
    assert.equal(new Set(rule.map(i=>'testId' in i?i.testId:'')).size,21);
    for(const activeCount of [0,9,10,19,20,35]){
      const opts=await candidatesService.build(db.manager,alice,{...profile,vocab:{...profile.vocab,activeCount}},1);
      assert.deepEqual(opts.filter(c=>c.activityType==='VOCAB_REVIEW').map(c=>c.targetCount),activeCount<10?[]:activeCount<20?[10]:[10,20]);
    }
    console.log('PASS S1: SQL weak ranking across 30 tests/skill, deterministic candidates, active-card thresholds, exact tasks, early review, pace limit, idempotent repair.');
    console.log(
      'PASS GĐ4: real practice submission and replay, owned mistake details/manual completion, vocabulary dedupe and 20-event completion, target achievement, concurrent workers, partial final week, expiry and early finish.',
    );
  } finally {
    await app.close();
  }
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
