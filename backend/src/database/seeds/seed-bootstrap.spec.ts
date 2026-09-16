import { compare } from 'bcryptjs';
import { EntityManager } from 'typeorm';
import { SeedAdminConfig } from './seed-admin.config';
import { seedBootstrapData } from './seed-bootstrap';

const admin: SeedAdminConfig = {
  email: 'admin@example.com',
  password: 'a-secure-password',
  firstName: 'System',
  lastName: 'Administrator',
  passwordHashRounds: 10,
};

function managerWith(adminRows: unknown[] = [], emailRows: unknown[] = []) {
  const query = jest.fn(async (sql: string, parameters?: unknown[]) => {
    void parameters;
    if (sql.includes("WHERE r.code = 'ADMIN'")) return adminRows;
    if (sql.includes('SELECT id FROM users WHERE email')) return emailRows;
    return [];
  });
  return { manager: { query } as unknown as EntityManager, query };
}

describe('bootstrap seed', () => {
  it('creates one active administrator using a password hash', async () => {
    const { manager, query } = managerWith();

    await expect(seedBootstrapData(manager, admin)).resolves.toBe('created');

    const userInsert = query.mock.calls.find(([sql]) => (sql as string).includes('INSERT INTO users'));
    expect(userInsert).toBeDefined();
    if (!userInsert) throw new Error('Expected an administrator insert query.');
    const parameters = userInsert[1] as string[];
    expect(parameters[0]).toBe(admin.email);
    expect(parameters[1]).not.toBe(admin.password);
    await expect(compare(admin.password, parameters[1])).resolves.toBe(true);
  });

  it('is idempotent for the same active administrator', async () => {
    const { manager, query } = managerWith([{ email: admin.email, status: 'ACTIVE', deleted_at: null }]);

    await expect(seedBootstrapData(manager, admin)).resolves.toBe('existing');
    expect(query.mock.calls.some(([sql]) => (sql as string).includes('INSERT INTO users'))).toBe(false);
  });

  it('refuses to create a second administrator', async () => {
    const { manager } = managerWith([{ email: 'other@example.com', status: 'ACTIVE', deleted_at: null }]);

    await expect(seedBootstrapData(manager, admin)).rejects.toThrow('different email');
  });

  it('refuses to promote a non-administrator with the configured email', async () => {
    const { manager } = managerWith([], [{ id: 'user-id' }]);

    await expect(seedBootstrapData(manager, admin)).rejects.toThrow('belongs to a non-ADMIN account');
  });
});
