import 'dotenv/config';

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) throw new Error('TEST_DATABASE_URL is required for E2E tests. Use a disposable PostgreSQL database.');

const target = new URL(testUrl);
const databaseName = decodeURIComponent(target.pathname.slice(1));
if (!databaseName.endsWith('_test')) {
  throw new Error('E2E database name must end with _test.');
}
if (process.env.DATABASE_URL) {
  const regular = new URL(process.env.DATABASE_URL);
  if (regular.hostname === target.hostname && regular.port === target.port && regular.pathname === target.pathname) {
    throw new Error('TEST_DATABASE_URL must point to a different database than DATABASE_URL.');
  }
}

process.env.DATABASE_URL = testUrl;
process.env.NODE_ENV = 'test';
process.env.ATTEMPT_EXPIRY_WORKER_ENABLED = 'false';
