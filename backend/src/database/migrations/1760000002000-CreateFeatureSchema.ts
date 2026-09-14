import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFeatureSchema1760000002000 implements MigrationInterface {
  name = 'CreateFeatureSchema1760000002000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE chat_sessions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title varchar(200) NOT NULL, context_attempt_id uuid REFERENCES test_attempts(id), context_question_id uuid REFERENCES questions(id),
        summary text, summary_through_message_id uuid, archived_at timestamptz, deleted_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX chat_sessions_user_updated_idx ON chat_sessions(user_id, updated_at DESC) WHERE deleted_at IS NULL;
      CREATE TABLE chat_messages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
        sequence_no bigint NOT NULL CHECK (sequence_no > 0), role chat_role NOT NULL, content text NOT NULL,
        status chat_message_status NOT NULL DEFAULT 'PENDING', reply_to_id uuid REFERENCES chat_messages(id),
        client_message_id uuid, citations jsonb, created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(session_id, sequence_no), UNIQUE(session_id, client_message_id)
      );
      ALTER TABLE chat_sessions ADD CONSTRAINT chat_sessions_summary_message_fk FOREIGN KEY (summary_through_message_id) REFERENCES chat_messages(id);

      CREATE TABLE knowledge_documents (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), document_key varchar(150) NOT NULL, version_no integer NOT NULL CHECK (version_no > 0),
        title varchar(255) NOT NULL, source_uri text, file jsonb, document_type varchar(30) NOT NULL,
        component skill_component, part_number smallint, language_code varchar(10) NOT NULL,
        access_scope knowledge_access_scope NOT NULL, status knowledge_document_status NOT NULL DEFAULT 'DRAFT',
        content_hash varchar(64) NOT NULL, rights_note text, created_by uuid NOT NULL REFERENCES users(id),
        created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(document_key, version_no)
      );
      CREATE INDEX knowledge_documents_search_idx ON knowledge_documents(status, access_scope, component);
      CREATE TABLE knowledge_chunks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), document_id uuid NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
        chunk_index integer NOT NULL CHECK (chunk_index >= 0), content text NOT NULL, location jsonb NOT NULL DEFAULT '{}'::jsonb,
        content_hash varchar(64) NOT NULL, embedding vector, embedding_model varchar(100), embedding_version varchar(50),
        search_vector tsvector NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(document_id, chunk_index)
      );
      CREATE INDEX knowledge_chunks_search_vector_idx ON knowledge_chunks USING gin(search_vector);

      CREATE TABLE learning_goals (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_cefr varchar(10) NOT NULL, target_test_count integer NOT NULL CHECK (target_test_count > 0),
        duration_days integer NOT NULL CHECK (duration_days > 0), start_date date NOT NULL, timezone varchar(64) NOT NULL,
        status learning_goal_status NOT NULL DEFAULT 'ACTIVE', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX learning_goals_one_active_idx ON learning_goals(user_id) WHERE status='ACTIVE';
      CREATE TABLE learning_evidence (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        topic_id uuid NOT NULL REFERENCES learning_topics(id), attempt_id uuid NOT NULL REFERENCES test_attempts(id),
        assessment_revision integer NOT NULL CHECK (assessment_revision >= 0), evidence_scope evidence_scope NOT NULL,
        question_id uuid REFERENCES questions(id), part_number smallint, outcome evidence_outcome NOT NULL,
        topic_weight numeric(5,4) NOT NULL CHECK (topic_weight > 0 AND topic_weight <= 1),
        opportunities_count integer CHECK (opportunities_count >= 0), error_count integer CHECK (error_count >= 0),
        score numeric(8,3), max_score numeric(8,3), evidence_quality varchar(20) NOT NULL,
        evidence_refs jsonb NOT NULL DEFAULT '{}'::jsonb, observed_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT evidence_scope_ck CHECK ((evidence_scope='QUESTION' AND question_id IS NOT NULL) OR (evidence_scope='PART' AND part_number IS NOT NULL) OR evidence_scope='ATTEMPT')
      );
      CREATE INDEX learning_evidence_user_topic_idx ON learning_evidence(user_id, topic_id, observed_at DESC);
      CREATE INDEX learning_evidence_attempt_idx ON learning_evidence(attempt_id, assessment_revision);
      CREATE TABLE learner_topic_states (
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, topic_id uuid NOT NULL REFERENCES learning_topics(id),
        summary jsonb NOT NULL, evidence_count integer NOT NULL CHECK (evidence_count >= 0),
        distinct_test_count integer NOT NULL CHECK (distinct_test_count >= 0), last_practiced_at timestamptz,
        computed_at timestamptz NOT NULL, algorithm_version varchar(50) NOT NULL, PRIMARY KEY(user_id, topic_id)
      );

      CREATE TABLE vocabulary_folders (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid REFERENCES users(id) ON DELETE CASCADE,
        name varchar(40) NOT NULL, description text, archived_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX vocabulary_folders_owner_name_idx ON vocabulary_folders(owner_id, lower(name)) WHERE owner_id IS NOT NULL AND archived_at IS NULL;
      CREATE UNIQUE INDEX vocabulary_folders_system_name_idx ON vocabulary_folders(lower(name)) WHERE owner_id IS NULL AND archived_at IS NULL;
      CREATE TABLE vocabulary_entries (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid REFERENCES users(id) ON DELETE CASCADE,
        default_folder_id uuid REFERENCES vocabulary_folders(id), item_type vocabulary_item_type NOT NULL,
        term text NOT NULL, normalized_term text NOT NULL, language_code varchar(10) NOT NULL,
        context_sentence text, meaning_language varchar(10) NOT NULL, phonetic text, part_of_speech varchar(50),
        meaning text NOT NULL, default_examples jsonb, audio jsonb, details jsonb,
        source_type vocabulary_source_type NOT NULL, generation_version varchar(50), cache_key varchar(64) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX vocabulary_entries_lookup_idx ON vocabulary_entries(normalized_term, language_code, meaning_language);
      CREATE TABLE user_notebook_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        folder_id uuid NOT NULL REFERENCES vocabulary_folders(id), item_type notebook_item_type NOT NULL,
        vocabulary_entry_id uuid REFERENCES vocabulary_entries(id), custom_content jsonb, user_example text, user_notes text,
        audio jsonb, source_snapshot_id uuid REFERENCES test_snapshots(id), source_chat_message_id uuid REFERENCES chat_messages(id),
        is_saved boolean NOT NULL DEFAULT true, last_rating vocabulary_rating, last_reviewed_at timestamptz,
        review_count integer NOT NULL DEFAULT 0 CHECK (review_count >= 0), saved_at timestamptz,
        archived_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT notebook_content_source_ck CHECK ((vocabulary_entry_id IS NOT NULL) <> (custom_content IS NOT NULL))
      );
      CREATE UNIQUE INDEX notebook_user_entry_idx ON user_notebook_items(user_id, vocabulary_entry_id) WHERE vocabulary_entry_id IS NOT NULL AND archived_at IS NULL;
      CREATE INDEX notebook_user_folder_idx ON user_notebook_items(user_id, folder_id, created_at DESC);
      CREATE TABLE vocabulary_review_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), notebook_item_id uuid NOT NULL REFERENCES user_notebook_items(id) ON DELETE CASCADE,
        client_event_id uuid NOT NULL, rating vocabulary_rating NOT NULL, reviewed_at timestamptz NOT NULL,
        duration_ms integer CHECK (duration_ms >= 0), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(notebook_item_id, client_event_id)
      );

      CREATE TABLE ai_requests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES users(id), purpose varchar(40) NOT NULL,
        provider varchar(50) NOT NULL, model varchar(100) NOT NULL, attempt_id uuid REFERENCES test_attempts(id),
        speech_analysis_id uuid REFERENCES speech_analyses(id), chat_message_id uuid REFERENCES chat_messages(id),
        vocabulary_entry_id uuid REFERENCES vocabulary_entries(id), parent_request_id uuid REFERENCES ai_requests(id),
        idempotency_key uuid NOT NULL UNIQUE, provider_request_id text, request_fingerprint varchar(64) NOT NULL,
        config_snapshot jsonb NOT NULL, status ai_request_status NOT NULL DEFAULT 'RESERVED',
        input_tokens bigint CHECK (input_tokens >= 0), cached_input_tokens bigint CHECK (cached_input_tokens >= 0),
        output_tokens bigint CHECK (output_tokens >= 0), reasoning_tokens bigint CHECK (reasoning_tokens >= 0),
        audio_seconds numeric(12,3) CHECK (audio_seconds >= 0), pricing_snapshot jsonb NOT NULL,
        actual_cost numeric(18,8) CHECK (actual_cost >= 0), currency char(3) NOT NULL,
        started_at timestamptz, completed_at timestamptz, error_code varchar(100), created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX ai_requests_status_created_idx ON ai_requests(status, created_at);
      CREATE TABLE ai_budget_windows (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), scope budget_scope NOT NULL, user_id uuid REFERENCES users(id),
        feature varchar(40), period_start timestamptz NOT NULL, period_end timestamptz NOT NULL,
        limit_amount numeric(18,8) NOT NULL CHECK (limit_amount >= 0), reserved_amount numeric(18,8) NOT NULL DEFAULT 0 CHECK (reserved_amount >= 0),
        spent_amount numeric(18,8) NOT NULL DEFAULT 0 CHECK (spent_amount >= 0), currency char(3) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT budget_period_ck CHECK (period_end > period_start),
        CONSTRAINT budget_scope_ck CHECK ((scope='GLOBAL' AND user_id IS NULL AND feature IS NULL) OR (scope='USER' AND user_id IS NOT NULL AND feature IS NULL) OR (scope='FEATURE' AND user_id IS NULL AND feature IS NOT NULL))
      );
      CREATE INDEX ai_budget_windows_scope_period_idx ON ai_budget_windows(scope, period_start, period_end);
      CREATE TABLE ai_budget_reservations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ai_request_id uuid NOT NULL REFERENCES ai_requests(id),
        budget_window_id uuid NOT NULL REFERENCES ai_budget_windows(id), reserved_amount numeric(18,8) NOT NULL CHECK (reserved_amount >= 0),
        settled_amount numeric(18,8) CHECK (settled_amount >= 0), status budget_reservation_status NOT NULL DEFAULT 'HELD',
        settled_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(ai_request_id, budget_window_id)
      );

      CREATE TABLE notifications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_by uuid REFERENCES users(id), title varchar(255) NOT NULL,
        content text NOT NULL, type notification_type NOT NULL, channel notification_channel NOT NULL,
        audience_type notification_audience_type NOT NULL, audience_role_id uuid REFERENCES roles(id), attachment jsonb,
        action_path text, scheduled_at timestamptz, status notification_status NOT NULL DEFAULT 'DRAFT', sent_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT notification_audience_ck CHECK ((audience_type='ROLE' AND audience_role_id IS NOT NULL) OR (audience_type<>'ROLE' AND audience_role_id IS NULL))
      );
      CREATE INDEX notifications_schedule_idx ON notifications(status, scheduled_at);
      CREATE TABLE notification_recipients (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), notification_id uuid NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, delivery_status notification_delivery_status NOT NULL DEFAULT 'PENDING',
        delivered_at timestamptz, read_at timestamptz, dismissed_at timestamptz, error_code varchar(100),
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(notification_id, user_id)
      );
      CREATE INDEX notification_recipients_user_idx ON notification_recipients(user_id, created_at DESC);
      CREATE TABLE discussion_posts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id), component skill_component NOT NULL,
        parent_id uuid REFERENCES discussion_posts(id), content text NOT NULL, status discussion_status NOT NULL DEFAULT 'VISIBLE',
        deleted_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT discussion_not_self_ck CHECK (parent_id IS NULL OR parent_id <> id)
      );
      CREATE INDEX discussion_posts_component_idx ON discussion_posts(component, status, created_at DESC);
      CREATE TABLE discussion_likes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), post_id uuid NOT NULL REFERENCES discussion_posts(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(post_id, user_id)
      );

      CREATE TABLE dictation_exercises (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_by uuid NOT NULL REFERENCES users(id),
        folder_id uuid NOT NULL REFERENCES vocabulary_folders(id), title varchar(255) NOT NULL, transcript text NOT NULL,
        audio jsonb, audio_source dictation_audio_source NOT NULL, locale varchar(20) NOT NULL, practice_level varchar(20),
        content_version integer NOT NULL DEFAULT 1 CHECK (content_version > 0), status publication_status NOT NULL DEFAULT 'DRAFT',
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX dictation_exercises_listing_idx ON dictation_exercises(folder_id, status, created_at DESC);
      CREATE TABLE dictation_attempts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id),
        exercise_id uuid NOT NULL REFERENCES dictation_exercises(id), exercise_snapshot jsonb NOT NULL, typed_text text NOT NULL,
        correct_words integer NOT NULL CHECK (correct_words >= 0), total_words integer NOT NULL CHECK (total_words > 0),
        accuracy numeric(5,2) NOT NULL CHECK (accuracy >= 0 AND accuracy <= 100), hint_used boolean NOT NULL DEFAULT false,
        playback_rate numeric(4,2) NOT NULL CHECK (playback_rate > 0), playback_count integer NOT NULL CHECK (playback_count >= 0),
        grading_version varchar(50) NOT NULL, submitted_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT dictation_words_ck CHECK (correct_words <= total_words)
      );
      CREATE INDEX dictation_attempts_user_idx ON dictation_attempts(user_id, submitted_at DESC);
      CREATE TABLE audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid REFERENCES users(id), action varchar(100) NOT NULL,
        entity_type varchar(50) NOT NULL, entity_id uuid, changes jsonb, request_id uuid, ip_address inet,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX audit_logs_actor_idx ON audit_logs(actor_id, created_at DESC);
      CREATE INDEX audit_logs_entity_idx ON audit_logs(entity_type, entity_id, created_at DESC);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS audit_logs CASCADE; DROP TABLE IF EXISTS dictation_attempts CASCADE;
      DROP TABLE IF EXISTS dictation_exercises CASCADE; DROP TABLE IF EXISTS discussion_likes CASCADE;
      DROP TABLE IF EXISTS discussion_posts CASCADE; DROP TABLE IF EXISTS notification_recipients CASCADE;
      DROP TABLE IF EXISTS notifications CASCADE; DROP TABLE IF EXISTS ai_budget_reservations CASCADE;
      DROP TABLE IF EXISTS ai_budget_windows CASCADE; DROP TABLE IF EXISTS ai_requests CASCADE;
      DROP TABLE IF EXISTS vocabulary_review_events CASCADE; DROP TABLE IF EXISTS user_notebook_items CASCADE;
      DROP TABLE IF EXISTS vocabulary_entries CASCADE; DROP TABLE IF EXISTS vocabulary_folders CASCADE;
      DROP TABLE IF EXISTS learner_topic_states CASCADE; DROP TABLE IF EXISTS learning_evidence CASCADE;
      DROP TABLE IF EXISTS learning_goals CASCADE; DROP TABLE IF EXISTS knowledge_chunks CASCADE;
      DROP TABLE IF EXISTS knowledge_documents CASCADE; ALTER TABLE chat_sessions DROP CONSTRAINT IF EXISTS chat_sessions_summary_message_fk;
      DROP TABLE IF EXISTS chat_messages CASCADE; DROP TABLE IF EXISTS chat_sessions CASCADE;
    `);
  }
}
