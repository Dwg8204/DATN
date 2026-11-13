import { MigrationInterface, QueryRunner } from "typeorm";
export class AddLearnerErrorChunks1760000027000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`CREATE TABLE learner_error_chunks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      attempt_id uuid NOT NULL REFERENCES test_attempts(id) ON DELETE CASCADE,assessment_revision integer NOT NULL,
      source_kind varchar(30) NOT NULL CHECK(source_kind IN ('OBJECTIVE_MISTAKE','WRITING_CORRECTION','WRITING_WEAKNESS')),
      ordinal smallint NOT NULL DEFAULT 0,component skill_component NOT NULL,part_number smallint,question_key text NOT NULL DEFAULT '',
      criterion varchar(30),topic_codes text[] NOT NULL DEFAULT '{}',content_text text NOT NULL,search_vector tsvector NOT NULL,
      embedding vector(768) NOT NULL,embedding_model varchar(100) NOT NULL,observed_at timestamptz NOT NULL,
      UNIQUE(attempt_id,assessment_revision,source_kind,question_key,ordinal));
      CREATE INDEX learner_error_chunks_user_idx ON learner_error_chunks(user_id,observed_at DESC);
      CREATE TABLE learner_error_jobs(attempt_id uuid PRIMARY KEY REFERENCES test_attempts(id) ON DELETE CASCADE,
        requested_at timestamptz NOT NULL DEFAULT now(),next_retry_at timestamptz NOT NULL DEFAULT now(),
        retry_count integer NOT NULL DEFAULT 0,error_code text,completed_at timestamptz);
      CREATE INDEX learner_error_jobs_pending_idx ON learner_error_jobs(next_retry_at) WHERE completed_at IS NULL;
      CREATE FUNCTION enqueue_learner_errors() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        IF TG_OP='INSERT' OR ROW(NEW.status,NEW.result,NEW.assessment_revision) IS DISTINCT FROM ROW(OLD.status,OLD.result,OLD.assessment_revision) THEN
          INSERT INTO learner_error_jobs(attempt_id) VALUES(NEW.id) ON CONFLICT(attempt_id) DO UPDATE
            SET requested_at=clock_timestamp(),next_retry_at=now(),retry_count=0,error_code=NULL,completed_at=NULL;
          DELETE FROM learner_error_chunks WHERE attempt_id=NEW.id;
        END IF; RETURN NEW;
      END $$;
      CREATE TRIGGER enqueue_learner_errors AFTER INSERT OR UPDATE OF status,result,assessment_revision ON test_attempts
        FOR EACH ROW EXECUTE FUNCTION enqueue_learner_errors();
      INSERT INTO learner_error_jobs(attempt_id) SELECT id FROM test_attempts WHERE status='SUBMITTED'
        AND (result->>'method'='OBJECTIVE' OR component='WRITING');`);
  }
  async down(q: QueryRunner) {
    await q.query(
      "DROP TRIGGER enqueue_learner_errors ON test_attempts; DROP FUNCTION enqueue_learner_errors(); DROP TABLE learner_error_jobs; DROP TABLE learner_error_chunks;",
    );
  }
}
