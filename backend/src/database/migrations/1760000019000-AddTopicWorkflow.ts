import { MigrationInterface, QueryRunner } from 'typeorm';
import { seedTopics } from '../../features/topics/topic-seeds';

export class AddTopicWorkflow1760000019000 implements MigrationInterface {
  name = 'AddTopicWorkflow1760000019000';
  async up(q: QueryRunner) {
    await q.query(`
      ALTER TABLE question_topics ADD COLUMN question_hash text;
      CREATE TABLE topic_tagging_jobs (
        test_id uuid PRIMARY KEY REFERENCES tests(id) ON DELETE CASCADE,
        requested_by uuid REFERENCES users(id), requested_at timestamptz NOT NULL DEFAULT now(),
        manual_requested_at timestamptz, next_retry_at timestamptz NOT NULL DEFAULT now(),
        retry_count integer NOT NULL DEFAULT 0, error_code text, completed_at timestamptz
      );
      CREATE TABLE topic_evidence_jobs (
        attempt_id uuid PRIMARY KEY REFERENCES test_attempts(id) ON DELETE CASCADE,
        requested_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE VIEW topic_question_catalog AS
      WITH rows AS (
        SELECT q.*,t.component,t.title,t.status test_status,t.archived_at,t.part_contents,
          min(q.position) OVER(PARTITION BY q.test_id,q.part_number,q.content->>'textId') text_order
        FROM questions q JOIN tests t ON t.id=q.test_id WHERE q.deleted_at IS NULL
      ) SELECT rows.*,
        md5(jsonb_build_array(content,correct_answer,sample_answer,part_number,position,question_type,part_contents)::text) question_hash,
        'p'||part_number||':'||CASE WHEN component='LISTENING' AND part_number IN (2,3) THEN 's' ELSE 'q' END||
          CASE WHEN question_type='READING_ORDER' THEN
            (row_number() OVER(PARTITION BY test_id,part_number ORDER BY text_order,(correct_answer->>'position')::integer,position))::text
          ELSE position::text END question_key
      FROM rows;
      UPDATE question_topics l SET question_hash=q.question_hash FROM topic_question_catalog q WHERE q.id=l.question_id;
      CREATE TABLE topic_snapshot_questions (
        snapshot_id uuid REFERENCES test_snapshots(id) ON DELETE CASCADE,
        question_id uuid REFERENCES questions(id) ON DELETE CASCADE,
        question_key text NOT NULL, question_hash text NOT NULL,
        PRIMARY KEY(snapshot_id,question_id)
      );
      CREATE FUNCTION capture_topic_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        INSERT INTO topic_snapshot_questions SELECT NEW.id,id,question_key,question_hash
          FROM topic_question_catalog WHERE test_id=NEW.test_id;
        RETURN NEW;
      END $$;
      CREATE TRIGGER capture_topic_snapshot AFTER INSERT ON test_snapshots FOR EACH ROW EXECUTE FUNCTION capture_topic_snapshot();
      -- Backfill only snapshots whose questions and surrounding text have not changed.
      INSERT INTO topic_snapshot_questions
        SELECT s.id,q.id,q.question_key,q.question_hash FROM test_snapshots s
        JOIN topic_question_catalog q ON q.test_id=s.test_id JOIN tests t ON t.id=s.test_id
        WHERE q.updated_at<=s.created_at AND t.updated_at<=s.created_at;
      CREATE FUNCTION enqueue_topic_test() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE target uuid;
      BEGIN
        IF TG_TABLE_NAME='questions' THEN
          target=NEW.test_id;
          IF TG_OP='UPDATE' AND ROW(NEW.content,NEW.correct_answer,NEW.sample_answer,NEW.deleted_at,NEW.part_number,NEW.position)
            IS NOT DISTINCT FROM ROW(OLD.content,OLD.correct_answer,OLD.sample_answer,OLD.deleted_at,OLD.part_number,OLD.position) THEN RETURN NEW; END IF;
          DELETE FROM question_topics WHERE question_id=NEW.id AND source='AI' AND status='SUGGESTED';
        ELSE
          target=NEW.id;
          IF TG_OP='UPDATE' AND ROW(NEW.part_contents,NEW.status) IS NOT DISTINCT FROM ROW(OLD.part_contents,OLD.status) THEN RETURN NEW; END IF;
          DELETE FROM question_topics l USING questions q WHERE q.id=l.question_id AND q.test_id=target AND l.source='AI' AND l.status='SUGGESTED';
        END IF;
        INSERT INTO topic_tagging_jobs(test_id,requested_by)
          SELECT id,COALESCE(updated_by,created_by) FROM tests WHERE id=target
        ON CONFLICT(test_id) DO UPDATE SET requested_by=EXCLUDED.requested_by,requested_at=clock_timestamp(),next_retry_at=now(),retry_count=0,error_code=NULL,completed_at=NULL;
        RETURN NEW;
      END $$;
      CREATE TRIGGER enqueue_topic_question AFTER INSERT OR UPDATE ON questions FOR EACH ROW EXECUTE FUNCTION enqueue_topic_test();
      CREATE TRIGGER enqueue_topic_test AFTER INSERT OR UPDATE ON tests FOR EACH ROW EXECUTE FUNCTION enqueue_topic_test();
      CREATE FUNCTION enqueue_topic_evidence() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
        IF NEW.status='SUBMITTED' AND (TG_OP='INSERT' OR ROW(NEW.result,NEW.assessment_revision,NEW.status) IS DISTINCT FROM ROW(OLD.result,OLD.assessment_revision,OLD.status)) THEN
          INSERT INTO topic_evidence_jobs(attempt_id) VALUES(NEW.id) ON CONFLICT(attempt_id) DO UPDATE SET requested_at=clock_timestamp();
        END IF;
        RETURN NEW;
      END $$;
      CREATE TRIGGER enqueue_topic_evidence AFTER INSERT OR UPDATE ON test_attempts FOR EACH ROW EXECUTE FUNCTION enqueue_topic_evidence();
      CREATE INDEX topic_snapshot_question_idx ON topic_snapshot_questions(question_id);
    `);
    await seedTopics(q.manager);
  }
  async down(q: QueryRunner) {
    await q.query(`DROP TRIGGER enqueue_topic_evidence ON test_attempts; DROP FUNCTION enqueue_topic_evidence();
      DROP TRIGGER enqueue_topic_test ON tests; DROP TRIGGER enqueue_topic_question ON questions; DROP FUNCTION enqueue_topic_test();
      DROP TRIGGER capture_topic_snapshot ON test_snapshots; DROP FUNCTION capture_topic_snapshot();
      DROP TABLE topic_snapshot_questions; DROP VIEW topic_question_catalog;
      DROP TABLE topic_evidence_jobs; DROP TABLE topic_tagging_jobs; ALTER TABLE question_topics DROP COLUMN question_hash;`);
  }
}
