import { hash } from 'bcryptjs';
import { EntityManager } from 'typeorm';
import { SeedAdminConfig } from './seed-admin.config';

const roles = [
  ['ADMIN', 'Administrator', 'Manages users, tests and system operations.'],
  ['TEACHER', 'Teacher', 'Creates tests and reviews learner performance.'],
  ['STUDENT', 'Student', 'Practises Aptis tests and reviews results.'],
] as const;

interface ExistingAdminRow {
  email: string;
  status: 'ACTIVE' | 'INACTIVE' | 'BANNED';
  deleted_at: Date | null;
}

interface ExistingUserRow {
  id: string;
}

export async function seedBootstrapData(manager: EntityManager, admin: SeedAdminConfig): Promise<'created' | 'existing'> {
  await manager.query("SELECT pg_advisory_xact_lock(hashtext('aptimate-bootstrap-administrator'))");

  for (const [code, name, description] of roles) {
    await manager.query(
      `INSERT INTO roles(code, name, description) VALUES ($1, $2, $3)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description`,
      [code, name, description],
    );
  }

  const existingAdmins = await manager.query<ExistingAdminRow[]>(
    `SELECT u.email::text, u.status, u.deleted_at
       FROM users u
       JOIN roles r ON r.id = u.role_id
      WHERE r.code = 'ADMIN'
      ORDER BY u.created_at ASC
      FOR UPDATE OF u`,
  );

  if (existingAdmins.length > 1) {
    throw new Error('More than one ADMIN account exists. Refusing to change administrator data automatically.');
  }

  if (existingAdmins.length === 1) {
    const existingAdmin = existingAdmins[0];
    if (existingAdmin.email.toLowerCase() !== admin.email) {
      throw new Error('An ADMIN account already exists with a different email. No account was created.');
    }
    if (existingAdmin.deleted_at || existingAdmin.status !== 'ACTIVE') {
      throw new Error('The configured ADMIN account is not active. Restore it explicitly before running the seed again.');
    }
    return 'existing';
  }

  const usersWithEmail = await manager.query<ExistingUserRow[]>(
    'SELECT id FROM users WHERE email = $1::citext FOR UPDATE',
    [admin.email],
  );
  if (usersWithEmail.length > 0) {
    throw new Error('The administrator seed email already belongs to a non-ADMIN account. No role was changed.');
  }

  const passwordHash = await hash(admin.password, admin.passwordHashRounds);
  await manager.query(
    `INSERT INTO users(
       email, password_hash, first_name, last_name, role_id, status,
       email_verified_at, password_changed_at
     )
     SELECT $1::citext, $2, $3, $4, r.id, 'ACTIVE', now(), now()
       FROM roles r
      WHERE r.code = 'ADMIN'`,
    [admin.email, passwordHash, admin.firstName, admin.lastName],
  );

  return 'created';
}
