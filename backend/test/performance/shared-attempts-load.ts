import '../setup-e2e';
import { createHash, randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { DataSource } from 'typeorm';
import { createDataSourceOptions } from '../../src/database/data-source-options';
import { AssessmentPaperFactory } from '../../src/features/test-attempts/assessments/assessment-paper.factory';
import { ObjectiveGraderService } from '../../src/features/test-attempts/assessments/objective-grader.service';
import { TestAttemptsRepository } from '../../src/features/test-attempts/repositories/test-attempts.repository';
import { TestAttemptsService } from '../../src/features/test-attempts/services/test-attempts.service';
import { AuthUser } from '../../src/features/auth/types/auth-user.type';

const configuredLearners = Number(process.env.ATTEMPT_LOAD_LEARNERS ?? 50);
if (!Number.isInteger(configuredLearners) || configuredLearners < 1 || configuredLearners > 1000) {
  throw new Error('ATTEMPT_LOAD_LEARNERS must be an integer between 1 and 1000.');
}
const LEARNERS = configuredLearners;
const AUTOSAVE_ROUNDS = 5;

function percentile(values: number[], proportion: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  return Math.round(sorted[Math.ceil(proportion * sorted.length) - 1] ?? 0);
}

async function timedBatch<T>(items: T[], action: (item: T) => Promise<unknown>): Promise<number[]> {
  const results = await Promise.allSettled(items.map(async item => {
    const started = performance.now();
    await action(item);
    return performance.now() - started;
  }));
  const failed = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
  if (failed) throw failed.reason;
  return results.map(result => (result as PromiseFulfilledResult<number>).value);
}

async function run(): Promise<void> {
  const database = new DataSource(createDataSourceOptions());
  const testId = randomUUID();
  const snapshotId = randomUUID();
  const actors: AuthUser[] = Array.from({ length: LEARNERS }, (_, index) => ({
    id: randomUUID(), email: `attempt-load-${index}-${testId}@example.invalid`, firstName: 'Load',
    lastName: 'Test', role: 'STUDENT', status: 'ACTIVE',
  }));
  const attemptIds = new Map(actors.map(actor => [actor.id, randomUUID()]));
  await database.initialize();
  try {
    const role = await database.query<Array<{ id: string }>>("SELECT id FROM roles WHERE code='STUDENT'");
    if (!role[0]) throw new Error('Seed STUDENT role into the isolated test database first.');
    for (const actor of actors) {
      await database.query(
        `INSERT INTO users(id,email,password_hash,first_name,last_name,role_id,status,email_verified_at)
         VALUES($1,$2,'load-test-only','Load','Test',$3,'ACTIVE',clock_timestamp())`,
        [actor.id, actor.email, role[0].id]);
    }
    await database.query(
      `INSERT INTO tests(id,created_by,title,component,scope,part_number,part_contents,status)
       VALUES($1,$2,'Shared attempt load test','GRAMMAR_VOCAB','PART',1,'{}'::jsonb,'DRAFT')`,
      [testId, actors[0].id]);
    const snapshot = { mode: 'part1', details: { title: 'Load test' }, parts: {
      1: { instruction: 'Choose an answer', questions: Array.from({ length: 25 }, (_, index) => ({
        id: index + 1, text: `Question ${index + 1}`, options: ['A', 'B', 'C'], correctAnswer: 1,
      })) },
    } };
    const serialized = JSON.stringify(snapshot);
    await database.query(
      `INSERT INTO test_snapshots(id,test_id,version,schema_version,snapshot,content_hash)
       VALUES($1,$2,1,1,$3::jsonb,$4)`,
      [snapshotId, testId, serialized, createHash('sha256').update(serialized).digest('hex')]);
    await database.query("UPDATE tests SET status='PUBLISHED',published_snapshot_id=$2 WHERE id=$1", [testId, snapshotId]);

    const attempts = new TestAttemptsService(new TestAttemptsRepository(database),
      new AssessmentPaperFactory(), new ObjectiveGraderService());
    const starts = await timedBatch(actors, actor => attempts.start(testId, attemptIds.get(actor.id)!, actor));
    const saves: number[] = [];
    for (let revision = 0; revision < AUTOSAVE_ROUNDS; revision += 1) {
      saves.push(...await timedBatch(actors, actor => attempts.save(attemptIds.get(actor.id)!, actor,
        { expectedRevision: revision, changes: { [`p1:q${revision + 1}`]: { kind: 'CHOICE', optionId: 'o1' } } })));
    }
    const submits = await timedBatch(actors, actor => attempts.submit(attemptIds.get(actor.id)!, actor,
      { expectedRevision: AUTOSAVE_ROUNDS }));
    console.info(JSON.stringify({ learners: LEARNERS, autosaves: saves.length,
      start: { p50Ms: percentile(starts, 0.5), p95Ms: percentile(starts, 0.95) },
      autosave: { p50Ms: percentile(saves, 0.5), p95Ms: percentile(saves, 0.95) },
      submit: { p50Ms: percentile(submits, 0.5), p95Ms: percentile(submits, 0.95) } }, null, 2));
  } finally {
    await database.query('DELETE FROM test_attempts WHERE snapshot_id=$1', [snapshotId]);
    await database.query('UPDATE tests SET published_snapshot_id=NULL WHERE id=$1', [testId]);
    await database.query('DELETE FROM test_snapshots WHERE id=$1', [snapshotId]);
    await database.query('DELETE FROM tests WHERE id=$1', [testId]);
    await database.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [actors.map(actor => actor.id)]);
    await database.destroy();
  }
}

run().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
