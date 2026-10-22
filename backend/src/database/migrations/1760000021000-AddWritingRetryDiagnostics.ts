import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWritingRetryDiagnostics1760000021000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE writing_grading_jobs ADD COLUMN last_validation_failure jsonb');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE writing_grading_jobs DROP COLUMN last_validation_failure');
  }
}
