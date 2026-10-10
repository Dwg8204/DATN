import { MigrationInterface, QueryRunner } from 'typeorm';
import { createHash } from 'node:crypto';
import { STUDY_TOPICS, STUDY_WORDS, STUDY_SENTENCES } from '../../features/vocabulary/data/dictation-defaults-v1';

export class ConnectPersonalDictation1760000010000 implements MigrationInterface {
  name = 'ConnectPersonalDictation1760000010000';
  async up(r: QueryRunner): Promise<void> {
    await r.query(`
      ALTER TABLE dictation_exercises ALTER COLUMN created_by DROP NOT NULL;
      ALTER TABLE dictation_exercises ADD COLUMN is_personal boolean NOT NULL DEFAULT false;
      ALTER TABLE dictation_exercises ADD COLUMN source_key varchar(100);
      CREATE UNIQUE INDEX dictation_system_source_idx ON dictation_exercises(source_key) WHERE created_by IS NULL;
      ALTER TABLE vocabulary_entries ADD COLUMN source_key varchar(100);
      CREATE UNIQUE INDEX vocabulary_system_source_idx ON vocabulary_entries(source_key) WHERE owner_id IS NULL;
      ALTER TABLE user_notebook_items ADD COLUMN dictation_exercise_id uuid REFERENCES dictation_exercises(id);
      ALTER TABLE user_notebook_items ADD COLUMN legacy_key varchar(150);
      ALTER TABLE user_notebook_items ADD COLUMN legacy_progress jsonb;
      ALTER TABLE user_notebook_items ADD COLUMN legacy_imported_at timestamptz;
      CREATE UNIQUE INDEX notebook_legacy_key_idx ON user_notebook_items(user_id, legacy_key) WHERE legacy_key IS NOT NULL;
      ALTER TABLE dictation_attempts ADD COLUMN client_event_id uuid;
      CREATE UNIQUE INDEX dictation_attempt_event_idx ON dictation_attempts(user_id, client_event_id) WHERE client_event_id IS NOT NULL;
      CREATE INDEX dictation_latest_attempt_idx ON dictation_attempts(user_id, exercise_id, submitted_at DESC, id DESC);
    `);
    for (const [, name, description] of STUDY_TOPICS) {
      await r.query(`INSERT INTO vocabulary_folders(owner_id,name,description) VALUES(NULL,$1,$2)
        ON CONFLICT (lower(name)) WHERE owner_id IS NULL AND archived_at IS NULL DO NOTHING`, [name, description]);
    }
    for (const [key, topic, word, phonetic, type, meaning, example] of STUDY_WORDS) {
      await r.query(`INSERT INTO vocabulary_entries(owner_id,default_folder_id,item_type,term,normalized_term,
        language_code,meaning_language,meaning,phonetic,part_of_speech,context_sentence,source_type,cache_key,source_key)
        SELECT NULL,id,'WORD',$2,lower($2),'en','vi',$3,$4,$5,$6,'SYSTEM',$7,$8
        FROM vocabulary_folders WHERE owner_id IS NULL AND lower(name)=lower($1) AND archived_at IS NULL`,
      [topic, word, meaning, phonetic, type, example, createHash('sha256').update(key).digest('hex'), key]);
    }
    for (const [key, topic, title, locale, level, transcript] of STUDY_SENTENCES) {
      await r.query(`INSERT INTO dictation_exercises(created_by,folder_id,title,transcript,audio_source,locale,practice_level,status,source_key)
        SELECT NULL,id,$2,$3,'TTS',$4,$5,'PUBLISHED',$6 FROM vocabulary_folders
        WHERE owner_id IS NULL AND lower(name)=lower($1) AND archived_at IS NULL`, [topic, title, transcript, locale, level, key]);
    }
  }
  async down(): Promise<void> {
    throw new Error('This migration stores personal study data. Back up the database before a manual rollback.');
  }
}
