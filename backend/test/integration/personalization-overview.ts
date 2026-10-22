import { AddPlanProgressFinalizedAt1760000023000 } from '../../src/database/migrations/1760000023000-AddPlanProgressFinalizedAt';
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
import { TestAttemptsModule } from '../../src/features/test-attempts/test-attempts.module';
import { TestAttemptsRepository } from '../../src/features/test-attempts/repositories/test-attempts.repository';
import { TestAttemptsService } from '../../src/features/test-attempts/services/test-attempts.service';
import { PracticeAttemptsService } from '../../src/features/test-attempts/services/practice-attempts.service';
import { AssessmentPaperFactory } from '../../src/features/test-attempts/assessments/assessment-paper.factory';
import { ObjectiveGraderService } from '../../src/features/test-attempts/assessments/objective-grader.service';
import { JwtAuthGuard } from '../../src/features/auth/guards/jwt-auth.guard';
import { createValidationPipe } from '../../src/common/validation/create-validation.pipe';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';

process.env.PERSONALIZATION_WORKER_ENABLED = 'false';
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
  try {
    const migration = new AddPlanProgressFinalizedAt1760000023000(),
      runner = db.createQueryRunner();
    await runner.connect();
    try {
      await migration.down(runner);
      await migration.up(runner);
    } finally {
      await runner.release();
    }
    const tables = [
      'learning_goals',
      'study_plans',
      'study_plan_items',
      'learning_insights',
      'audit_logs',
      'notifications',
    ];
    const counts = async () =>
      Promise.all(
        tables.map(
          async (table) =>
            (await db.query('SELECT count(*)::int n FROM ' + table))[0].n,
        ),
      );
    const before = await counts();
    const sql: string[] = [];
    const original = db.query.bind(db);
    db.query = (async (...args: any[]) => {
      sql.push(args[0]);
      return (original as any)(...args);
    }) as typeof db.query;
    let overview = (await api().get('/me/personalization/overview').expect(200))
      .body;
    await api().get('/me/learning-goal').expect(200);
    await api().get('/me/study-plan/current').expect(200);
    await api().get('/me/insights/comment').expect(200);
    assert.equal(overview.goal, null);
    assert.equal(overview.profile.placement.missing.length, 3);
    assert.equal(overview.needsSync, false);
    assert.ok(
      sql.every((q) => !/\b(INSERT|UPDATE|DELETE)\b|FOR\s+UPDATE/i.test(q)),
      sql.join('\n'),
    );
    db.query = original;
    assert.deepEqual(await counts(), before);
    await api()
      .get('/me/personalization/overview')
      .set('x-role', 'ADMIN')
      .expect(403);
    await api()
      .post('/me/personalization/sync')
      .set('x-role', 'ADMIN')
      .expect(403);
    const created = await goals.create(alice, {
      targetCefr: 'B2',
      targetTests: 180,
      durationDays: 180,
    });
    overview = (await api().get('/me/personalization/overview')).body;
    assert.equal(overview.needsSync, true);
    assert.equal(overview.plan, null);
    await Promise.all([
      api().post('/me/personalization/sync').expect(200),
      api().post('/me/personalization/sync').expect(200),
    ]);
    assert.equal(
      (
        await db.query(
          'SELECT count(*)::int n FROM study_plans WHERE goal_id=$1',
          [created.goal.id],
        )
      )[0].n,
      1,
    );
    overview = (await api().get('/me/personalization/overview')).body;
    assert.equal(overview.needsSync, false);
    assert.ok(overview.plan);
    assert.equal(
      (await api().get('/me/personalization/overview').set('x-user', bob)).body
        .goal,
      null,
    );
    const overviewQueryCount = async () => {
      let count = 0;
      const query = db.query.bind(db);
      db.query = (async (...args: any[]) => {
        count++;
        return (query as any)(...args);
      }) as typeof db.query;
      try {
        await api().get('/me/personalization/overview').expect(200);
        return count;
      } finally {
        db.query = query;
      }
    };
    const initialQueryCount = await overviewQueryCount();
    // Simulate a learner arriving at week 20, with prior weeks already sealed.
    const repo = new LearningGoalsRepository(db),
      goal = (await repo.findById(alice, created.goal.id))!;
    const plans = new StudyPlansRepository(db);
    for (let week = 2; week <= 19; week++) {
      await db.query(
        `INSERT INTO study_plans(user_id,goal_id,week_index,starts_on,ends_on,source,progress_finalized_at)
        VALUES($1,$2,$3,$4::date+($3::smallint-1)*7,$4::date+($3::smallint-1)*7+6,'RULE',now())`,
        [alice, goal.id, week, goal.start_date],
      );
    }
    future = new Date(clock.now().getTime() + 133 * 86400000);
    const queries: string[] = [];
    const savedQuery = db.query.bind(db);
    db.query = (async (...args: any[]) => {
      queries.push(args[0]);
      return (savedQuery as any)(...args);
    }) as typeof db.query;
    const old = (await plans.findWeek(alice, goal.id, 1))!;
    const progressRepo = module.get(PlanProgressRepository);
    let synced = 0;
    const realSync = progressRepo.syncPlan.bind(progressRepo);
    progressRepo.syncPlan = async (...args) => {
      synced++;
      return realSync(...args);
    };
    await api().post('/me/personalization/sync').expect(200);
    assert.ok(
      synced <= 2,
      'Only previous unsealed and current week are synchronized',
    );
    progressRepo.syncPlan = realSync;
    db.query = savedQuery;
    assert.ok(
      (
        await db.query(
          'SELECT progress_finalized_at FROM study_plans WHERE id=$1',
          [old.id],
        )
      )[0].progress_finalized_at,
    );
    const tid = randomUUID(),
      sid = randomUUID();
    await db.query(
      "INSERT INTO tests(id,created_by,title,component,purpose,scope) VALUES($1,$2,'Seal fixture','READING','PRACTICE','FULL_SKILL')",
      [tid, alice],
    );
    await db.query(
      "INSERT INTO test_snapshots(id,test_id,version,schema_version,snapshot,content_hash) VALUES($1,$2,1,1,'{}',$3)",
      [sid, tid, 'a'.repeat(64)],
    );
    await db.query(
      "INSERT INTO study_plan_items(plan_id,scheduled_on,sort_order,activity_type,component,test_id,target_count) VALUES($1,$2,0,'TEST','READING',$3,1)",
      [old.id, old.starts_on, tid],
    );
    await db.query(
      "INSERT INTO test_attempts(student_id,snapshot_id,component,scope,status,purpose,started_at,submitted_at) VALUES($1,$2,'READING','FULL_SKILL','SUBMITTED','PRACTICE',$3,$3)",
      [alice, sid, old.starts_on + 'T12:00:00Z'],
    );
    const oldItems = await plans.findItems(alice, old.id);
    await progressRepo.syncPlan(db.manager, goal, old, clock.now());
    assert.deepEqual(await plans.findItems(alice, old.id), oldItems);
    const readCounts = await counts();
    overview = (await api().get('/me/personalization/overview')).body;
    assert.equal(overview.plan.weekIndex, 20);
    assert.equal(
      await overviewQueryCount(),
      initialQueryCount,
      'Overview query count is independent of goal weeks',
    );
    assert.deepEqual(await counts(), readCounts);
    future = new Date(future.getTime() + 48 * 86400000);
    overview = (await api().get('/me/personalization/overview')).body;
    assert.equal(overview.goal.effectiveStatus, 'ENDING');
    assert.equal(overview.needsSync, true);
    await api().post('/me/personalization/sync').expect(200);
    assert.equal(
      (await api().get('/me/personalization/overview')).body.goal,
      null,
    );
    console.info(
      'PASS S4: read-only GETs, authorization, concurrent sync, single plan, week 20 bounded sync, sealed week, ENDING and expiry.',
    );
  } finally {
    await app.close();
  }
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
