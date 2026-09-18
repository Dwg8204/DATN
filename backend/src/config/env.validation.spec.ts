import { environmentSchema } from './env.validation';

const validEnvironment = {
  FRONTEND_ORIGIN: 'http://localhost:5173',
  DATABASE_URL: 'postgresql://user:password@localhost:5432/aptimate',
  JWT_ACCESS_SECRET: 'a-secret-value-with-more-than-32-characters',
  JWT_REFRESH_SECRET: 'a-different-refresh-secret-with-32-characters',
  JWT_ISSUER: 'aptimate-api',
  JWT_AUDIENCE: 'aptimate-web',
};

describe('environment validation', () => {
  it('accepts a complete environment and applies defaults', () => {
    const result = environmentSchema.validate(validEnvironment);
    expect(result.error).toBeUndefined();
    expect(result.value.PORT).toBe(3000);
    expect(result.value.DB_POOL_MAX).toBe(10);
  });

  it('rejects an invalid database URL', () => {
    const result = environmentSchema.validate({ ...validEnvironment, DATABASE_URL: 'mysql://localhost/test' });
    expect(result.error).toBeDefined();
  });

  it('rejects a short JWT secret', () => {
    const result = environmentSchema.validate({ ...validEnvironment, JWT_ACCESS_SECRET: 'short' });
    expect(result.error).toBeDefined();
  });

  it('requires SMTP settings when email delivery is enabled', () => {
    const result = environmentSchema.validate({ ...validEnvironment, SMTP_ENABLED: true });
    expect(result.error).toBeDefined();
  });

  it('requires Cloudinary credentials only when image uploads are enabled', () => {
    expect(environmentSchema.validate({ ...validEnvironment, CLOUDINARY_ENABLED: false }).error).toBeUndefined();
    expect(environmentSchema.validate({ ...validEnvironment, CLOUDINARY_ENABLED: true }).error).toBeDefined();
    expect(environmentSchema.validate({
      ...validEnvironment,
      CLOUDINARY_ENABLED: true,
      CLOUDINARY_CLOUD_NAME: 'aptimate-demo',
      CLOUDINARY_API_KEY: 'key',
      CLOUDINARY_API_SECRET: 'secret',
    }).error).toBeUndefined();
  });
});
