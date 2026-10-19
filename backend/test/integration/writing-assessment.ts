import 'reflect-metadata';
import 'dotenv/config';
import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AddWritingAiGrading1760000012000 } from '../../src/database/migrations/1760000012000-AddWritingAiGrading';
import { AddSpeakingAiGrading1760000011000 } from '../../src/database/migrations/1760000011000-AddSpeakingAiGrading';
import { WritingAiConfig } from '../../src/features/writing-assessment/writing-ai-config.service';
import {
  WritingGradingJobsRepository,
  writingInputHash,
} from '../../src/features/writing-assessment/repositories/writing-grading-jobs.repository';
import { WritingInputBuilder } from '../../src/features/writing-assessment/services/writing-input-builder.service';
import { WritingAssessmentValidator } from '../../src/features/writing-assessment/services/writing-assessment-validator.service';
import { WritingAssessmentService } from '../../src/features/writing-assessment/services/writing-assessment.service';
import { WritingAssessmentCoordinator } from '../../src/features/writing-assessment/services/writing-assessment-coordinator.service';
import { WritingAssessmentWorker } from '../../src/features/writing-assessment/workers/writing-assessment.worker';
import { writingFixture } from '../../src/features/writing-assessment/testing/writing.fixture';
import { TestAttemptsRepository } from '../../src/features/test-attempts/repositories/test-attempts.repository';
import { TestAttemptsService } from '../../src/features/test-attempts/services/test-attempts.service';
import { PracticeAttemptsService } from '../../src/features/test-attempts/services/practice-attempts.service';
import { AssessmentPaperFactory } from '../../src/features/test-attempts/assessments/assessment-paper.factory';
import { ObjectiveGraderService } from '../../src/features/test-attempts/assessments/objective-grader.service';
import { AuthUser } from '../../src/features/auth/types/auth-user.type';
import { AssessmentResult } from '../../src/features/test-attempts/types/attempt.type';
import { AiError } from '../../src/common/ai/ai-error';

async function main() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url || !decodeURIComponent(new URL(url).pathname).endsWith('_test'))
    throw new Error('TEST_DATABASE_URL must name a dedicated *_test database.');
  const schema = `writing_test_${randomUUID().replace(/-/g, '')}`;
  const admin = new DataSource({ type: 'postgres', url, logging: false });
  await admin.initialize();
  await admin.query(`CREATE SCHEMA "${schema}"`);
  const db = new DataSource({
    type: 'postgres',
    url,
    logging: false,
    extra: { options: `-c search_path=${schema}`, max: 4 },
  });
  try {
    await db.initialize();
    await db.query(
      `CREATE TYPE grading_status AS ENUM ('NOT_STARTED','QUEUED','PROCESSING','PARTIAL_FAILED','FAILED','COMPLETED')`,
    );
    await db.query(`CREATE TYPE result_source AS ENUM ('AUTOMATIC','MANUAL')`);
    await db.query(`CREATE TABLE users(id uuid PRIMARY KEY)`);
    await db.query(
      `CREATE TABLE test_snapshots(id uuid PRIMARY KEY,test_id uuid NOT NULL,version integer DEFAULT 1,schema_version integer DEFAULT 1,snapshot jsonb NOT NULL)`,
    );
    await db.query(`CREATE TABLE test_attempts(id uuid PRIMARY KEY,student_id uuid NOT NULL,snapshot_id uuid NOT NULL REFERENCES test_snapshots(id),
      component varchar NOT NULL,purpose varchar NOT NULL,scope varchar NOT NULL,part_number integer,status varchar DEFAULT 'IN_PROGRESS',
      grading_status grading_status DEFAULT 'NOT_STARTED',assessment_revision integer DEFAULT 0,result jsonb,score numeric,max_score numeric,
      estimated_cefr varchar,result_source result_source,started_at timestamptz DEFAULT now()-interval '1 hour',expires_at timestamptz,
      submitted_at timestamptz,completed_at timestamptz,updated_at timestamptz DEFAULT now())`);
    await db.query(`CREATE TABLE attempt_progress(attempt_id uuid PRIMARY KEY REFERENCES test_attempts(id) ON DELETE CASCADE,
      answers jsonb DEFAULT '{}',progress jsonb DEFAULT '{}',revision integer DEFAULT 0,saved_at timestamptz DEFAULT now(),sealed_at timestamptz)`);
    const runner = db.createQueryRunner();
    await runner.connect();
    await new AddSpeakingAiGrading1760000011000().up(runner);
    await new AddWritingAiGrading1760000012000().up(runner);
    const actor = { id: randomUUID() } as AuthUser;
    await db.query('INSERT INTO users(id) VALUES($1)', [actor.id]);
    const config = new WritingAiConfig(
      new ConfigService({
        WRITING_AI_ENABLED: true,
        GEMINI_API_KEY: 'test-key-not-a-real-credential',
        GEMINI_BILLING_TIER: 'FREE',
        GEMINI_FREE_PROJECT_CONFIRMED: true,
        GEMINI_PAID_PROJECT_CONFIRMED: false,
      }),
    );
    const jobs = new WritingGradingJobsRepository(db);
    const builder = new WritingInputBuilder();
    const coordinator = new WritingAssessmentCoordinator(config, jobs, builder);
    const repo = new TestAttemptsRepository(db);
    const factory = new AssessmentPaperFactory();
    const grader = new ObjectiveGraderService();
    const exams = new TestAttemptsService(repo, factory, grader, coordinator);
    const practices = new PracticeAttemptsService(repo, factory, grader, coordinator);
    let calls = 0;
    let failure = false;
    const provider = {
      generateStructured: async (request: { input: unknown }) => {
        calls++;
        if (failure) throw new AiError('GEMINI_HTTP_429', true, 60000);
        const input = request.input as ReturnType<typeof writingFixture>['input'];
        return writingFixture(input.scope === 'PART' ? input.parts[0].partNumber : undefined).result;
      },
    };
    const assessor = new WritingAssessmentService(provider, new WritingAssessmentValidator());
    const worker = new WritingAssessmentWorker(config, jobs, builder, assessor);
    const create = async (purpose: 'EXAM' | 'PRACTICE', partNumber?: number, expired = false) => {
      const fixture = writingFixture(partNumber),
        id = randomUUID(),
        snapshot = randomUUID();
      await db.query('INSERT INTO test_snapshots(id,test_id,snapshot) VALUES($1,$2,$3::jsonb)', [
        snapshot,
        randomUUID(),
        JSON.stringify(fixture.snapshot),
      ]);
      await db.query(
        `INSERT INTO test_attempts(id,student_id,snapshot_id,component,purpose,scope,part_number,expires_at)
        VALUES($1,$2,$3,'WRITING',$4,$5,$6,$7)`,
        [
          id,
          actor.id,
          snapshot,
          purpose,
          fixture.input.scope,
          partNumber ?? null,
          expired ? new Date(Date.now() - 1000) : null,
        ],
      );
      if (purpose === 'EXAM')
        await db.query('INSERT INTO attempt_progress(attempt_id,answers) VALUES($1,$2::jsonb)', [
          id,
          expired ? JSON.stringify(fixture.answers) : '{}',
        ]);
      return { ...fixture, id };
    };
    const run = async () => {
      await db.query(
        "UPDATE writing_grading_jobs SET updated_at=now()-interval '1 hour' WHERE status<>'PROCESSING'",
      );
      await worker.runOnce();
    };
    const full = await create('EXAM');
    await exams.submit(full.id, actor, {
      expectedRevision: 0,
      finalChanges: full.answers,
    });
    await exams.submit(full.id, actor, { expectedRevision: 0 });
    assert.equal((await db.query('SELECT * FROM writing_grading_jobs')).length, 1);
    await run();
    const summary = await exams.result(full.id, actor);
    assert.equal(summary.gradingStatus, 'COMPLETED');
    assert.equal(summary.estimatedCefr, 'B1');
    assert.equal(summary.score, null);
    assert.equal(
      (summary.result?.writing as object | undefined) && 'details' in summary.result!.writing!,
      false,
    );
    const detail = await exams.details(full.id, 4, actor);
    assert.equal(detail.writing?.part?.questions.length, 2);
    assert.equal(detail.items[0].selectedAnswer?.kind, 'TEXT');
    await exams.result(full.id, actor);
    await exams.details(full.id, 4, actor);
    assert.equal(calls, 1, 'Reading results must not call AI');

    const practice = await create('PRACTICE', 4);
    await practices.complete(practice.id, { answers: practice.answers, revealedKeys: ['p4:q1'] }, actor);
    await run();
    const partResult = await practices.result(practice.id, actor);
    assert.equal(partResult.gradingStatus, 'COMPLETED');
    assert.equal(partResult.estimatedCefr, null);
    assert.equal(partResult.result?.writing?.cefr.status, 'NOT_APPLICABLE');
    assert.deepEqual(partResult.result?.assistance?.revealedKeys, ['p4:q1']);
    assert.equal((await practices.details(practice.id, 4, actor)).writing?.part?.questions.length, 2);

    const expired = await create('EXAM', undefined, true);
    assert.equal(await exams.finalizeExpiredBatch(1), 1);
    await run();
    assert.equal((await exams.result(expired.id, actor)).gradingStatus, 'COMPLETED');
    const blank = await create('EXAM');
    await exams.submit(blank.id, actor, { expectedRevision: 0 });
    const beforeBlank = calls;
    await run();
    assert.equal(calls, beforeBlank);
    assert.equal((await exams.result(blank.id, actor)).result?.writing?.cefr.reason, 'NO_RESPONSE');

    const failed = await create('EXAM');
    await exams.submit(failed.id, actor, {
      expectedRevision: 0,
      finalChanges: failed.answers,
    });
    failure = true;
    await run();
    assert.equal((await exams.result(failed.id, actor)).gradingStatus, 'QUEUED');
    const [job] = await db.query('SELECT * FROM writing_grading_jobs WHERE attempt_id=$1', [failed.id]);
    assert.equal(job.error_code, 'GEMINI_HTTP_429');
    assert.equal(job.attempt_count, 1);
    await db.query(
      "UPDATE writing_grading_jobs SET config_snapshot=jsonb_set(config_snapshot,'{maxAttempts}','1'),available_at=now() WHERE id=$1",
      [job.id],
    );
    await run();
    assert.equal((await exams.result(failed.id, actor)).gradingStatus, 'FAILED');
    await assert.rejects(coordinator.retry(failed.id, randomUUID(), 'EXAM'));
    await assert.rejects(coordinator.retry(failed.id, actor.id, 'PRACTICE'));
    await assert.rejects(coordinator.retry(failed.id, actor.id, 'EXAM'), /wait/);
    await db.query("UPDATE writing_grading_jobs SET created_at=now()-interval '2 minutes' WHERE id=$1", [
      job.id,
    ]);
    await coordinator.retry(failed.id, actor.id, 'EXAM');
    assert.equal(
      (await db.query('SELECT * FROM writing_grading_jobs WHERE attempt_id=$1', [failed.id])).length,
      2,
    );
    failure = false;
    await run();
    assert.equal((await exams.result(failed.id, actor)).gradingStatus, 'COMPLETED');

    const concurrent = await create('EXAM');
    await Promise.all([
      exams.submit(concurrent.id, actor, {
        expectedRevision: 0,
        finalChanges: concurrent.answers,
      }),
      exams.submit(concurrent.id, actor, {
        expectedRevision: 0,
        finalChanges: concurrent.answers,
      }),
    ]);
    assert.equal(
      (await db.query('SELECT * FROM writing_grading_jobs WHERE attempt_id=$1', [concurrent.id])).length,
      1,
    );
    await db.query("UPDATE writing_grading_jobs SET updated_at=now()-interval '1 hour'");
    const claims = await Promise.all([jobs.claim(5000), jobs.claim(5000)]);
    assert.equal(claims.filter(Boolean).length, 1, 'Only one Writing worker can claim at a time');
    const stale = claims.find(Boolean)!;
    await db.query(
      "UPDATE writing_grading_jobs SET lease_expires_at=now()-interval '1 second',updated_at=now()-interval '1 hour' WHERE id=$1",
      [stale.id],
    );
    const recovered = await jobs.claim(5000);
    assert.ok(recovered);
    assert.notEqual(recovered.lease_token, stale.lease_token);
    const staleContext = await jobs.context(stale);
    await jobs.finish(stale, {
      ...(staleContext.result as AssessmentResult),
      method: 'AI',
    });
    assert.equal(
      (await exams.result(concurrent.id, actor)).gradingStatus,
      'PROCESSING',
      'Old worker cannot overwrite recovered lease',
    );
    await jobs.fail(recovered, 'AI_TIMEOUT', true, 1000);
    await db.query(
      "UPDATE writing_grading_jobs SET available_at=now(),updated_at=now()-interval '1 hour' WHERE id=$1",
      [recovered.id],
    );
    await run();
    assert.equal((await exams.result(concurrent.id, actor)).gradingStatus, 'COMPLETED');

    const disabled = new WritingAssessmentCoordinator(
      new WritingAiConfig(new ConfigService({ WRITING_AI_ENABLED: false })),
      jobs,
      builder,
    );
    const disabledExams = new TestAttemptsService(repo, factory, grader, disabled);
    const noAi = await create('EXAM');
    await disabledExams.submit(noAi.id, actor, {
      expectedRevision: 0,
      finalChanges: noAi.answers,
    });
    assert.equal((await disabledExams.result(noAi.id, actor)).gradingStatus, 'NOT_STARTED');
    assert.equal(
      (await db.query('SELECT * FROM writing_grading_jobs WHERE attempt_id=$1', [noAi.id])).length,
      0,
    );

    const fullPractice = await create('PRACTICE');
    await practices.complete(fullPractice.id, { answers: fullPractice.answers, revealedKeys: [] }, actor);
    await run();
    assert.equal((await practices.result(fullPractice.id, actor)).estimatedCefr, 'B1');

    for (const firstAge of ['2 minutes', '25 hours']) {
      const limited = await create('EXAM');
      await db.query('UPDATE test_attempts SET assessment_revision=5 WHERE id=$1', [limited.id]);
      await exams.submit(limited.id, actor, {
        expectedRevision: 0,
        finalChanges: limited.answers,
      });
      await db.query(
        `UPDATE writing_grading_jobs SET status='FAILED',attempt_count=3,
        created_at=now()-$2::interval WHERE attempt_id=$1`,
        [limited.id, firstAge],
      );
      await db.query("UPDATE test_attempts SET grading_status='FAILED' WHERE id=$1", [limited.id]);
      for (let index = 0; index < 3; index++) {
        await coordinator.retry(limited.id, actor.id, 'EXAM');
        await db.query(
          `UPDATE writing_grading_jobs SET status='FAILED',created_at=now()-interval '2 minutes'
          WHERE attempt_id=$1 AND assessment_revision=(SELECT assessment_revision FROM test_attempts WHERE id=$1)`,
          [limited.id],
        );
        await db.query("UPDATE test_attempts SET grading_status='FAILED' WHERE id=$1", [limited.id]);
      }
      await assert.rejects(coordinator.retry(limited.id, actor.id, 'EXAM'), /wait/);
      const [firstRevision] = await db.query(
        'SELECT min(assessment_revision) AS revision FROM writing_grading_jobs WHERE attempt_id=$1',
        [limited.id],
      );
      assert.ok(firstRevision.revision > 1, 'The first job does not necessarily have revision one');
      // A retry older than the rolling window no longer consumes the manual allowance.
      await db.query(
        `UPDATE writing_grading_jobs SET created_at=now()-interval '25 hours'
        WHERE attempt_id=$1 AND assessment_revision=$2`,
        [limited.id, firstRevision.revision + 1],
      );
      const retries = await Promise.allSettled([
        coordinator.retry(limited.id, actor.id, 'EXAM'),
        coordinator.retry(limited.id, actor.id, 'EXAM'),
      ]);
      assert.equal(retries.filter((result) => result.status === 'fulfilled').length, 1);
      await run();
      assert.equal((await exams.result(limited.id, actor)).gradingStatus, 'COMPLETED');
    }

    const oldJob = await create('EXAM', 2);
    await exams.submit(oldJob.id, actor, {
      expectedRevision: 0,
      finalChanges: oldJob.answers,
    });
    const oldConfig = {
      ...config.snapshot('vi'),
      rubricVersion: 'writing-rubric-v1',
      promptVersion: 'writing-prompt-v1',
    };
    delete oldConfig.inputVersion;
    const oldInput = builder.build(oldJob.snapshot, oldJob.answers, 'PART', 'vi', [], 1);
    await db.query(
      'UPDATE writing_grading_jobs SET config_snapshot=$2::jsonb,input_hash=$3 WHERE attempt_id=$1',
      [oldJob.id, JSON.stringify(oldConfig), writingInputHash(oldInput, oldConfig)],
    );
    await run();
    assert.equal((await exams.result(oldJob.id, actor)).gradingStatus, 'COMPLETED');

    const speakingId = randomUUID();
    await db.query(
      `INSERT INTO test_attempts(id,student_id,snapshot_id,component,purpose,scope,status,result)
      SELECT $1,$2,snapshot_id,'SPEAKING','EXAM','FULL_SKILL','SUBMITTED','{"method":"PENDING_AI"}'::jsonb FROM test_attempts WHERE id=$3`,
      [speakingId, actor.id, full.id],
    );
    await db.query(
      `INSERT INTO writing_grading_jobs(attempt_id,assessment_revision,input_hash,config_snapshot)
      VALUES($1,1,$2,$3::jsonb)`,
      [speakingId, '0'.repeat(64), JSON.stringify(config.snapshot('vi'))],
    );
    await db.query('UPDATE test_attempts SET assessment_revision=1 WHERE id=$1', [speakingId]);
    const [speakingBefore] = await db.query('SELECT * FROM test_attempts WHERE id=$1', [speakingId]);
    await db.query("UPDATE writing_grading_jobs SET updated_at=now()-interval '1 hour'");
    assert.equal(
      await jobs.claim(5000),
      null,
      'Writing cannot claim a Speaking attempt even with an invalid job',
    );
    assert.deepEqual(
      (await db.query('SELECT * FROM test_attempts WHERE id=$1', [speakingId]))[0],
      speakingBefore,
    );

    assert.equal((await db.query('SELECT * FROM speaking_grading_jobs')).length, 0);
    assert.equal((await db.query('SELECT * FROM speaking_ai_costs')).length, 0);
    await new AddWritingAiGrading1760000012000().down(runner);
    assert.equal(
      (
        await db.query(
          "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema=$1 AND table_name LIKE 'speaking_%'",
          [schema],
        )
      )[0].n,
      3,
    );
    await runner.release();
    console.log(
      'Writing PostgreSQL integration OK: exam, practice, expiry, blank, quota retry, ownership, concurrent submit/claim, lease recovery, disabled mode and Speaking isolation.',
    );
  } finally {
    if (db.isInitialized) await db.destroy();
    // The schema name is generated above and only contains this test's objects.
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.destroy();
  }
}
main().catch((error) => {
  console.error(
    'Writing database integration failed:',
    error instanceof Error ? error.message : 'Unknown test error',
  );
  process.exitCode = 1;
});
