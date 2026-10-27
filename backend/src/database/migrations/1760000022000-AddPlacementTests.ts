import { MigrationInterface, QueryRunner } from 'typeorm';
export class AddPlacementTests1760000022000 implements MigrationInterface {
  name = 'AddPlacementTests1760000022000';
  async up(q: QueryRunner) {
    await q.query(`ALTER TABLE tests ADD COLUMN is_placement boolean NOT NULL DEFAULT false, ADD COLUMN placement_family_id uuid;
 ALTER TABLE tests ADD CONSTRAINT tests_placement_full_ck CHECK(NOT is_placement OR scope='FULL_SKILL');
 CREATE INDEX tests_placement_component_idx ON tests(component) WHERE is_placement AND status='PUBLISHED';
 CREATE INDEX tests_placement_family_idx ON tests(placement_family_id) WHERE placement_family_id IS NOT NULL;`);
  }
  async down(q: QueryRunner) {
    await q.query(
      'DROP INDEX tests_placement_family_idx; DROP INDEX tests_placement_component_idx; ALTER TABLE tests DROP CONSTRAINT tests_placement_full_ck, DROP COLUMN placement_family_id, DROP COLUMN is_placement',
    );
  }
}
