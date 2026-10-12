import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWritingAiGrading1760000012000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE test_attempts ADD COLUMN feedback_locale varchar(5) NOT NULL DEFAULT 'vi'
      CHECK (feedback_locale IN ('vi','en'))`);
    await runner.query(`CREATE TABLE writing_grading_jobs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), attempt_id uuid NOT NULL REFERENCES test_attempts(id) ON DELETE CASCADE,
      assessment_revision integer NOT NULL CHECK (assessment_revision>0),
      status varchar(20) NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED','PROCESSING','COMPLETED','FAILED')),
      input_hash varchar(64) NOT NULL, config_snapshot jsonb NOT NULL,
      attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count>=0), available_at timestamptz NOT NULL DEFAULT now(),
      lease_token uuid, lease_expires_at timestamptz, error_code varchar(100),
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
      UNIQUE (attempt_id, assessment_revision))`);
    await runner.query(
      `CREATE INDEX writing_jobs_due ON writing_grading_jobs(available_at,created_at) WHERE status='QUEUED'`,
    );
    await runner.query(
      `CREATE INDEX writing_jobs_expired ON writing_grading_jobs(lease_expires_at) WHERE status='PROCESSING'`,
    );
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP TABLE writing_grading_jobs');
    await runner.query('ALTER TABLE test_attempts DROP COLUMN feedback_locale');
  }
}
