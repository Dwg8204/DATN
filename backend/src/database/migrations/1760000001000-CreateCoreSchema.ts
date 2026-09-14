import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCoreSchema1760000001000 implements MigrationInterface {
  name = 'CreateCoreSchema1760000001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE roles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code varchar(20) NOT NULL UNIQUE,
        name varchar(50) NOT NULL, description text, created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email citext NOT NULL UNIQUE, password_hash text NOT NULL,
        first_name varchar(100) NOT NULL, last_name varchar(100) NOT NULL, role_id uuid NOT NULL REFERENCES roles(id),
        status account_status NOT NULL DEFAULT 'INACTIVE', avatar jsonb, phone varchar(30), bio text,
        timezone varchar(64) NOT NULL DEFAULT 'Asia/Bangkok', email_verified_at timestamptz,
        email_verification_token_hash text, email_verification_expires_at timestamptz,
        email_verification_sent_at timestamptz, email_verification_attempts smallint NOT NULL DEFAULT 0 CHECK (email_verification_attempts >= 0),
        password_changed_at timestamptz, last_login_at timestamptz, deleted_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX users_role_created_idx ON users(role_id, created_at DESC);
      CREATE TABLE refresh_tokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash text NOT NULL UNIQUE, family_id uuid NOT NULL, expires_at timestamptz NOT NULL,
        revoked_at timestamptz, replaced_by_id uuid REFERENCES refresh_tokens(id), last_used_at timestamptz,
        user_agent text, ip_address inet, created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX refresh_tokens_user_idx ON refresh_tokens(user_id);
      CREATE INDEX refresh_tokens_family_idx ON refresh_tokens(family_id);
      CREATE TABLE password_reset_tokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        challenge_hash text NOT NULL, expires_at timestamptz NOT NULL, failed_attempts smallint NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
        verified_at timestamptz, reset_grant_hash text, reset_grant_expires_at timestamptz,
        used_at timestamptz, revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX password_reset_user_created_idx ON password_reset_tokens(user_id, created_at DESC);

      CREATE TABLE tests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_by uuid NOT NULL REFERENCES users(id),
        updated_by uuid REFERENCES users(id), title varchar(255) NOT NULL, component skill_component NOT NULL,
        scope test_scope NOT NULL, part_number smallint, cover jsonb, part_contents jsonb NOT NULL DEFAULT '{"parts":[]}'::jsonb,
        version integer NOT NULL DEFAULT 1 CHECK (version > 0), published_snapshot_id uuid,
        status publication_status NOT NULL DEFAULT 'DRAFT', published_at timestamptz, archived_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT tests_scope_part_ck CHECK ((scope='PART' AND part_number IS NOT NULL AND part_number > 0) OR (scope='FULL_SKILL' AND part_number IS NULL))
      );
      CREATE INDEX tests_listing_idx ON tests(component, status, scope, part_number, created_at DESC);
      CREATE TABLE questions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), test_id uuid NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
        part_number smallint NOT NULL CHECK (part_number > 0), group_key uuid, position smallint NOT NULL CHECK (position > 0),
        question_type varchar(40) NOT NULL, content jsonb NOT NULL, correct_answer jsonb,
        sample_answer jsonb, explanation jsonb, deleted_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX questions_test_part_idx ON questions(test_id, part_number, group_key, position) WHERE deleted_at IS NULL;
      CREATE TABLE learning_topics (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code varchar(100) NOT NULL UNIQUE, name varchar(150) NOT NULL,
        description text, component skill_component, topic_type learning_topic_type NOT NULL,
        parent_id uuid REFERENCES learning_topics(id), is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT learning_topics_not_self_ck CHECK (parent_id IS NULL OR parent_id <> id)
      );
      CREATE TABLE question_topics (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        topic_id uuid NOT NULL REFERENCES learning_topics(id), weight numeric(5,4) NOT NULL CHECK (weight > 0 AND weight <= 1),
        created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(question_id, topic_id)
      );
      CREATE TABLE test_snapshots (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), test_id uuid NOT NULL REFERENCES tests(id), version integer NOT NULL CHECK (version > 0),
        schema_version smallint NOT NULL CHECK (schema_version > 0), snapshot jsonb NOT NULL,
        content_hash varchar(64) NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(test_id, version),
        UNIQUE(id, test_id)
      );
      ALTER TABLE tests ADD CONSTRAINT tests_published_snapshot_fk FOREIGN KEY (published_snapshot_id, id) REFERENCES test_snapshots(id, test_id);

      CREATE TABLE test_attempts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), student_id uuid NOT NULL REFERENCES users(id),
        snapshot_id uuid NOT NULL REFERENCES test_snapshots(id), component skill_component NOT NULL,
        scope test_scope NOT NULL, part_number smallint, status attempt_status NOT NULL DEFAULT 'IN_PROGRESS',
        grading_status grading_status NOT NULL DEFAULT 'NOT_STARTED', assessment_revision integer NOT NULL DEFAULT 0 CHECK (assessment_revision >= 0),
        result jsonb, score numeric(8,3), max_score numeric(8,3), estimated_cefr varchar(10), result_source result_source,
        started_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz, submitted_at timestamptz,
        completed_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT attempts_scope_part_ck CHECK ((scope='PART' AND part_number IS NOT NULL AND part_number > 0) OR (scope='FULL_SKILL' AND part_number IS NULL)),
        CONSTRAINT attempts_score_ck CHECK (score IS NULL OR (max_score > 0 AND score >= 0 AND score <= max_score)),
        CONSTRAINT attempts_time_ck CHECK (expires_at IS NULL OR expires_at > started_at),
        CONSTRAINT attempts_submit_time_ck CHECK (submitted_at IS NULL OR submitted_at >= started_at)
      );
      CREATE INDEX attempts_student_started_idx ON test_attempts(student_id, started_at DESC);
      CREATE INDEX attempts_student_component_idx ON test_attempts(student_id, component, completed_at DESC);
      CREATE INDEX attempts_grading_idx ON test_attempts(grading_status, submitted_at) WHERE grading_status IN ('QUEUED','PROCESSING','PARTIAL_FAILED');
      CREATE TABLE attempt_progress (
        attempt_id uuid PRIMARY KEY REFERENCES test_attempts(id) ON DELETE CASCADE, answers jsonb NOT NULL DEFAULT '{}'::jsonb,
        progress jsonb NOT NULL DEFAULT '{}'::jsonb, revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
        saved_at timestamptz NOT NULL DEFAULT now(), sealed_at timestamptz
      );
      CREATE TABLE speech_analyses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), attempt_id uuid NOT NULL REFERENCES test_attempts(id),
        question_id uuid NOT NULL REFERENCES questions(id), audio_storage_key text NOT NULL, revision integer NOT NULL CHECK (revision >= 0),
        provider varchar(50) NOT NULL, service_version varchar(100), locale varchar(20) NOT NULL,
        config_version varchar(50) NOT NULL, status speech_analysis_status NOT NULL DEFAULT 'QUEUED', transcript_raw text,
        segments jsonb, metrics jsonb, quality_flags jsonb, error_code varchar(100), completed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(attempt_id, question_id, revision)
      );
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS speech_analyses CASCADE;
      DROP TABLE IF EXISTS attempt_progress CASCADE;
      DROP TABLE IF EXISTS test_attempts CASCADE;
      ALTER TABLE tests DROP CONSTRAINT IF EXISTS tests_published_snapshot_fk;
      DROP TABLE IF EXISTS test_snapshots CASCADE;
      DROP TABLE IF EXISTS question_topics CASCADE;
      DROP TABLE IF EXISTS learning_topics CASCADE;
      DROP TABLE IF EXISTS questions CASCADE;
      DROP TABLE IF EXISTS tests CASCADE;
      DROP TABLE IF EXISTS password_reset_tokens CASCADE;
      DROP TABLE IF EXISTS refresh_tokens CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TABLE IF EXISTS roles CASCADE;
    `);
  }
}
