import { MigrationInterface, QueryRunner } from 'typeorm';
export class AddPlanProgressFinalizedAt1760000023000 implements MigrationInterface {
  name = 'AddPlanProgressFinalizedAt1760000023000';
  async up(runner: QueryRunner) {
    await runner.query(
      'ALTER TABLE study_plans ADD COLUMN progress_finalized_at timestamptz',
    );
    await runner.query(
      'CREATE INDEX study_plans_unfinalized_goal_idx ON study_plans(goal_id,user_id) WHERE progress_finalized_at IS NULL',
    );
  }
  async down(runner: QueryRunner) {
    await runner.query('DROP INDEX study_plans_unfinalized_goal_idx');
    await runner.query(
      'ALTER TABLE study_plans DROP COLUMN progress_finalized_at',
    );
  }
}
