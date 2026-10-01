import { MigrationInterface, QueryRunner } from 'typeorm';

export class TrackAuthSessions1760000007000 implements MigrationInterface {
  name = 'TrackAuthSessions1760000007000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users ADD COLUMN auth_version integer NOT NULL DEFAULT 0;
      CREATE INDEX refresh_tokens_active_user_family_idx
        ON refresh_tokens(user_id, family_id) WHERE revoked_at IS NULL;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS refresh_tokens_active_user_family_idx;
      ALTER TABLE users DROP COLUMN auth_version;
    `);
  }
}
