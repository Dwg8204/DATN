import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConnectChatbot1760000014000 implements MigrationInterface {
  name = 'ConnectChatbot1760000014000';
  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      ALTER TABLE chat_sessions ADD COLUMN context_question_key varchar(40);
      ALTER TABLE chat_messages ADD COLUMN feedback smallint CHECK (feedback IN (-1,1)),
        ADD COLUMN error_code varchar(100), ADD COLUMN completed_at timestamptz,
        ADD COLUMN actions jsonb NOT NULL DEFAULT '[]', ADD COLUMN context jsonb NOT NULL DEFAULT '{}';
      UPDATE chat_messages SET status='FAILED',error_code='CHAT_INTERRUPTED',completed_at=now()
        WHERE role='ASSISTANT' AND status='PENDING';
      CREATE UNIQUE INDEX chat_one_pending ON chat_messages(session_id) WHERE role='ASSISTANT' AND status='PENDING';
      ALTER TABLE chat_messages ADD CONSTRAINT chat_message_session_identity UNIQUE(session_id,id);
      ALTER TABLE chat_messages ADD CONSTRAINT chat_reply_same_session FOREIGN KEY(session_id,reply_to_id)
        REFERENCES chat_messages(session_id,id);
      ALTER TABLE chat_sessions ADD CONSTRAINT chat_summary_same_session FOREIGN KEY(id,summary_through_message_id)
        REFERENCES chat_messages(session_id,id);
      ALTER TABLE knowledge_documents ADD COLUMN metadata jsonb NOT NULL DEFAULT '{}';
      ALTER TABLE knowledge_chunks ADD COLUMN token_count integer CHECK(token_count>0),
        ADD COLUMN chunker_version varchar(40);
      ALTER TABLE knowledge_chunks ALTER COLUMN embedding TYPE vector(768) USING embedding::vector(768);
      CREATE INDEX ai_requests_chat_message_idx ON ai_requests(chat_message_id,created_at);
    `);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(`DROP INDEX ai_requests_chat_message_idx;
      ALTER TABLE knowledge_chunks ALTER COLUMN embedding TYPE vector USING embedding::vector;
      ALTER TABLE knowledge_chunks DROP COLUMN token_count,DROP COLUMN chunker_version;
      ALTER TABLE knowledge_documents DROP COLUMN metadata;
      ALTER TABLE chat_sessions DROP CONSTRAINT chat_summary_same_session;
      ALTER TABLE chat_messages DROP CONSTRAINT chat_reply_same_session,DROP CONSTRAINT chat_message_session_identity;
      DROP INDEX chat_one_pending;
      ALTER TABLE chat_messages DROP COLUMN feedback,DROP COLUMN error_code,DROP COLUMN completed_at,DROP COLUMN actions,DROP COLUMN context;
      ALTER TABLE chat_sessions DROP COLUMN context_question_key;`);
  }
}
