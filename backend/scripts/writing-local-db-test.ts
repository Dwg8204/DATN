import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';

async function main() {
  if (process.env.TEST_DATABASE_URL) {
    await import('../test/integration/writing-assessment');
    return;
  }
  const url = new URL(process.env.DATABASE_URL ?? '');
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
    throw new Error('Only a local PostgreSQL server can be provisioned automatically.');
  const db = new DataSource({ type: 'postgres', url: url.toString(), logging: false });
  await db.initialize();
  try {
    const existing = await db.query("SELECT 1 FROM pg_database WHERE datname='aptimate_ai_writing_test'");
    if (!existing.length) await db.query('CREATE DATABASE aptimate_ai_writing_test');
  } finally {
    await db.destroy();
  }
  url.pathname = '/aptimate_ai_writing_test';
  process.env.TEST_DATABASE_URL = url.toString();
  await import('../test/integration/writing-assessment');
}
main().catch((error) => {
  const code =
    typeof error?.code === 'string' && /^[A-Z0-9_]+$/.test(error.code)
      ? error.code
      : 'CONFIGURATION_OR_CONNECTION';
  console.error(
    `Local Writing test database could not be prepared (${code}). Set TEST_DATABASE_URL to a dedicated *_test database.`,
  );
  process.exitCode = 1;
});
