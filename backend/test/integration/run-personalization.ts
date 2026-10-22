import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const url = process.env.TEST_DATABASE_URL;
if (!url || !decodeURIComponent(new URL(url).pathname).endsWith('_test'))
  throw new Error('TEST_DATABASE_URL ending in _test is required');
for (const name of [
  'personalization-database',
  'personalization-goals',
  'personalization-snapshot',
  'personalization-ability',
  'personalization-plan',
  'personalization-reminders',
  'personalization-comments',
  'personalization-reports',
  'personalization-final',
  'personalization-chatbot',
  'personalization-topics',
]) {
  const result = spawnSync(
    process.execPath,
    ['-r', 'ts-node/register', resolve(__dirname, `${name}.ts`)],
    {
      stdio: 'inherit',
      env: { ...process.env, PERSONALIZATION_WORKER_ENABLED: 'false', PERSONALIZATION_AI_ENABLED: 'false' },
    },
  );
  if (result.status !== 0) {
    process.exitCode = 1;
    break;
  }
}
