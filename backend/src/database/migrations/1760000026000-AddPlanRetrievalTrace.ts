import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPlanRetrievalTrace1760000026000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE study_plan_items ADD COLUMN retrieval jsonb;
      ALTER TABLE study_plans ADD COLUMN replanned_after_placement_at timestamptz;`);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE study_plans DROP COLUMN replanned_after_placement_at;
      ALTER TABLE study_plan_items DROP COLUMN retrieval;`);
  }
}
