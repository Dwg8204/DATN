import 'dotenv/config';
import { createHash, randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { createDataSourceOptions } from '../src/database/data-source-options';
import { AssessmentPaperFactory } from '../src/features/test-attempts/assessments/assessment-paper.factory';
import { ObjectiveGraderService } from '../src/features/test-attempts/assessments/objective-grader.service';
import { TestAttemptsRepository } from '../src/features/test-attempts/repositories/test-attempts.repository';
import { TestAttemptsService } from '../src/features/test-attempts/services/test-attempts.service';
import { AuthUser } from '../src/features/auth/types/auth-user.type';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { JwtAuthGuard } from '../src/features/auth/guards/jwt-auth.guard';
import { createValidationPipe } from '../src/common/validation/create-validation.pipe';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ListeningTestsRepository } from '../src/features/listening-tests/repositories/listening-tests.repository';

const maybeDescribe = process.env.DATABASE_URL ? describe : describe.skip;

maybeDescribe('shared attempts with PostgreSQL', () => {
  jest.setTimeout(60_000);
  const studentId = randomUUID();
  const testId = randomUUID();
  const snapshotId = randomUUID();
  const attemptId = randomUUID();
  const actor: AuthUser = { id: studentId, email: 'attempt-test@example.invalid', firstName: 'Test', lastName: 'Student', role: 'STUDENT', status: 'ACTIVE' };
  let dataSource: DataSource;
  let service: TestAttemptsService;
  let app: INestApplication;

  beforeAll(async () => {
    dataSource = new DataSource(createDataSourceOptions());
    await dataSource.initialize();
    const role = await dataSource.query<Array<{ id: string }>>("SELECT id FROM roles WHERE code='STUDENT'");
    if (!role[0]) throw new Error('Seed the STUDENT role before running database tests.');
    await dataSource.query(
      `INSERT INTO users(id,email,password_hash,first_name,last_name,role_id,status,email_verified_at)
       VALUES($1,$2,'integration-test-only','Test','Student',$3,'ACTIVE',now())`,
      [studentId, `attempt-${studentId}@example.invalid`, role[0].id]);
    await dataSource.query(
      `INSERT INTO tests(id,created_by,title,component,scope,part_number,part_contents,status)
       VALUES($1,$2,'Shared attempt test','GRAMMAR_VOCAB','PART',1,'{}'::jsonb,'DRAFT')`,
      [testId, studentId]);
    const snapshot = { mode: 'full', details: { title: 'Shared attempt test' }, parts: {
      1: { instruction: 'Choose one', questions: Array.from({ length: 25 }, (_, index) => ({
        id: index + 1, text: `Question ${index + 1}?`, options: ['Wrong', 'Correct', 'Other'], correctAnswer: 1,
        ...(index === 0 ? { explanation: 'The second option is correct.' } : {}),
      })) },
      2: { sets: Array.from({ length: 5 }, (_, setIndex) => ({
        setId: setIndex + 1, instruction: `Match set ${setIndex + 1}`,
        options: 'ABCDEFGHIJ'.split('').map(label => ({ label, text: `Option ${label}` })),
        targetWords: Array.from({ length: 5 }, (_, targetIndex) => ({
          id: 26 + setIndex * 5 + targetIndex, word: `Word ${setIndex + 1}-${targetIndex + 1}`,
          correctAnswer: String.fromCharCode(65 + targetIndex),
        })),
      })) },
    } };
    const serialized = JSON.stringify(snapshot);
    await dataSource.query(
      `INSERT INTO test_snapshots(id,test_id,version,schema_version,snapshot,content_hash)
       VALUES($1,$2,1,1,$3::jsonb,$4)`,
      [snapshotId, testId, serialized, createHash('sha256').update(serialized).digest('hex')]);
    await dataSource.query("UPDATE tests SET status='PUBLISHED',published_snapshot_id=$2 WHERE id=$1", [testId, snapshotId]);
    service = new TestAttemptsService(new TestAttemptsRepository(dataSource), new AssessmentPaperFactory(), new ObjectiveGraderService());
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: (context: { switchToHttp: () => { getRequest: () => { headers: Record<string, string>; user?: AuthUser } } }) => {
        const incoming = context.switchToHttp().getRequest();
        incoming.user = incoming.headers['x-test-other-user'] ? { ...actor, id: randomUUID() } : actor;
        return true;
      } })
      .compile();
    app = module.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(createValidationPipe());
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    if (!dataSource?.isInitialized) return;
    await dataSource.query('DELETE FROM test_attempts WHERE student_id=$1 AND snapshot_id=$2', [studentId, snapshotId]);
    await dataSource.query('UPDATE tests SET published_snapshot_id=NULL WHERE id=$1', [testId]);
    await dataSource.query('DELETE FROM test_snapshots WHERE id=$1', [snapshotId]);
    await dataSource.query('DELETE FROM tests WHERE id=$1', [testId]);
    await dataSource.query('DELETE FROM users WHERE id=$1', [studentId]);
    await dataSource.destroy();
  });

  it('serializes start, autosave and submit while preserving a private snapshot', async () => {
    const starts = await Promise.all([service.start(testId, attemptId, actor), service.start(testId, attemptId, actor)]);
    expect(starts[0].attemptId).toBe(starts[1].attemptId);
    expect((await service.start(testId, randomUUID(), actor)).attemptId).toBe(attemptId);
    expect(JSON.stringify(starts[0].paper)).not.toContain('correctAnswer');
    expect(JSON.stringify(starts[0].paper)).not.toContain('explanation');
    const counts = await dataSource.query<Array<{ count: string }>>('SELECT count(*)::text AS count FROM test_attempts WHERE snapshot_id=$1', [snapshotId]);
    expect(Number(counts[0].count)).toBe(1);

    const change = { expectedRevision: 0, changes: { 'p1:q1': { kind: 'CHOICE' as const, optionId: 'o1' } } };
    const saves = await Promise.allSettled([service.save(attemptId, actor, change), service.save(attemptId, actor, change)]);
    expect(saves.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(saves.filter(result => result.status === 'rejected')).toHaveLength(1);

    const submitted = await service.submit(attemptId, actor, { expectedRevision: 1 });
    expect(submitted.result).toMatchObject({ method: 'OBJECTIVE', score: 1, maxScore: 50 });
    expect(await service.submit(attemptId, actor, { expectedRevision: 1 })).toMatchObject({ score: 1, gradingStatus: 'COMPLETED' });
    await expect(service.save(attemptId, actor, { expectedRevision: 1, changes: {} })).rejects.toMatchObject({ statusCode: 409 });
    const detail = await service.details(attemptId, 1, actor);
    expect(detail.items[0]).toMatchObject({ correctAnswer: 'o1', explanation: 'The second option is correct.' });
    await expect(service.get(attemptId, { ...actor, id: randomUUID() })).rejects.toMatchObject({ statusCode: 404 });

    const expiredId = randomUUID();
    await service.start(testId, expiredId, actor);
    await dataSource.query(
      "UPDATE test_attempts SET started_at=now()-interval '30 minutes',expires_at=now()-interval '1 minute' WHERE id=$1",
      [expiredId]);
    expect(await service.finalizeExpiredBatch()).toBe(1);
    expect(await service.result(expiredId, actor)).toMatchObject({ score: 0, maxScore: 50, gradingStatus: 'COMPLETED' });
  });

  it('serves the attempt contract through HTTP and enforces ownership', async () => {
    const httpAttemptId = randomUUID();
    const started = await request(app.getHttpServer()).post('/api/v1/test-attempts')
      .send({ testId, attemptId: httpAttemptId }).expect(201);
    expect(JSON.stringify(started.body.paper)).not.toContain('correctAnswer');
    await request(app.getHttpServer()).patch(`/api/v1/test-attempts/${httpAttemptId}/progress`)
      .send({ expectedRevision: 0, changes: { 'p1:q1': { kind: 'CHOICE', optionId: 'o1' } } }).expect(200);
    const submitted = await request(app.getHttpServer()).post(`/api/v1/test-attempts/${httpAttemptId}/submit`)
      .send({ expectedRevision: 1 }).expect(201);
    expect(submitted.body).toMatchObject({ score: 1, gradingStatus: 'COMPLETED' });
    const details = await request(app.getHttpServer()).get(`/api/v1/test-attempts/${httpAttemptId}/result/parts/1`).expect(200);
    expect(details.body.items[0]).toMatchObject({ correctAnswer: 'o1', explanation: 'The second option is correct.' });
    const states = await request(app.getHttpServer()).get(`/api/v1/test-attempts/states?testIds=${testId}`).expect(200);
    expect(states.body.data[0]).toMatchObject({ attemptId: httpAttemptId, testId, status: 'SUBMITTED' });
    const history = await request(app.getHttpServer())
      .get('/api/v1/test-attempts/history?component=GRAMMAR_VOCAB&mode=full&page=1&pageSize=5').expect(200);
    expect(history.body.data.some((item: { attemptId: string }) => item.attemptId === httpAttemptId)).toBe(true);
    await request(app.getHttpServer()).get(`/api/v1/test-attempts/${httpAttemptId}`)
      .set('x-test-other-user', '1').expect(404);
    await request(app.getHttpServer()).post('/api/v1/test-attempts')
      .send({ testId: 'invalid', attemptId: httpAttemptId }).expect(400);
    await request(app.getHttpServer()).post('/api/v1/test-attempts')
      .send({ testId, attemptId: randomUUID(), mode: 'invalid' }).expect(400);
  });

  it('serializes simultaneous submissions and deadline finalization', async () => {
    const simultaneousId = randomUUID();
    await service.start(testId, simultaneousId, actor);
    const submissions = await Promise.all([
      service.submit(simultaneousId, actor, { expectedRevision: 0,
        finalChanges: { 'p1:q1': { kind: 'CHOICE', optionId: 'o1' } } }),
      service.submit(simultaneousId, actor, { expectedRevision: 0,
        finalChanges: { 'p1:q1': { kind: 'CHOICE', optionId: 'o1' } } }),
    ]);
    expect(submissions.map(item => item.score)).toEqual([1, 1]);
    expect(submissions[0].submittedAt).toEqual(submissions[1].submittedAt);

    const expiredId = randomUUID();
    await service.start(testId, expiredId, actor);
    await dataSource.query(
      "UPDATE test_attempts SET started_at=clock_timestamp()-interval '30 minutes', expires_at=clock_timestamp()-interval '1 second' WHERE id=$1",
      [expiredId]);
    await Promise.all([
      service.submit(expiredId, actor, { expectedRevision: 0 }),
      service.finalizeExpiredBatch(1),
    ]);
    expect(await service.result(expiredId, actor)).toMatchObject({ score: 0, status: 'SUBMITTED' });
  });

  it('persists Listening explanations through draft, published snapshot and result detail', async () => {
    const listening = new ListeningTestsRepository(dataSource);
    const author = { id: studentId, role: 'ADMIN' as const };
    const aggregate = { mode: 'part3' as const, details: { title: 'Listening explanation test' }, parts: {
      3: { id: 15, context: 'Context', subTitle: 'Opinions', audioUrl: 'https://example.com/audio.mp3',
        options: ['Man', 'Woman', 'Both'], statements: Array.from({ length: 4 }, (_, index) => ({
          id: `15${String.fromCharCode(97 + index)}`, text: `Statement ${index + 1}`, answer: 'Woman',
          explanation: `Reason for statement ${index + 1}`,
        })) },
    } };
    const created = await listening.create(author, aggregate, {});
    const listeningId = created.id!;
    try {
      expect(created.parts[3]?.statements[0].explanation).toBe('Reason for statement 1');
      await listening.publish(listeningId, author, created.version!, created, {});
      const started = await service.start(listeningId, randomUUID(), actor);
      expect(JSON.stringify(started.paper)).not.toContain('Reason for statement 1');
      await service.save(started.attemptId, actor, { expectedRevision: 0,
        changes: { 'p3:s1': { kind: 'MATCH', optionId: 'o1' } } });
      await service.submit(started.attemptId, actor, { expectedRevision: 1 });
      const detail = await service.details(started.attemptId, 3, actor);
      expect(detail.items[0]).toMatchObject({ correctAnswer: 'o1',
        explanation: 'Reason for statement 1', outcome: { outcome: 'CORRECT' } });
      const legacyStart = await request(app.getHttpServer())
        .post(`/api/v1/listening-tests/${listeningId}/attempts?mode=part3`).send({}).expect(201);
      const legacySubmit = await request(app.getHttpServer())
        .post(`/api/v1/listening-tests/${listeningId}/attempts/${legacyStart.body.attemptId}/submit`)
        .send({ attemptId: legacyStart.body.attemptId, timeSpentMs: 1000,
          answers: { part3: { '15a': 'Woman' } } }).expect(201);
      expect(legacySubmit.body).toMatchObject({ score: 2, totalCorrect: 1, totalSkip: 3 });
      expect(legacySubmit.body.partBreakdown.part3[0]).toMatchObject({ userAnswer: 'Woman', isCorrect: true });
      const unifiedResult = await service.result(legacyStart.body.attemptId, actor);
      expect(unifiedResult.result).toMatchObject({ schemaVersion: 1, method: 'OBJECTIVE' });
    } finally {
      await dataSource.query('DELETE FROM test_attempts WHERE snapshot_id IN (SELECT id FROM test_snapshots WHERE test_id=$1)', [listeningId]);
      await dataSource.query('UPDATE tests SET published_snapshot_id=NULL WHERE id=$1', [listeningId]);
      await dataSource.query('DELETE FROM test_snapshots WHERE test_id=$1', [listeningId]);
      await dataSource.query('DELETE FROM audit_logs WHERE entity_id=$1', [listeningId]);
      await dataSource.query('DELETE FROM tests WHERE id=$1', [listeningId]);
    }
  });
});
