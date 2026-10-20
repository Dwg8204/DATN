import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPersonalizationEnums1760000017000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(
      "ALTER TYPE learning_goal_status ADD VALUE IF NOT EXISTS 'REPLACED'",
    );
    await runner.query(
      "ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'LEARNING_REPORT'",
    );
  }

  async down(runner: QueryRunner): Promise<void> {
    // Never silently relabel ended goals or reports when rolling back.
    const [used] = await runner.query(`SELECT
      EXISTS(SELECT 1 FROM learning_goals WHERE status::text='REPLACED') OR
      EXISTS(SELECT 1 FROM notifications WHERE type::text='LEARNING_REPORT') AS used`);
    if (used.used) throw new Error('PERSONALIZATION_ENUM_ROLLBACK_IN_USE');
    await runner.query(`
      DROP INDEX learning_goals_one_active_idx;
      ALTER TABLE learning_goals ALTER COLUMN status DROP DEFAULT;
      ALTER TYPE learning_goal_status RENAME TO learning_goal_status_with_personalization;
      CREATE TYPE learning_goal_status AS ENUM ('ACTIVE','COMPLETED','EXPIRED','CANCELLED');
      ALTER TABLE learning_goals ALTER COLUMN status TYPE learning_goal_status USING status::text::learning_goal_status;
      ALTER TABLE learning_goals ALTER COLUMN status SET DEFAULT 'ACTIVE';
      CREATE UNIQUE INDEX learning_goals_one_active_idx ON learning_goals(user_id) WHERE status='ACTIVE';
      DROP TYPE learning_goal_status_with_personalization;

      ALTER TYPE notification_type RENAME TO notification_type_with_personalization;
      CREATE TYPE notification_type AS ENUM ('SYSTEM','TEST_RESULT','LEARNING_REMINDER');
      ALTER TABLE notifications ALTER COLUMN type TYPE notification_type USING type::text::notification_type;
      DROP TYPE notification_type_with_personalization;
    `);
  }
}
