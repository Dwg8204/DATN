import { MigrationInterface, QueryRunner } from 'typeorm';
export class AddRagRetrievalStores1760000024000 implements MigrationInterface {
  name = 'AddRagRetrievalStores1760000024000';
  async up(q: QueryRunner) {
    await q.query(`
 CREATE TABLE question_embeddings (
 question_id uuid PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
 question_hash text NOT NULL,test_id uuid NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
 component skill_component NOT NULL,part_number smallint,question_key text NOT NULL,
 content_text text NOT NULL CHECK(length(content_text) BETWEEN 1 AND 2000),search_vector tsvector NOT NULL,
 embedding vector(768) NOT NULL,embedding_model varchar(100) NOT NULL,embedding_version varchar(50) NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now());
 CREATE INDEX question_embeddings_scope_idx ON question_embeddings(component,part_number);
 CREATE INDEX question_embeddings_test_idx ON question_embeddings(test_id);
 CREATE INDEX question_embeddings_search_idx ON question_embeddings USING gin(search_vector);
 CREATE TABLE question_embedding_jobs (
 test_id uuid PRIMARY KEY REFERENCES tests(id) ON DELETE CASCADE,
 requested_at timestamptz NOT NULL DEFAULT now(),next_retry_at timestamptz NOT NULL DEFAULT now(),
 retry_count integer NOT NULL DEFAULT 0 CHECK(retry_count>=0),error_code text,completed_at timestamptz);
 CREATE INDEX question_embedding_jobs_pending_idx ON question_embedding_jobs(next_retry_at) WHERE completed_at IS NULL;
 ALTER TABLE knowledge_documents ADD COLUMN topic_codes text[] NOT NULL DEFAULT '{}',
 ADD COLUMN criterion varchar(30),ADD COLUMN usage varchar(20) NOT NULL DEFAULT 'GENERAL'
 CHECK(usage IN ('GENERAL','LESSON','PART_STRATEGY','CRITERION_GUIDE'));
 CREATE INDEX knowledge_documents_topic_codes_idx ON knowledge_documents USING gin(topic_codes);
 UPDATE knowledge_documents SET
 topic_codes=ARRAY(SELECT jsonb_array_elements_text(CASE WHEN jsonb_typeof(metadata->'topicCodes')='array' THEN metadata->'topicCodes' ELSE '[]'::jsonb END)),
 criterion=metadata->>'criterion',
 usage=CASE WHEN metadata->>'usage' IN ('GENERAL','LESSON','PART_STRATEGY','CRITERION_GUIDE') THEN metadata->>'usage' ELSE 'GENERAL' END;
 CREATE FUNCTION enqueue_question_embedding() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='UPDATE' AND NEW.published_snapshot_id IS NOT DISTINCT FROM OLD.published_snapshot_id THEN RETURN NEW; END IF;
 IF NEW.published_snapshot_id IS NOT NULL THEN
 INSERT INTO question_embedding_jobs(test_id) VALUES(NEW.id)
 ON CONFLICT(test_id) DO UPDATE SET requested_at=clock_timestamp(),next_retry_at=now(),retry_count=0,error_code=NULL,completed_at=NULL;
 END IF; RETURN NEW; END $$;
 CREATE TRIGGER enqueue_question_embedding AFTER INSERT OR UPDATE OF published_snapshot_id ON tests
 FOR EACH ROW EXECUTE FUNCTION enqueue_question_embedding();
 `);
  }
  async down(q: QueryRunner) {
    await q.query(`DROP TRIGGER enqueue_question_embedding ON tests; DROP FUNCTION enqueue_question_embedding();
 DROP TABLE question_embedding_jobs; DROP TABLE question_embeddings; DROP INDEX knowledge_documents_topic_codes_idx;
 ALTER TABLE knowledge_documents DROP COLUMN topic_codes,DROP COLUMN criterion,DROP COLUMN usage;`);
  }
}
