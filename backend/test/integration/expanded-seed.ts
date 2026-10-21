import 'reflect-metadata';
import 'dotenv/config';
import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withPersonalizationDatabase } from './personalization-fixture';
import { buildExpandedTests, seedExpandedTests } from '../../src/database/seeds/seed-expanded-tests';
import { buildAudioScripts, AudioManifest } from '../../src/database/seeds/expanded-listening';
import { testCreationId } from '../../src/common/tests/test-creation';

async function main() {
  const url = process.env.TEST_DATABASE_URL;
  assert.ok(url && new URL(url).pathname.endsWith('_test'), 'A dedicated TEST_DATABASE_URL ending in _test is required');
  assert.notEqual(new URL(url).pathname, new URL(process.env.DATABASE_URL!).pathname);
  await withPersonalizationDatabase(async db => {
  const runner = db.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();
  try {
    const adminId = randomUUID();
    await runner.query(`INSERT INTO roles(code,name) VALUES('ADMIN','Admin') ON CONFLICT(code) DO NOTHING`);
    await runner.query(`INSERT INTO users(id,email,password_hash,first_name,last_name,role_id,status)
      SELECT $1,$2,'test-only','Seed','Fixture',id,'ACTIVE' FROM roles WHERE code='ADMIN'`, [adminId, `${adminId}@example.invalid`]);
    const manifest: AudioManifest = Object.fromEntries(buildAudioScripts().map(script => [script.key, {
      url: `https://res.cloudinary.com/test/video/upload/${script.key}.mp3`, sha256: script.sha256, duration: 20,
    }]));
    const definitions = buildExpandedTests(manifest);
    const ids = definitions.map(d => testCreationId(adminId, d.component, d.requestId));
    assert.deepEqual(await seedExpandedTests(runner.manager, manifest, adminId), { created: 140, skipped: 0, total: 140 });
    const rows = await runner.query(`SELECT component,purpose,scope,part_number,count(*)::int count FROM tests
      WHERE id=ANY($1::uuid[]) GROUP BY component,purpose,scope,part_number`, [ids]);
    assert.equal(rows.length, 28);
    assert.ok(rows.every((row: { count: number }) => row.count === 5));
    const [state] = await runner.query(`SELECT count(*)::int tests,
      count(*) FILTER(WHERE status='PUBLISHED' AND published_snapshot_id IS NOT NULL)::int published
      FROM tests WHERE id=ANY($1::uuid[])`, [ids]);
    assert.deepEqual(state, { tests: 140, published: 140 });
    const [questions] = await runner.query(`SELECT count(*)::int count FROM questions WHERE test_id=ANY($1::uuid[]) AND deleted_at IS NULL`, [ids]);
    assert.ok(questions.count > 1000);
    const [snapshots] = await runner.query(`SELECT count(*)::int count FROM test_snapshots WHERE test_id=ANY($1::uuid[])`, [ids]);
    assert.equal(snapshots.count, 140);
    // Topic workflow is optional for this seed; verify its integration when installed.
    const [workflow] = await runner.query("SELECT to_regclass('topic_tagging_jobs') IS NOT NULL AS installed");
    if (workflow.installed) {
      const [jobs] = await runner.query(`SELECT count(*)::int count FROM topic_tagging_jobs WHERE test_id=ANY($1::uuid[])`, [ids]);
      assert.equal(jobs.count, 140);
      const [mappings] = await runner.query(`SELECT count(*)::int count FROM topic_snapshot_questions q JOIN test_snapshots s ON s.id=q.snapshot_id WHERE s.test_id=ANY($1::uuid[])`, [ids]);
      assert.equal(mappings.count, questions.count);
    }
    await runner.query(`UPDATE tests SET title='Edited seed must survive',status='ARCHIVED',archived_at=now() WHERE id=$1`, [ids[0]]);
    const before = await runner.query('SELECT id,title,status,version,published_snapshot_id FROM tests WHERE id=ANY($1::uuid[]) ORDER BY id', [ids]);
    assert.deepEqual(await seedExpandedTests(runner.manager, manifest, adminId), { created: 0, skipped: 140, total: 140 });
    assert.deepEqual(await runner.query('SELECT id,title,status,version,published_snapshot_id FROM tests WHERE id=ANY($1::uuid[]) ORDER BY id', [ids]), before);
    console.info(`PASS: 140 published tests, ${questions.count} questions, 140 snapshots; topic workflow ${workflow.installed ? 'verified' : 'not installed'}; rerun preserves edited/archived tests. All fixture data rolled back.`);
  } finally {
    await runner.rollbackTransaction(); await runner.release();
  }
  });
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Expanded seed integration failed'); process.exitCode = 1; });
