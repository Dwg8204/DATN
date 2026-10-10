import { MigrationInterface, QueryRunner } from 'typeorm';

export class RestoreReadingExamDeadline1760000011000 implements MigrationInterface {
  name = 'RestoreReadingExamDeadline1760000011000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Resume existing untimed exams from their original start, not a fresh 35 minutes.
    // Leave Practice, submitted results and already-timed attempts unchanged.
    await queryRunner.query(`
      UPDATE test_attempts
      SET expires_at = started_at + interval '35 minutes', updated_at = clock_timestamp()
      WHERE component = 'READING' AND purpose = 'EXAM'
        AND status = 'IN_PROGRESS' AND expires_at IS NULL
    `);
  }

  async down(): Promise<void> {
    throw new Error('Reading deadlines may already have sealed exam results. Restore a database backup for rollback.');
  }
}
