import { MigrationInterface, QueryRunner } from 'typeorm';

export class OptimizeListeningTestListing1760000006000 implements MigrationInterface {
  name = 'OptimizeListeningTestListing1760000006000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS tests_listening_listing_idx
      ON tests(status, scope, part_number, created_at DESC)
      WHERE component = 'LISTENING'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF NOT EXISTS tests_listening_listing_idx`);
  }
}
