import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSpeakingAiGrading1760000011000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE TABLE speaking_ai_consents (
      attempt_id uuid PRIMARY KEY REFERENCES test_attempts(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES users(id), policy_version varchar(40) NOT NULL,
      confirmed_adult boolean NOT NULL CHECK (confirmed_adult), accepted_at timestamptz NOT NULL DEFAULT now()
    )`);
    await runner.query(`CREATE TABLE speaking_grading_jobs (
      attempt_id uuid PRIMARY KEY REFERENCES test_attempts(id) ON DELETE CASCADE,
      status varchar(20) NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED','PROCESSING','COMPLETED','FAILED','BLOCKED')),
      failures integer NOT NULL DEFAULT 0, next_run_at timestamptz NOT NULL DEFAULT now(),
      lease_token uuid, lease_until timestamptz, responses jsonb NOT NULL DEFAULT '{}',
      config_snapshot jsonb NOT NULL DEFAULT '{}', error_code varchar(100),
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    )`);
    await runner.query(`CREATE INDEX speaking_jobs_due ON speaking_grading_jobs(status,next_run_at)`);
    await runner.query(`CREATE TABLE speaking_ai_costs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), attempt_id uuid NOT NULL REFERENCES test_attempts(id),
      provider varchar(20) NOT NULL, stage varchar(80) NOT NULL, model varchar(100) NOT NULL,
      state varchar(20) NOT NULL DEFAULT 'RESERVED' CHECK (state IN ('RESERVED','CHARGED')),
      reserved_usd numeric(18,8) NOT NULL CHECK (reserved_usd >= 0), charged_usd numeric(18,8),
      usage jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
    )`);
    await runner.query(`CREATE INDEX speaking_costs_month ON speaking_ai_costs(created_at)`);
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP TABLE speaking_ai_costs');
    await runner.query('DROP TABLE speaking_grading_jobs');
    await runner.query('DROP TABLE speaking_ai_consents');
  }
}
