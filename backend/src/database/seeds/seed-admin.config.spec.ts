import { loadSeedAdminConfig } from './seed-admin.config';

describe('administrator seed configuration', () => {
  it('normalizes the email and applies non-secret defaults', () => {
    const result = loadSeedAdminConfig({
      ADMIN_SEED_EMAIL: '  ADMIN@Example.com ',
      ADMIN_SEED_PASSWORD: 'a-secure-password',
    });

    expect(result).toEqual({
      email: 'admin@example.com',
      password: 'a-secure-password',
      firstName: 'System',
      lastName: 'Administrator',
      passwordHashRounds: 12,
    });
  });

  it('does not provide default administrator credentials', () => {
    expect(() => loadSeedAdminConfig({})).toThrow('ADMIN_SEED_EMAIL');
  });

  it('rejects a password containing only spaces', () => {
    expect(() =>
      loadSeedAdminConfig({
        ADMIN_SEED_EMAIL: 'admin@example.com',
        ADMIN_SEED_PASSWORD: '        ',
      }),
    ).toThrow('ADMIN_SEED_PASSWORD');
  });
});
