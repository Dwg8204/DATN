import { MigrationInterface, QueryRunner } from 'typeorm';
export class AddMistakeExplanations1760000025000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE mistake_explanations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      attempt_id uuid NOT NULL REFERENCES test_attempts(id) ON DELETE CASCADE,
      assessment_revision integer NOT NULL,
      question_key text NOT NULL, locale varchar(5) NOT NULL CHECK(locale IN ('vi','en')),
      prompt_version varchar(50) NOT NULL,
      status varchar(20) NOT NULL CHECK(status IN ('READY','FALLBACK')),
      content jsonb NOT NULL, chunk_ids uuid[] NOT NULL DEFAULT '{}',
      ai_request_id uuid REFERENCES ai_requests(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(user_id,attempt_id,assessment_revision,question_key,locale,prompt_version)
    );
    CREATE TABLE retrieval_gaps (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES users(id) ON DELETE SET NULL,
      feature varchar(20) NOT NULL CHECK(feature IN ('PLAN','EXPLAIN','REPORT')),
      component skill_component NOT NULL,part_number smallint,topic_codes text[] NOT NULL DEFAULT '{}',
      tier smallint CHECK(tier BETWEEN 1 AND 4),top_similarity real,
      source_question_id uuid REFERENCES questions(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX retrieval_gaps_report_idx ON retrieval_gaps(feature,component,part_number,created_at DESC);
    -- Reserve each provider call atomically before network I/O, including retries.
    CREATE TABLE mistake_explanation_usage (
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      usage_day date NOT NULL, calls integer NOT NULL CHECK(calls>=0),
      PRIMARY KEY(user_id,usage_day)
    );`);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(
      'DROP TABLE mistake_explanation_usage; DROP TABLE retrieval_gaps; DROP TABLE mistake_explanations;',
    );
  }
}
