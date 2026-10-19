import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLearningPersonalization1760000018000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    const [legacy] =
      await runner.query(`SELECT count(*)::int AS invalid FROM learning_goals
      WHERE target_cefr NOT IN ('A1','A2','B1','B2','C')
        OR duration_days NOT BETWEEN 3 AND 180 OR target_test_count NOT BETWEEN 1 AND 500`);
    if (legacy.invalid)
      throw new Error(
        'PERSONALIZATION_LEGACY_GOALS_INVALID: review existing goals before migrating',
      );
    await runner.query(`
      CREATE TYPE insight_kind AS ENUM ('COMMENT','PLAN_START','WEEKLY','MIDTERM','FINAL');
      CREATE TYPE insight_status AS ENUM ('PENDING','READY','FAILED','FALLBACK');
      CREATE TYPE plan_activity_type AS ENUM ('TEST','VOCAB_REVIEW','MISTAKE_REVIEW','TOPIC_REVIEW');
      CREATE TYPE topic_label_status AS ENUM ('SUGGESTED','APPROVED','REJECTED');

      ALTER TABLE learning_goals
        ADD COLUMN replaced_by_goal_id uuid REFERENCES learning_goals(id) ON DELETE SET NULL,
        ADD COLUMN target_reached_at timestamptz,
        ADD COLUMN ended_at timestamptz,
        ADD CONSTRAINT learning_goals_cefr_ck CHECK (target_cefr IN ('A1','A2','B1','B2','C')),
        ADD CONSTRAINT learning_goals_duration_ck CHECK (duration_days BETWEEN 3 AND 180),
        ADD CONSTRAINT learning_goals_count_ck CHECK (target_test_count BETWEEN 1 AND 500),
        ADD CONSTRAINT learning_goals_replacement_ck CHECK (replaced_by_goal_id IS NULL OR replaced_by_goal_id <> id),
        ADD CONSTRAINT learning_goals_id_user_uq UNIQUE (id,user_id),
        ADD CONSTRAINT learning_goals_replacement_owner_fk FOREIGN KEY (replaced_by_goal_id,user_id)
          REFERENCES learning_goals(id,user_id);
      CREATE INDEX learning_goals_active_idx ON learning_goals(start_date) WHERE status='ACTIVE';

      ALTER TABLE notifications ADD COLUMN dedupe_key varchar(120),
        ADD CONSTRAINT notifications_dedupe_key_uq UNIQUE (dedupe_key);
      ALTER TABLE learning_topics ADD COLUMN created_by uuid REFERENCES users(id) ON DELETE SET NULL;
      ALTER TABLE question_topics
        ADD COLUMN status topic_label_status NOT NULL DEFAULT 'APPROVED',
        ADD COLUMN source varchar(10) NOT NULL DEFAULT 'ADMIN' CHECK (source IN ('AI','ADMIN')),
        ADD COLUMN confidence numeric(3,2) CHECK (confidence BETWEEN 0 AND 1),
        ADD COLUMN ai_request_id uuid REFERENCES ai_requests(id) ON DELETE SET NULL,
        ADD COLUMN reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
        ADD COLUMN reviewed_at timestamptz;
      CREATE INDEX question_topics_review_idx ON question_topics(status,created_at) WHERE status='SUGGESTED';

      CREATE TABLE learner_preferences (
        user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        reminder_enabled boolean NOT NULL DEFAULT true,
        reminder_time time NOT NULL DEFAULT '19:00',
        email_reminder_enabled boolean NOT NULL DEFAULT false,
        email_report_enabled boolean NOT NULL DEFAULT true,
        last_reminded_on date,
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE learning_insights (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        goal_id uuid REFERENCES learning_goals(id) ON DELETE CASCADE,
        kind insight_kind NOT NULL, period_key varchar(20) NOT NULL,
        week_index smallint CHECK (week_index > 0),
        covers_from date, covers_to date,
        status insight_status NOT NULL DEFAULT 'PENDING',
        snapshot_version smallint NOT NULL CHECK (snapshot_version > 0),
        input_hash char(64) NOT NULL CHECK (input_hash ~ '^[0-9a-f]{64}$'),
        snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot)='object'), content jsonb,
        ai_request_id uuid REFERENCES ai_requests(id) ON DELETE SET NULL,
        retry_count smallint NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
        next_retry_at timestamptz, deliver_at timestamptz,
        notified_at timestamptz, emailed_at timestamptz, read_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT insights_goal_ck CHECK ((kind='COMMENT') = (goal_id IS NULL)),
        CONSTRAINT insights_period_ck CHECK (
          (covers_from IS NULL AND covers_to IS NULL) OR
          (covers_from IS NOT NULL AND covers_to IS NOT NULL AND covers_to >= covers_from)),
        CONSTRAINT insights_goal_owner_fk FOREIGN KEY (goal_id,user_id) REFERENCES learning_goals(id,user_id) ON DELETE CASCADE,
        CONSTRAINT insights_id_goal_user_uq UNIQUE (id,goal_id,user_id)
      );
      CREATE UNIQUE INDEX insights_goal_period_idx ON learning_insights(goal_id,period_key) WHERE goal_id IS NOT NULL;
      CREATE UNIQUE INDEX insights_comment_day_idx ON learning_insights(user_id,period_key) WHERE kind='COMMENT';
      CREATE INDEX insights_work_idx ON learning_insights(status,next_retry_at) WHERE status IN ('PENDING','FAILED');
      CREATE INDEX insights_delivery_idx ON learning_insights(deliver_at) WHERE notified_at IS NULL AND kind <> 'COMMENT';
      CREATE INDEX insights_user_reports_idx ON learning_insights(user_id,created_at DESC) WHERE kind <> 'COMMENT';

      CREATE TABLE study_plans (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        goal_id uuid NOT NULL REFERENCES learning_goals(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        week_index smallint NOT NULL CHECK (week_index > 0),
        starts_on date NOT NULL, ends_on date NOT NULL CHECK (ends_on >= starts_on),
        source varchar(10) NOT NULL CHECK (source IN ('AI','RULE')),
        insight_id uuid REFERENCES learning_insights(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(goal_id,week_index),
        CONSTRAINT plans_goal_owner_fk FOREIGN KEY (goal_id,user_id) REFERENCES learning_goals(id,user_id) ON DELETE CASCADE,
        CONSTRAINT plans_insight_goal_owner_fk FOREIGN KEY (insight_id,goal_id,user_id) REFERENCES learning_insights(id,goal_id,user_id)
      );
      CREATE TABLE study_plan_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        plan_id uuid NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
        scheduled_on date NOT NULL, sort_order smallint NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
        activity_type plan_activity_type NOT NULL, component skill_component,
        part_number smallint CHECK (part_number BETWEEN 1 AND 4),
        test_id uuid REFERENCES tests(id), topic_id uuid REFERENCES learning_topics(id),
        source_attempt_id uuid REFERENCES test_attempts(id), question_keys text[],
        target_count smallint NOT NULL DEFAULT 1 CHECK (target_count > 0),
        done_count smallint NOT NULL DEFAULT 0 CONSTRAINT plan_item_done_count_ck CHECK (done_count >= 0 AND done_count <= target_count),
        completed_at timestamptz, reason text,
        CONSTRAINT plan_item_shape_ck CHECK (
          (activity_type='TEST' AND component IS NOT NULL AND topic_id IS NULL
            AND source_attempt_id IS NULL AND question_keys IS NULL) OR
          (activity_type='VOCAB_REVIEW' AND component IS NULL AND part_number IS NULL
            AND test_id IS NULL AND topic_id IS NULL AND source_attempt_id IS NULL AND question_keys IS NULL) OR
          (activity_type='MISTAKE_REVIEW' AND source_attempt_id IS NOT NULL
            AND question_keys IS NOT NULL AND cardinality(question_keys) BETWEEN 1 AND 10
            AND array_ndims(question_keys)=1 AND array_position(question_keys,NULL) IS NULL
            AND test_id IS NULL AND topic_id IS NULL) OR
          (activity_type='TOPIC_REVIEW' AND topic_id IS NOT NULL AND source_attempt_id IS NULL AND question_keys IS NULL))
      );
      CREATE INDEX study_plan_items_day_idx ON study_plan_items(plan_id,scheduled_on);
      ALTER TABLE chat_sessions ADD COLUMN context_insight_id uuid REFERENCES learning_insights(id) ON DELETE SET NULL;
      CREATE INDEX attempts_student_submitted_idx ON test_attempts(student_id,submitted_at) WHERE status='SUBMITTED';
      CREATE INDEX vocab_review_item_time_idx ON vocabulary_review_events(notebook_item_id,reviewed_at);
    `);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`
      DROP INDEX vocab_review_item_time_idx;
      DROP INDEX attempts_student_submitted_idx;
      ALTER TABLE chat_sessions DROP COLUMN context_insight_id;
      DROP TABLE study_plan_items;
      DROP TABLE study_plans;
      DROP TABLE learning_insights;
      DROP TABLE learner_preferences;
      DROP INDEX question_topics_review_idx;
      ALTER TABLE question_topics DROP COLUMN status, DROP COLUMN source, DROP COLUMN confidence,
        DROP COLUMN ai_request_id, DROP COLUMN reviewed_by, DROP COLUMN reviewed_at;
      ALTER TABLE learning_topics DROP COLUMN created_by;
      ALTER TABLE notifications DROP COLUMN dedupe_key;
      DROP INDEX learning_goals_active_idx;
      ALTER TABLE learning_goals DROP CONSTRAINT learning_goals_replacement_owner_fk,
        DROP CONSTRAINT learning_goals_id_user_uq, DROP CONSTRAINT learning_goals_replacement_ck,
        DROP CONSTRAINT learning_goals_cefr_ck, DROP CONSTRAINT learning_goals_duration_ck,
        DROP CONSTRAINT learning_goals_count_ck, DROP COLUMN replaced_by_goal_id,
        DROP COLUMN target_reached_at, DROP COLUMN ended_at;
      DROP TYPE topic_label_status;
      DROP TYPE plan_activity_type;
      DROP TYPE insight_status;
      DROP TYPE insight_kind;
    `);
  }
}
