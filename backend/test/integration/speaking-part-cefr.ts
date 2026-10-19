import 'reflect-metadata';
import 'dotenv/config';
import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { createDataSourceOptions } from '../../src/database/data-source-options';
import { RemoveSpeakingPartCefr1760000016000 } from '../../src/database/migrations/1760000016000-RemoveSpeakingPartCefr';
import { TestAttemptsRepository } from '../../src/features/test-attempts/repositories/test-attempts.repository';

async function main() {
  const url = process.env.TEST_DATABASE_URL;
  assert.ok(
    url && new URL(url).pathname.endsWith('_test'),
    'TEST_DATABASE_URL must name a dedicated _test database',
  );
  if (process.env.DATABASE_URL)
    assert.notEqual(
      new URL(url).pathname,
      new URL(process.env.DATABASE_URL).pathname,
    );
  const db = new DataSource({
    ...createDataSourceOptions({ ...process.env, DATABASE_URL: url }),
    logging: false,
  });
  await db.initialize();
  const runner = db.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();
  try {
    const schema = `speaking_test_${randomUUID().replaceAll('-', '')}`;
    await runner.query(`CREATE SCHEMA "${schema}"`);
    await runner.query(`SET LOCAL search_path TO "${schema}", public`);
    // Minimal isolated tables exercise the migration and real repository SQL.
    await runner.query(`CREATE TABLE test_snapshots(id uuid PRIMARY KEY, test_id uuid, version int, snapshot jsonb);
      CREATE TABLE test_attempts(id uuid PRIMARY KEY, student_id uuid, snapshot_id uuid, component text,
        purpose text, scope text, part_number int, status text DEFAULT 'SUBMITTED', grading_status text DEFAULT 'COMPLETED',
        score numeric DEFAULT 37.5, max_score numeric DEFAULT 50, estimated_cefr text, result jsonb,
        assessment_revision int NOT NULL DEFAULT 1, started_at timestamptz DEFAULT now(),
        submitted_at timestamptz DEFAULT now(), completed_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now())`);
    const student = randomUUID(),
      snapshot = randomUUID();
    await runner.query(
      `INSERT INTO test_snapshots VALUES($1,$2,1,'{"details":{"title":"Speaking fixture"}}')`,
      [snapshot, randomUUID()],
    );
    const oldResult = {
      method: 'AI',
      score: 37.5,
      maxScore: 50,
      gradingNotice: 'Legacy B2 estimate',
      speaking: {
        estimatedCefr: 'B2',
        cefrReason: 'Legacy B2 rationale',
        criteria: { fluency: 75 },
      },
      parts: [{ partNumber: 1, score: 37.5, maxScore: 50 }],
      items: [{ key: 'p1:q1', score: 37.5 }],
    };
    const fixtures: Array<{
      component: string;
      scope: string;
      part: number | null;
      band: string | null;
      result:
        | ({ speaking?: Record<string, unknown> | null } & Record<
            string,
            unknown
          >)
        | null;
    }> = [
      ...[1, 2, 3, 4].map((part) => ({
        component: 'SPEAKING',
        scope: 'PART',
        part,
        result: oldResult,
        band: 'B2',
      })),
      {
        component: 'SPEAKING',
        scope: 'FULL_SKILL',
        part: null,
        result: oldResult,
        band: 'B2',
      },
      {
        component: 'WRITING',
        scope: 'PART',
        part: 1,
        result: { writing: { feedback: 'Preserve' } },
        band: null,
      },
      {
        component: 'SPEAKING',
        scope: 'PART',
        part: 1,
        result: null,
        band: null,
      },
      {
        component: 'SPEAKING',
        scope: 'PART',
        part: 1,
        result: { method: 'PENDING_AI', speaking: null },
        band: null,
      },
      {
        component: 'SPEAKING',
        scope: 'PART',
        part: 1,
        result: { method: 'AI', speaking: {} },
        band: 'B1',
      },
    ];
    const ids: string[] = [];
    for (const fixture of fixtures) {
      const id = randomUUID();
      ids.push(id);
      await runner.query(
        `INSERT INTO test_attempts(id,student_id,snapshot_id,component,purpose,scope,part_number,estimated_cefr,result)
        VALUES($1,$2,$3,$4,'EXAM',$5,$6,$7,$8::jsonb)`,
        [
          id,
          student,
          snapshot,
          fixture.component,
          fixture.scope,
          fixture.part,
          fixture.band,
          JSON.stringify(fixture.result),
        ],
      );
    }
    const repository = new TestAttemptsRepository({
      query: runner.query.bind(runner),
    } as unknown as DataSource);
    // Dashboard must never aggregate Part estimates, even before cleanup.
    assert.deepEqual(
      (await repository.dashboardAttempts(student)).map(
        (row) => row.estimatedCefr,
      ),
      ['B2'],
    );
    await runner.query(
      "UPDATE test_attempts SET purpose='PRACTICE' WHERE scope='PART'",
    );
    const history = await repository.history(
      student,
      'SPEAKING',
      1,
      20,
      undefined,
      undefined,
      'desc',
      'PRACTICE',
    );
    assert.equal(history.rows.length, 7);
    assert.ok(history.rows.every((row) => row.estimatedCefr === null));

    const migration = new RemoveSpeakingPartCefr1760000016000();
    await migration.up(runner);
    for (const [index, fixture] of fixtures.entries()) {
      const [row] = await runner.query(
        'SELECT * FROM test_attempts WHERE id=$1',
        [ids[index]],
      );
      assert.equal(Number(row.score), 37.5);
      if (fixture.component === 'SPEAKING' && fixture.scope === 'PART') {
        assert.equal(row.estimated_cefr, null);
        if (fixture.result?.speaking) {
          assert.equal(row.result.speaking.estimatedCefr, null);
          assert.match(row.result.speaking.cefrReason, /một Part/);
          assert.equal(row.assessment_revision, 2);
          assert.deepEqual(row.result.items, fixture.result.items);
          assert.deepEqual(
            row.result.speaking.criteria,
            fixture.result.speaking.criteria,
          );
        } else {
          assert.deepEqual(row.result, fixture.result);
          assert.equal(row.assessment_revision, 1);
        }
      } else {
        assert.equal(row.estimated_cefr, fixture.band);
        assert.deepEqual(row.result, fixture.result);
        assert.equal(row.assessment_revision, 1);
      }
    }
    for (const sql of [
      "estimated_cefr='B2'",
      "result=jsonb_set(result,'{speaking,estimatedCefr}','\"B2\"')",
    ]) {
      await runner.query('SAVEPOINT invalid_band');
      await assert.rejects(
        runner.query(`UPDATE test_attempts SET ${sql} WHERE id=$1`, [ids[0]]),
        /speaking_part_cefr_ck/,
      );
      await runner.query('ROLLBACK TO SAVEPOINT invalid_band');
    }
    await migration.down(runner);
    assert.equal(
      (
        await runner.query(
          'SELECT estimated_cefr FROM test_attempts WHERE id=$1',
          [ids[0]],
        )
      )[0].estimated_cefr,
      null,
    );
    await migration.up(runner);
    assert.equal(
      (
        await runner.query(
          'SELECT assessment_revision FROM test_attempts WHERE id=$1',
          [ids[0]],
        )
      )[0].assessment_revision,
      2,
    );
    console.log(
      'Speaking Part CEFR passed: cleanup, full/other skills preserved, history/dashboard, constraints, rollback/reapply.',
    );
  } finally {
    await runner.rollbackTransaction();
    await runner.release();
    await db.destroy();
  }
}

main().catch((error) => {
  console.error('Speaking Part CEFR integration failed:', error?.message);
  process.exitCode = 1;
});
