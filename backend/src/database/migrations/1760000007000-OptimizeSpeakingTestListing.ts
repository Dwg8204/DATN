import { MigrationInterface, QueryRunner } from 'typeorm';

export class OptimizeSpeakingTestListing1760000007000 implements MigrationInterface {
  name = 'OptimizeSpeakingTestListing1760000007000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS tests_speaking_listing_idx
      ON tests(status, scope, part_number, created_at DESC)
      WHERE component = 'SPEAKING'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF NOT EXISTS tests_speaking_listing_idx`);
  }
}
