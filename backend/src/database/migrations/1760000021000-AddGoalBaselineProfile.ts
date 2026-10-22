import { MigrationInterface, QueryRunner } from "typeorm";
export class AddGoalBaselineProfile1760000021000 implements MigrationInterface {
  name = "AddGoalBaselineProfile1760000021000";
  async up(q: QueryRunner): Promise<void> {
    await q.query(
      "ALTER TABLE learning_goals ADD COLUMN baseline_profile jsonb",
    );
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query("ALTER TABLE learning_goals DROP COLUMN baseline_profile");
  }
}
