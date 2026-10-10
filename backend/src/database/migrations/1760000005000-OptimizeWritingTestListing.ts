import { MigrationInterface, QueryRunner } from 'typeorm';

export class OptimizeWritingTestListing1760000005000 implements MigrationInterface {
  name = 'OptimizeWritingTestListing1760000005000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX writing_tests_title_trgm_idx
        ON tests USING gin(title gin_trgm_ops)
        WHERE component='WRITING';
      CREATE INDEX writing_snapshots_title_trgm_idx
        ON test_snapshots USING gin((snapshot #>> '{details,title}') gin_trgm_ops)
        WHERE snapshot->>'component'='WRITING';
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS writing_snapshots_title_trgm_idx; DROP INDEX IF EXISTS writing_tests_title_trgm_idx;`);
  }
}

