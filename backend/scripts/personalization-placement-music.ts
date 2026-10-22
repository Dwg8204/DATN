import 'reflect-metadata';
import dataSource from '../src/database/data-source';
import { configureMusicPlacement } from '../src/database/seeds/placement-music';
async function main() {
  if (!process.argv.includes('--apply') && !process.argv.includes('--dry-run'))
    throw new Error('Use --dry-run or --apply');
  await dataSource.initialize();
  try {
    console.info(
      await dataSource.transaction((manager) =>
        configureMusicPlacement(manager, process.argv.includes('--apply')),
      ),
    );
  } finally {
    await dataSource.destroy();
  }
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : 'Placement setup failed',
  );
  process.exitCode = 1;
});
