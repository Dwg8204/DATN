import { MigrationInterface, QueryRunner } from 'typeorm';

export class ClassifyTestsAndAttempts1760000009000 implements MigrationInterface {
  name = 'ClassifyTestsAndAttempts1760000009000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE tests ADD COLUMN purpose varchar(20);
      UPDATE tests
      SET purpose = CASE WHEN scope = 'PART' THEN 'PRACTICE' ELSE 'EXAM' END;
      ALTER TABLE tests ALTER COLUMN purpose SET NOT NULL;
      ALTER TABLE tests ADD CONSTRAINT tests_purpose_ck
        CHECK (purpose IN ('EXAM', 'PRACTICE'));
      ALTER TABLE tests ADD CONSTRAINT tests_exam_scope_ck
        CHECK (purpose <> 'EXAM' OR scope = 'FULL_SKILL');

      ALTER TABLE test_attempts ADD COLUMN purpose varchar(20);
      UPDATE test_attempts SET purpose = 'EXAM';
      ALTER TABLE test_attempts ALTER COLUMN purpose SET NOT NULL;
      ALTER TABLE test_attempts ADD CONSTRAINT test_attempts_purpose_ck
        CHECK (purpose IN ('EXAM', 'PRACTICE'));

      CREATE INDEX tests_catalog_purpose_idx
        ON tests(component, purpose, status, scope, part_number, updated_at DESC, id DESC)
        WHERE archived_at IS NULL;
      CREATE INDEX attempts_student_purpose_started_idx
        ON test_attempts(student_id, purpose, started_at DESC, id DESC);

      DROP INDEX IF EXISTS attempts_active_resume_idx;
      CREATE INDEX attempts_active_resume_idx
        ON test_attempts(student_id, snapshot_id, started_at DESC)
        WHERE status = 'IN_PROGRESS' AND purpose = 'EXAM';
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS attempts_active_resume_idx;
      CREATE INDEX attempts_active_resume_idx
        ON test_attempts(student_id, snapshot_id, started_at DESC)
        WHERE status = 'IN_PROGRESS';
      DROP INDEX IF EXISTS attempts_student_purpose_started_idx;
      DROP INDEX IF EXISTS tests_catalog_purpose_idx;
      ALTER TABLE test_attempts DROP CONSTRAINT IF EXISTS test_attempts_purpose_ck;
      ALTER TABLE test_attempts DROP COLUMN IF EXISTS purpose;
      ALTER TABLE tests DROP CONSTRAINT IF EXISTS tests_exam_scope_ck;
      ALTER TABLE tests DROP CONSTRAINT IF EXISTS tests_purpose_ck;
      ALTER TABLE tests DROP COLUMN IF EXISTS purpose;
    `);
  }
}
