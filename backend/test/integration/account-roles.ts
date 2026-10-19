import 'reflect-metadata';
import 'dotenv/config';
import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { createDataSourceOptions } from '../../src/database/data-source-options';
import { EnableExtensionsAndEnums1760000000000 } from '../../src/database/migrations/1760000000000-EnableExtensionsAndEnums';
import { CreateCoreSchema1760000001000 } from '../../src/database/migrations/1760000001000-CreateCoreSchema';
import { CreateFeatureSchema1760000002000 } from '../../src/database/migrations/1760000002000-CreateFeatureSchema';
import { TrackAuthSessions1760000007000 } from '../../src/database/migrations/1760000007000-TrackAuthSessions';
import { RestrictAccountRoles1760000015000 } from '../../src/database/migrations/1760000015000-RestrictAccountRoles';

async function main() {
  const url = process.env.TEST_DATABASE_URL;
  assert.ok(url && new URL(url).pathname.endsWith('_test'), 'TEST_DATABASE_URL must name a dedicated _test database');
  assert.notEqual(new URL(url).pathname, new URL(process.env.DATABASE_URL!).pathname);
  const db = new DataSource({ ...createDataSourceOptions({ ...process.env, DATABASE_URL: url }), logging: false });
  await db.initialize();
  const runner = db.createQueryRunner();
  await runner.connect();
  await runner.startTransaction();
  try {
    const schema = `roles_test_${randomUUID().replaceAll('-', '')}`;
    await runner.query(`CREATE SCHEMA "${schema}"`);
    await runner.query(`SET LOCAL search_path TO "${schema}", public`);
    for (const migration of [new EnableExtensionsAndEnums1760000000000(), new CreateCoreSchema1760000001000(),
      new CreateFeatureSchema1760000002000(), new TrackAuthSessions1760000007000()]) await migration.up(runner);
    await runner.query(`INSERT INTO roles(code,name) VALUES ('ADMIN','Admin'),('STUDENT','User'),('TEACHER','Teacher')`);
    const admin = randomUUID(), student = randomUUID(), former = randomUUID(), deleted = randomUUID();
    for (const [id, role] of [[admin, 'ADMIN'], [student, 'STUDENT'], [former, 'TEACHER'], [deleted, 'TEACHER']]) {
      await runner.query(`INSERT INTO users(id,email,password_hash,first_name,last_name,role_id,status)
        SELECT $1,$2,'test-only','Role','Fixture',id,'ACTIVE' FROM roles WHERE code=$3`, [id, `${id}@example.invalid`, role]);
      await runner.query(`INSERT INTO refresh_tokens(user_id,token_hash,family_id,expires_at)
        VALUES($1,$2,$3,now()+interval '1 day')`, [id, id, randomUUID()]);
    }
    await runner.query('UPDATE users SET deleted_at=now() WHERE id=$1', [deleted]);
    const draft = randomUUID(), scheduled = randomUUID(), sent = randomUUID();
    for (const [id, status] of [[draft, 'DRAFT'], [scheduled, 'SCHEDULED'], [sent, 'SENT']]) {
      await runner.query(`INSERT INTO notifications(id,created_by,title,content,type,channel,audience_type,audience_role_id,status)
        SELECT $1,$2,'Fixture','Fixture','SYSTEM','IN_APP','ROLE',id,$3 FROM roles WHERE code='TEACHER'`, [id, admin, status]);
    }
    await runner.query(`INSERT INTO notification_recipients(notification_id,user_id) VALUES($1,$2),($3,$2)`, [scheduled, former, sent]);
    const testId = randomUUID();
    await runner.query(`INSERT INTO tests(id,created_by,title,component,scope,part_number)
      VALUES($1,$2,'Preserve author','WRITING','PART',1)`, [testId, former]);
    await runner.query(`CREATE TABLE provenance_fixture(result result_source, source vocabulary_source_type);
      INSERT INTO provenance_fixture VALUES('TEACHER','TEACHER')`);

    const migration = new RestrictAccountRoles1760000015000();
    await migration.up(runner);
    assert.deepEqual((await runner.query('SELECT code FROM roles ORDER BY code')).map((row: { code: string }) => row.code), ['ADMIN', 'STUDENT']);
    for (const id of [former, deleted]) {
      const [user] = await runner.query('SELECT r.code,u.auth_version FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=$1', [id]);
      assert.equal(user.code, 'STUDENT'); assert.equal(user.auth_version, 1);
      assert.ok((await runner.query('SELECT revoked_at FROM refresh_tokens WHERE user_id=$1', [id]))[0].revoked_at);
    }
    for (const id of [admin, student]) {
      assert.equal((await runner.query('SELECT auth_version FROM users WHERE id=$1', [id]))[0].auth_version, 0);
      assert.equal((await runner.query('SELECT revoked_at FROM refresh_tokens WHERE user_id=$1', [id]))[0].revoked_at, null);
    }
    for (const id of [draft, scheduled, sent]) {
      const [notification] = await runner.query('SELECT audience_type,audience_role_id FROM notifications WHERE id=$1', [id]);
      assert.equal(notification.audience_type, 'SELECTED_USERS'); assert.equal(notification.audience_role_id, null);
      assert.deepEqual((await runner.query('SELECT user_id FROM notification_recipients WHERE notification_id=$1', [id]))
        .map((row: { user_id: string }) => row.user_id), [former]);
    }
    assert.equal((await runner.query('SELECT created_by FROM tests WHERE id=$1', [testId]))[0].created_by, former);
    assert.deepEqual(await runner.query('SELECT * FROM provenance_fixture'), [{ result: 'MANUAL', source: 'MANUAL' }]);
    assert.equal((await runner.query("SELECT count(*)::int AS count FROM audit_logs WHERE action='USER_ROLE_CHANGED'"))[0].count, 2);
    await runner.query('SAVEPOINT reject_removed_role');
    await assert.rejects(runner.query("INSERT INTO roles(code,name) VALUES('TEACHER','Unsupported')"), /roles_supported_code_ck/);
    await runner.query('ROLLBACK TO SAVEPOINT reject_removed_role');
    await migration.down(runner);
    assert.equal((await runner.query('SELECT r.code FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=$1', [former]))[0].code, 'STUDENT');
    await migration.up(runner);
    console.log('Account role migration passed: accounts, deleted users, session revocation, authorship, notification recipients, provenance, constraint and rollback/reapply.');
  } finally {
    await runner.rollbackTransaction(); await runner.release(); await db.destroy();
  }
}
main().catch(error => { console.error('Account role migration test failed:', error?.message); process.exitCode = 1; });
