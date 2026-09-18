import { MigrationInterface, QueryRunner } from 'typeorm';

export class OptimizeGrammarTestListing1760000004000 implements MigrationInterface {
  name = 'OptimizeGrammarTestListing1760000004000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE EXTENSION IF NOT EXISTS pg_trgm;
      CREATE INDEX tests_component_status_updated_idx
        ON tests(component, status, updated_at DESC, id DESC);
      CREATE INDEX grammar_tests_title_trgm_idx
        ON tests USING gin(title gin_trgm_ops)
        WHERE component = 'GRAMMAR_VOCAB';
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS grammar_tests_title_trgm_idx;
      DROP INDEX IF EXISTS tests_component_status_updated_idx;
    `);
  }
}

