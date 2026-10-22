import { Test } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../../src/features/auth/guards/jwt-auth.guard';
import { PersonalizationClock } from '../../src/features/personalization/services/personalization-clock';
import { createValidationPipe } from '../../src/common/validation/create-validation.pipe';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';
import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withPersonalizationDatabase } from './personalization-fixture';
import { AddPlacementTests1760000022000 } from '../../src/database/migrations/1760000022000-AddPlacementTests';
import { AbilityProfileController } from '../../src/features/personalization/controllers/ability-profile.controller';
import { AdminPlacementController } from '../../src/features/personalization/controllers/admin-placement.controller';
import { AuthUser } from '../../src/features/auth/types/auth-user.type';
import { LearningGoalsRepository } from '../../src/features/personalization/repositories/learning-goals.repository';
import { StudyPlansRepository } from '../../src/features/personalization/repositories/study-plans.repository';
import { PlanProgressRepository } from '../../src/features/personalization/repositories/plan-progress.repository';
import { GoalsService } from '../../src/features/personalization/services/goals.service';
import { SnapshotService } from '../../src/features/personalization/services/snapshot.service';
import { MistakeSourceService } from '../../src/features/personalization/services/mistake-source.service';
import { PlanCandidatesService } from '../../src/features/personalization/services/plan-candidates.service';
import { buildRulePlan } from '../../src/features/personalization/policies/rule-plan';
import {
  buildExpandedTests,
  readAudioManifest,
} from '../../src/database/seeds/seed-expanded-tests';
import { persistSeedDefinitions } from '../../src/database/seeds/seed-sample-tests';
import { configureMusicPlacement } from '../../src/database/seeds/placement-music';
import { GrammarTestsRepository } from '../../src/features/grammar-tests/repositories/grammar-tests.repository';
import { ReadingTestsRepository } from '../../src/features/reading-tests/repositories/reading-tests.repository';
import { ListeningTestsRepository } from '../../src/features/listening-tests/repositories/listening-tests.repository';
import { WritingTestsRepository } from '../../src/features/writing-tests/repositories/writing-tests.repository';
import { SpeakingTestsRepository } from '../../src/features/speaking-tests/repositories/speaking-tests.repository';

withPersonalizationDatabase(async (db, alice, bob) => {
  const migration = new AddPlacementTests1760000022000(),
    runner = db.createQueryRunner();
  await runner.connect();
  try {
    await migration.down(runner);
    await migration.up(runner);
  } finally {
    await runner.release();
  }
  const admin = randomUUID();
  await db.query(
    "INSERT INTO roles(code,name) VALUES('ADMIN','Admin') ON CONFLICT DO NOTHING",
  );
  await db.query(
    "INSERT INTO users(id,email,password_hash,first_name,last_name,role_id,status) SELECT $1,$2,'fixture','Test','Admin',id,'ACTIVE' FROM roles WHERE code='ADMIN'",
    [admin, admin + '@example.invalid'],
  );
  const actor = { id: admin, role: 'ADMIN' } as AuthUser,
    student = { id: alice, role: 'STUDENT' } as AuthUser;
  const defs = buildExpandedTests(readAudioManifest()).filter((d) =>
    d.requestId.includes(':form-5:'),
  );
  await db.transaction((m) =>
    persistSeedDefinitions(m, defs, 'placement-fixture', admin),
  );
  const dry = await configureMusicPlacement(db.manager);
  assert.equal(dry.full, 10);
  assert.equal(dry.parts, 18);
  assert.equal(
    (await db.query('SELECT count(*)::int n FROM tests WHERE is_placement'))[0]
      .n,
    0,
  );
  await db.transaction((m) => configureMusicPlacement(m, true));
  const before = await db.query('SELECT id,version FROM tests ORDER BY id');
  await db.transaction((m) => configureMusicPlacement(m, true));
  assert.deepEqual(
    await db.query('SELECT id,version FROM tests ORDER BY id'),
    before,
  );
  const part = dry.matched.find((t) => t.mode !== 'full')!;
  await assert.rejects(
    db.query('UPDATE tests SET is_placement=true WHERE id=$1', [part.id]),
  );
  const clock = { now: () => new Date('2026-10-22T05:00Z') },
    profiles = new AbilityProfileController(db, clock),
    adminApi = new AdminPlacementController(db);
  const initial = await profiles.get(student);
  assert.equal(initial.placement.missing.length, 3);
  assert.equal(initial.placement.tests.length, 5);
  assert.ok(initial.placement.tests.every((t) => t.purpose === 'EXAM'));
  const repo = new LearningGoalsRepository(db),
    goals = new GoalsService(
      db,
      repo,
      clock,
      new PlanProgressRepository(new StudyPlansRepository(db)),
    );
  const snapshots = new SnapshotService(
    db,
    goals,
    repo,
    { recent: async () => [] } as unknown as MistakeSourceService,
    clock,
  );
  const created = await goals.create(alice, {
    targetCefr: 'B2',
    targetTests: 7,
    durationDays: 7,
  });
  assert.equal(created.placementComplete, false);
  const goal = (await repo.findById(alice, created.goal.id))!;
  const snapshot = await snapshots.build(
    student,
    goal,
    { kind: 'GOAL' },
    clock.now(),
  );
  const candidates = await new PlanCandidatesService().build(
    db.manager,
    alice,
    snapshot,
    1,
  );
  assert.equal(
    candidates.filter(
      (c) => c.activityType === 'TEST' && c.purpose !== 'PLACEMENT',
    ).length,
    0,
  );
  const plan = buildRulePlan(candidates, '2026-10-22', '2026-10-28', 1, 7);
  assert.deepEqual(
    plan
      .filter((i) => i.reason === 'PLACEMENT')
      .map((i) => ['component' in i ? i.component : null, i.scheduledOn]),
    [
      ['GRAMMAR_VOCAB', '2026-10-22'],
      ['READING', '2026-10-23'],
      ['LISTENING', '2026-10-24'],
    ],
  );
  assert.equal(
    (
      await new PlanCandidatesService().build(db.manager, alice, snapshot, 2)
    ).filter((c) => c.activityType === 'TEST').length,
    0,
  );
  const reading = initial.placement.tests.find((t) => t.skill === 'READING')!;
  await db.query(
    `INSERT INTO test_attempts(student_id,snapshot_id,component,scope,status,purpose,started_at,submitted_at,score,max_score,estimated_cefr,result)
 SELECT $1,published_snapshot_id,component,scope,'SUBMITTED',purpose,$3,$3,20,50,'B1',$4 FROM tests WHERE id=$2`,
    [
      alice,
      reading.testId,
      clock.now(),
      {
        method: 'OBJECTIVE',
        parts: [{ partNumber: 1, score: 20, maxScore: 50 }],
      },
    ],
  );
  assert.deepEqual((await profiles.get(student)).placement.missing, [
    'GRAMMAR_VOCAB',
    'LISTENING',
  ]);
  assert.equal(
    (await profiles.get({ id: bob, role: 'STUDENT' } as AuthUser)).placement
      .missing.length,
    3,
  );
  assert.deepEqual(
    await db.query('SELECT id,version FROM tests ORDER BY id'),
    before,
    'GET does not write tests',
  );
  assert.equal((await adminApi.coverage()).missing.length, 0);
  await assert.rejects(
    adminApi.update(part.id, { isPlacement: true, version: 2 }, actor),
  );
  const row = (
    await db.query('SELECT version FROM tests WHERE id=$1', [reading.testId])
  )[0];
  await assert.rejects(
    adminApi.update(
      reading.testId,
      { isPlacement: false, version: row.version - 1 },
      actor,
    ),
  );
  const saved = await adminApi.update(
    reading.testId,
    { isPlacement: false, version: row.version },
    actor,
  );
  assert.equal(saved.isPlacement, false);
  const repositories = [
    GrammarTestsRepository,
    ReadingTestsRepository,
    ListeningTestsRepository,
    WritingTestsRepository,
    SpeakingTestsRepository,
  ];
  const components = [
    'GRAMMAR_VOCAB',
    'READING',
    'LISTENING',
    'WRITING',
    'SPEAKING',
  ];
  for (let i = 0; i < repositories.length; i++) {
    const repository: any = new repositories[i](db);
    const definition = defs.find(
      (d) => d.component === components[i] && d.test.mode === 'full',
    )!;
    const aggregate = {
      ...structuredClone(definition.test),
      isPlacement: true,
    };
    const test = await repository.create(
      actor,
      aggregate,
      { requestId: randomUUID() },
      randomUUID(),
    );
    assert.equal(test.isPlacement, true);
    const result = await repository.update(
      test.id,
      actor,
      test.version,
      { ...test, isPlacement: false },
      { requestId: randomUUID() },
    );
    assert.equal(result.outcome, 'SUCCESS');
    assert.equal(
      (
        await db.query('SELECT is_placement FROM tests WHERE id=$1', [test.id])
      )[0].is_placement,
      false,
    );
  }
  assert.ok(
    (
      await db.query(
        "SELECT count(*)::int n FROM audit_logs WHERE action='TEST_PLACEMENT_UPDATED'",
      )
    )[0].n > 0,
  );

  const module = await Test.createTestingModule({
    controllers: [AbilityProfileController, AdminPlacementController],
    providers: [
      { provide: DataSource, useValue: db },
      { provide: PersonalizationClock, useValue: clock },
    ],
  })
    .overrideGuard(JwtAuthGuard)
    .useValue({
      canActivate(ctx: ExecutionContext) {
        const req = ctx.switchToHttp().getRequest();
        req.user = {
          id: req.headers['x-role'] === 'ADMIN' ? admin : alice,
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
  try {
    await request(app.getHttpServer()).get('/me/ability-profile').expect(200);
    await request(app.getHttpServer())
      .get('/me/ability-profile')
      .set('x-role', 'ADMIN')
      .expect(403);
    await request(app.getHttpServer())
      .get('/admin/placement-tests')
      .expect(403);
    await request(app.getHttpServer())
      .get('/admin/placement-tests')
      .set('x-role', 'ADMIN')
      .expect(200);
    await request(app.getHttpServer())
      .put('/admin/tests/' + part.id + '/placement')
      .set('x-role', 'ADMIN')
      .send({ version: 2, isPlacement: true })
      .expect(400);
    await request(app.getHttpServer())
      .put('/admin/tests/' + part.id + '/placement')
      .set('x-role', 'ADMIN')
      .send({ version: 2, isPlacement: 'true' })
      .expect(400);
  } finally {
    await app.close();
  }
  console.info(
    'PASS S3: migration roundtrip, Music 10 full + 18 Part, idempotency, readonly profile, goal before assessment, days 1–3, history ownership, all five repository flags and audit.',
  );
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
