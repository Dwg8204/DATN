import dataSource from '../data-source';

const roles = [
  ['ADMIN', 'Administrator', 'Manages users, tests and system operations.'],
  ['TEACHER', 'Teacher', 'Creates tests and reviews learner performance.'],
  ['STUDENT', 'Student', 'Practises Aptis tests and reviews results.'],
] as const;

async function seed() {
  await dataSource.initialize();
  try {
    for (const [code, name, description] of roles) {
      await dataSource.query(
        `INSERT INTO roles(code, name, description) VALUES ($1, $2, $3)
         ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description`,
        [code, name, description],
      );
    }
  } finally {
    await dataSource.destroy();
  }
}

seed().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
