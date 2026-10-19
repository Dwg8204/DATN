import 'reflect-metadata';
import 'dotenv/config';
import * as assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { createDataSourceOptions } from '../../src/database/data-source-options';

export async function withPersonalizationDatabase(
  run: (db: DataSource, alice: string, bob: string) => Promise<void>,
) {
  const url = process.env.TEST_DATABASE_URL;
  assert.ok(
    url && decodeURIComponent(new URL(url).pathname).endsWith('_test'),
    'TEST_DATABASE_URL must end in _test',
  );
  if (process.env.DATABASE_URL)
    assert.notEqual(
      new URL(url).pathname,
      new URL(process.env.DATABASE_URL).pathname,
    );
  const options = createDataSourceOptions({
    ...process.env,
    DATABASE_URL: url,
  });
  if (options.type !== 'postgres') throw new Error('PostgreSQL required');
  const schema = `personalization_api_${randomUUID().replaceAll('-', '')}`;
  const admin = await new DataSource({
    ...options,
    logging: false,
  }).initialize();
  const db = new DataSource({
    ...options,
    schema,
    logging: false,
    extra: { options: `-c search_path=${schema},public`, max: 5 },
  });
  try {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    await db.initialize();
    await db.runMigrations();
    await db.query(
      "INSERT INTO roles(code,name) VALUES('STUDENT','Student') ON CONFLICT DO NOTHING",
    );
    const alice = randomUUID(),
      bob = randomUUID();
    for (const id of [alice, bob])
      await db.query(
        `INSERT INTO users(id,email,password_hash,first_name,last_name,role_id,status,timezone)
      SELECT $1,$2,'fixture','Test','Learner',id,'ACTIVE','Asia/Bangkok' FROM roles WHERE code='STUDENT'`,
        [id, `${id}@example.invalid`],
      );
    await run(db, alice, bob);
  } finally {
    if (db.isInitialized) await db.destroy();
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.destroy();
  }
}
