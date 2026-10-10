import { ConfigService } from '@nestjs/config';
import { AuthRepository } from '../repositories/auth.repository';
import { AccessTokenPayload, AuthUser } from '../types/auth-user.type';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy session checks', () => {
  const user: AuthUser = {
    id: 'd30ee28b-203f-4135-a733-5cf85126d7a9', email: 'student@example.test',
    firstName: 'Test', lastName: 'Student', role: 'STUDENT', status: 'ACTIVE', authVersion: 3,
  };
  const payload: AccessTokenPayload = {
    sub: user.id, email: user.email, role: user.role, type: 'access',
    family: '02e722ed-7350-4778-82fd-605400385f02', version: 3,
  };
  const config = new ConfigService({ auth: { accessSecret: 'test-access-secret', issuer: 'aptimate-test', audience: 'aptimate-test' } });
  let repository: jest.Mocked<Pick<AuthRepository, 'findAuthUserById'>>;
  let strategy: JwtStrategy;

  beforeEach(() => {
    repository = { findAuthUserById: jest.fn().mockResolvedValue(user) };
    strategy = new JwtStrategy(config, repository as unknown as AuthRepository);
  });

  it('accepts an active token bound to its refresh family', async () => {
    await expect(strategy.validate(payload)).resolves.toEqual(user);
    expect(repository.findAuthUserById).toHaveBeenCalledWith(user.id, payload.family);
  });

  it('rejects a token after logout revokes its family', async () => {
    repository.findAuthUserById.mockResolvedValue(null);
    await expect(strategy.validate(payload)).rejects.toMatchObject({ code: 'ACCOUNT_UNAVAILABLE', statusCode: 401 });
  });

  it('rejects a token issued before a password change', async () => {
    repository.findAuthUserById.mockResolvedValue({ ...user, authVersion: 4 });
    await expect(strategy.validate(payload)).rejects.toMatchObject({ code: 'INVALID_TOKEN', statusCode: 401 });
  });
});
