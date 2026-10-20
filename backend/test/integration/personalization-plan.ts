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
    const sourceAttempt = await submit(alice);
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
