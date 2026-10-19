import * as assert from 'node:assert/strict';
import { ExecutionContext, Global, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { withPersonalizationDatabase } from './personalization-fixture';
import { PersonalizationModule } from '../../src/features/personalization/personalization.module';
import { PersonalizationClock } from '../../src/features/personalization/services/personalization-clock';
import { JwtAuthGuard } from '../../src/features/auth/guards/jwt-auth.guard';
import { createValidationPipe } from '../../src/common/validation/create-validation.pipe';
import { HttpExceptionFilter } from '../../src/common/filters/http-exception.filter';

withPersonalizationDatabase(async (db, alice, bob) => {
  @Global()
  @Module({
    providers: [{ provide: DataSource, useValue: db }],
    exports: [DataSource],
  })
  class FixtureModule {}
  let now = new Date('2026-10-19T05:00:00Z');
  const module = await Test.createTestingModule({
    imports: [FixtureModule, PersonalizationModule],
  })
    .overrideProvider(PersonalizationClock)
    .useValue({ now: () => now })
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
  const payload = { targetCefr: 'B2', targetTests: 40, durationDays: 30 };
  try {
    await api().get('/me/learning-goal').set('x-role', 'ADMIN').expect(403);
    for (const durationDays of [2, 181, 3.5])
      await api()
        .post('/me/learning-goal')
        .send({ ...payload, durationDays })
        .expect(400);
    for (const targetTests of [0, 501])
      await api()
        .post('/me/learning-goal')
        .send({ ...payload, targetTests })
        .expect(400);
    await api()
      .post('/me/learning-goal')
      .send({ ...payload, targetCefr: 'C2' })
      .expect(400);
    const created = (
      await api().post('/me/learning-goal').send(payload).expect(201)
    ).body.goal;
    assert.equal(created.startDate, '2026-10-19');
    assert.equal(created.endsOn, '2026-11-17');
    assert.equal(
      (await api().get('/me/learning-goal').expect(200)).body.goal.id,
      created.id,
    );
    assert.equal(
      (await api().get('/me/learning-goal').set('x-user', bob).expect(200)).body
        .goal,
      null,
    );
    await api()
      .post('/me/learning-goal/finish')
      .send({ goalId: created.id })
      .expect(409);
    await api()
      .delete('/me/learning-goal')
      .set('x-user', bob)
      .send({ goalId: created.id })
      .expect(409);
    const results = await Promise.all([
      api()
        .post('/me/learning-goal/replace')
        .send({ ...payload, goalId: created.id }),
      api()
        .post('/me/learning-goal/replace')
        .send({ ...payload, goalId: created.id }),
    ]);
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
    const replacement = results.find((r) => r.status === 200)!.body.goal;
    const history = (await api().get('/me/learning-goals').expect(200)).body
      .items;
    assert.equal(history.length, 1);
    assert.equal(history[0].status, 'REPLACED');
    assert.equal(history[0].replacedByGoalId, replacement.id);
    assert.equal(
      (
        await db.query(
          "SELECT count(*)::int n FROM learning_goals WHERE user_id=$1 AND status='ACTIVE'",
          [alice],
        )
      )[0].n,
      1,
    );
    const preferences = {
      reminderEnabled: false,
      reminderTime: '07:30',
      emailReminderEnabled: true,
      emailReportEnabled: false,
    };
    await api()
      .put('/me/learning-preferences')
      .send({ ...preferences, reminderTime: '24:00' })
      .expect(400);
    await api().put('/me/learning-preferences').send(preferences).expect(200);
    assert.deepEqual(
      (await api().get('/me/learning-preferences').expect(200)).body,
      preferences,
    );
    assert.equal(
      (
        await api()
          .get('/me/learning-preferences')
          .set('x-user', bob)
          .expect(200)
      ).body.reminderTime,
      '19:00',
    );
    await api()
      .delete('/me/learning-goal')
      .send({ goalId: replacement.id })
      .expect(200);
    const short = (
      await api()
        .post('/me/learning-goal')
        .send({ ...payload, durationDays: 3 })
        .expect(201)
    ).body.goal;
    now = new Date('2026-10-21T16:59:59Z');
    assert.equal((await api().get('/me/learning-goal')).body.goal.id, short.id);
    now = new Date('2026-10-21T17:00:00Z');
    assert.equal((await api().get('/me/learning-goal')).body.goal, null);
    const expired = (await api().get('/me/learning-goals?status=EXPIRED')).body
      .items;
    assert.equal(expired[0].id, short.id);
    console.log(
      'PASS GĐ2: HTTP validation, ownership, cross-session persistence, concurrent replacement, preferences and inclusive deadline.',
    );
  } finally {
    await app.close();
  }
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
