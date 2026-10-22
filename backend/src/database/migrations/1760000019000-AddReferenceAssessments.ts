import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReferenceAssessments1760000019000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE TABLE reference_ai_activation (
      id boolean PRIMARY KEY DEFAULT true CHECK(id), enabled_since timestamptz NOT NULL DEFAULT now())`);
    await runner.query(`CREATE TABLE reference_ai_jobs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), attempt_id uuid NOT NULL UNIQUE REFERENCES test_attempts(id) ON DELETE CASCADE,
      provider text NOT NULL DEFAULT 'groq' CHECK(provider='groq'), model text NOT NULL,
      config jsonb NOT NULL, status text NOT NULL DEFAULT 'QUEUED' CHECK(status IN ('QUEUED','PROCESSING','COMPLETED','FAILED')),
      input_hash text, result jsonb, error_code text, runs integer NOT NULL DEFAULT 0,
      lease uuid, lease_until timestamptz, available_at timestamptz NOT NULL DEFAULT now(),
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`);
    await runner.query(`CREATE INDEX reference_ai_jobs_due ON reference_ai_jobs(available_at) WHERE status IN ('QUEUED','PROCESSING')`);
    await runner.query(`CREATE TABLE reference_ai_calls (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), model text NOT NULL, usage jsonb,
      created_at timestamptz NOT NULL DEFAULT now())`);
    await runner.query(`CREATE INDEX reference_ai_calls_time ON reference_ai_calls(created_at)`);
    await runner.query(`CREATE TABLE speaking_transcript_cache (
      attempt_id uuid NOT NULL REFERENCES test_attempts(id) ON DELETE CASCADE,
      response_key text NOT NULL, transcript text NOT NULL, PRIMARY KEY(attempt_id,response_key))`);
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP TABLE speaking_transcript_cache, reference_ai_calls, reference_ai_jobs, reference_ai_activation');
  }
}
