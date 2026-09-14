import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnableExtensionsAndEnums1760000000000 implements MigrationInterface {
  name = 'EnableExtensionsAndEnums1760000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS citext`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);
    await queryRunner.query(`CREATE TYPE account_status AS ENUM ('INACTIVE','ACTIVE','BANNED')`);
    await queryRunner.query(`CREATE TYPE skill_component AS ENUM ('GRAMMAR_VOCAB','READING','LISTENING','WRITING','SPEAKING')`);
    await queryRunner.query(`CREATE TYPE test_scope AS ENUM ('FULL_SKILL','PART')`);
    await queryRunner.query(`CREATE TYPE publication_status AS ENUM ('DRAFT','PUBLISHED','ARCHIVED')`);
    await queryRunner.query(`CREATE TYPE learning_topic_type AS ENUM ('KNOWLEDGE','STRATEGY','CRITERION')`);
    await queryRunner.query(`CREATE TYPE attempt_status AS ENUM ('IN_PROGRESS','SUBMITTED','ABANDONED')`);
    await queryRunner.query(`CREATE TYPE grading_status AS ENUM ('NOT_STARTED','QUEUED','PROCESSING','COMPLETED','PARTIAL_FAILED','FAILED')`);
    await queryRunner.query(`CREATE TYPE result_source AS ENUM ('AUTOMATIC','TEACHER')`);
    await queryRunner.query(`CREATE TYPE speech_analysis_status AS ENUM ('QUEUED','PROCESSING','COMPLETED','FAILED')`);
    await queryRunner.query(`CREATE TYPE chat_role AS ENUM ('USER','ASSISTANT')`);
    await queryRunner.query(`CREATE TYPE chat_message_status AS ENUM ('PENDING','COMPLETED','FAILED')`);
    await queryRunner.query(`CREATE TYPE knowledge_access_scope AS ENUM ('LEARNER','STAFF')`);
    await queryRunner.query(`CREATE TYPE knowledge_document_status AS ENUM ('DRAFT','PROCESSING','READY','RETIRED','FAILED')`);
    await queryRunner.query(`CREATE TYPE ai_request_status AS ENUM ('RESERVED','RUNNING','COMPLETED','FAILED','COST_UNKNOWN')`);
    await queryRunner.query(`CREATE TYPE budget_scope AS ENUM ('GLOBAL','USER','FEATURE')`);
    await queryRunner.query(`CREATE TYPE budget_reservation_status AS ENUM ('HELD','SETTLED','RELEASED','UNRESOLVED')`);
    await queryRunner.query(`CREATE TYPE learning_goal_status AS ENUM ('ACTIVE','COMPLETED','EXPIRED','CANCELLED')`);
    await queryRunner.query(`CREATE TYPE evidence_scope AS ENUM ('QUESTION','PART','ATTEMPT')`);
    await queryRunner.query(`CREATE TYPE evidence_outcome AS ENUM ('CORRECT','INCORRECT','PARTIAL','SKIPPED','OBSERVED')`);
    await queryRunner.query(`CREATE TYPE vocabulary_item_type AS ENUM ('WORD','PHRASE')`);
    await queryRunner.query(`CREATE TYPE notebook_item_type AS ENUM ('WORD','PHRASE','SENTENCE')`);
    await queryRunner.query(`CREATE TYPE vocabulary_source_type AS ENUM ('SYSTEM','DICTIONARY','AI','TEACHER')`);
    await queryRunner.query(`CREATE TYPE vocabulary_rating AS ENUM ('LEARNING','KNOWN')`);
    await queryRunner.query(`CREATE TYPE notification_type AS ENUM ('SYSTEM','TEST_RESULT','LEARNING_REMINDER')`);
    await queryRunner.query(`CREATE TYPE notification_channel AS ENUM ('IN_APP','EMAIL','BANNER')`);
    await queryRunner.query(`CREATE TYPE notification_audience_type AS ENUM ('ALL','ROLE','SELECTED_USERS')`);
    await queryRunner.query(`CREATE TYPE notification_status AS ENUM ('DRAFT','SCHEDULED','SENDING','SENT','FAILED','CANCELLED')`);
    await queryRunner.query(`CREATE TYPE notification_delivery_status AS ENUM ('PENDING','DELIVERED','FAILED')`);
    await queryRunner.query(`CREATE TYPE discussion_status AS ENUM ('VISIBLE','HIDDEN','DELETED')`);
    await queryRunner.query(`CREATE TYPE dictation_audio_source AS ENUM ('UPLOADED','TTS')`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const types = ['dictation_audio_source','discussion_status','notification_delivery_status','notification_status','notification_audience_type','notification_channel','notification_type','vocabulary_rating','vocabulary_source_type','notebook_item_type','vocabulary_item_type','evidence_outcome','evidence_scope','learning_goal_status','budget_reservation_status','budget_scope','ai_request_status','knowledge_document_status','knowledge_access_scope','chat_message_status','chat_role','speech_analysis_status','result_source','grading_status','attempt_status','learning_topic_type','publication_status','test_scope','skill_component','account_status'];
    for (const type of types) await queryRunner.query(`DROP TYPE IF EXISTS ${type}`);
  }
}
