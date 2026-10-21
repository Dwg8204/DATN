import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVocabularyBulkImports1760000019000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE TABLE vocabulary_bulk_imports (
      id uuid NOT NULL, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      payload_hash char(64) NOT NULL, result jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,id)
    )`);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP TABLE vocabulary_bulk_imports');
  }
}
