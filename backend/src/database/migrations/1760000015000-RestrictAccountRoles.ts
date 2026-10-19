import { MigrationInterface, QueryRunner } from 'typeorm';

export class RestrictAccountRoles1760000015000 implements MigrationInterface {
  name = 'RestrictAccountRoles1760000015000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      LOCK TABLE roles, users, notifications, notification_recipients, refresh_tokens
        IN SHARE ROW EXCLUSIVE MODE;
      INSERT INTO roles(code, name) VALUES ('ADMIN', 'Administrator'), ('STUDENT', 'Student')
        ON CONFLICT (code) DO NOTHING;

      -- Scheduled/sent notifications already have a frozen recipient list.
      -- Resolve unsent drafts before changing roles; never broaden to all students.
      INSERT INTO notification_recipients(notification_id, user_id)
        SELECT n.id, u.id FROM notifications n
        JOIN roles r ON r.id = n.audience_role_id AND r.code = 'TEACHER'
        JOIN users u ON u.role_id = r.id AND u.status = 'ACTIVE' AND u.deleted_at IS NULL
        WHERE n.audience_type = 'ROLE' AND n.status = 'DRAFT'
        ON CONFLICT (notification_id, user_id) DO NOTHING;
      UPDATE notifications SET audience_type = 'SELECTED_USERS', audience_role_id = NULL, updated_at = now()
        WHERE audience_role_id IN (SELECT id FROM roles WHERE code = 'TEACHER');

      INSERT INTO audit_logs(action, entity_type, entity_id, changes)
        SELECT 'USER_ROLE_CHANGED', 'USER', u.id,
          '{"role":{"from":"TEACHER","to":"STUDENT"},"reason":"RestrictAccountRoles1760000015000"}'::jsonb
        FROM users u JOIN roles r ON r.id = u.role_id WHERE r.code = 'TEACHER';
      UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, now())
        WHERE user_id IN (SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE r.code = 'TEACHER');
      UPDATE users SET role_id = (SELECT id FROM roles WHERE code = 'STUDENT'),
          auth_version = auth_version + 1, updated_at = now()
        WHERE role_id IN (SELECT id FROM roles WHERE code = 'TEACHER');
      DELETE FROM roles WHERE code = 'TEACHER';
      ALTER TABLE roles ADD CONSTRAINT roles_supported_code_ck CHECK (code IN ('ADMIN', 'STUDENT'));

      -- These describe historical provenance, not account permissions.
      ALTER TYPE result_source RENAME VALUE 'TEACHER' TO 'MANUAL';
      ALTER TYPE vocabulary_source_type RENAME VALUE 'TEACHER' TO 'MANUAL';
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Restore schema compatibility only. Never silently restore elevated access
    // or broaden notification recipients after accounts have been migrated.
    await queryRunner.query(`
      ALTER TYPE vocabulary_source_type RENAME VALUE 'MANUAL' TO 'TEACHER';
      ALTER TYPE result_source RENAME VALUE 'MANUAL' TO 'TEACHER';
      ALTER TABLE roles DROP CONSTRAINT roles_supported_code_ck;
      INSERT INTO roles(code, name) VALUES ('TEACHER', 'Teacher') ON CONFLICT (code) DO NOTHING;
    `);
  }
}
