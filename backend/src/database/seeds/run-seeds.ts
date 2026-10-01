import dataSource from '../data-source';
import { loadSeedAdminConfig } from './seed-admin.config';
import { seedBootstrapData } from './seed-bootstrap';

async function seed() {
  const admin = loadSeedAdminConfig();
  await dataSource.initialize();
  try {
    const result = await dataSource.transaction('SERIALIZABLE', manager => seedBootstrapData(manager, admin));
    console.info(result === 'created' ? 'Roles and administrator account created.' : 'Roles and administrator account are ready.');
  } finally {
    await dataSource.destroy();
  }
}

seed().catch(error => {
  console.error(error instanceof Error ? error.message : 'Database seed failed.');
  process.exitCode = 1;
});
