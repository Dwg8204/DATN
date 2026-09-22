import { MigrationInterface, QueryRunner } from 'typeorm';

export class OptimizeTestManagement1760000003000 implements MigrationInterface {
  name = 'OptimizeTestManagement1760000003000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX questions_active_position_uq
        ON questions(test_id, part_number, position)
        WHERE deleted_at IS NULL;
      CREATE INDEX attempts_snapshot_idx ON test_attempts(snapshot_id);
      CREATE INDEX tests_creator_component_updated_idx
        ON tests(created_by, component, updated_at DESC, id DESC);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS tests_creator_component_updated_idx;
      DROP INDEX IF EXISTS attempts_snapshot_idx;
      DROP INDEX IF EXISTS questions_active_position_uq;
    `);
  }
}

