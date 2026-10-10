import { MigrationInterface, QueryRunner } from 'typeorm';

export class OptimizeSharedAttempts1760000008000 implements MigrationInterface {
  name = 'OptimizeSharedAttempts1760000008000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX attempts_active_resume_idx
      ON test_attempts(student_id,snapshot_id,started_at DESC)
      WHERE status='IN_PROGRESS';
      CREATE INDEX attempts_expiry_idx
      ON test_attempts(expires_at,id)
      WHERE status='IN_PROGRESS' AND expires_at IS NOT NULL;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS attempts_expiry_idx; DROP INDEX IF EXISTS attempts_active_resume_idx;`);
  }
}
