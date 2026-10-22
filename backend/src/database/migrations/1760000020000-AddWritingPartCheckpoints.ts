import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWritingPartCheckpoints1760000020000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE writing_grading_jobs ADD COLUMN stage_results jsonb NOT NULL DEFAULT '{}'::jsonb`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE writing_grading_jobs DROP COLUMN stage_results');
  }
}
