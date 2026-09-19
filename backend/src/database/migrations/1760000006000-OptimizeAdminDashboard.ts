import { MigrationInterface, QueryRunner } from 'typeorm';

export class OptimizeAdminDashboard1760000006000 implements MigrationInterface {
  name = 'OptimizeAdminDashboard1760000006000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX tests_created_component_idx ON tests(created_at DESC, component);
      CREATE INDEX attempts_started_component_student_idx
        ON test_attempts(started_at DESC, component, student_id);
      CREATE INDEX users_created_role_idx ON users(created_at DESC, role_id);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS users_created_role_idx;
      DROP INDEX IF EXISTS attempts_started_component_student_idx;
      DROP INDEX IF EXISTS tests_created_component_idx;
    `);
  }
}
