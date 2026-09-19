import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthRepository } from '../repositories/auth.repository';
import { AuthUser } from '../types/auth-user.type';
import { TokenService } from './token.service';

describe('TokenService session validity', () => {
  const user: AuthUser = {
    id: 'ec1f2784-6a59-4ea9-bd21-9cd0034bd853', email: 'student@example.test',
    firstName: 'Test', lastName: 'Student', role: 'STUDENT', status: 'ACTIVE', authVersion: 2,
  };
  const config = new ConfigService({
    auth: {
      accessSecret: 'test-access-secret', refreshSecret: 'test-refresh-secret',
      issuer: 'aptimate-test', audience: 'aptimate-test', accessTtlSeconds: 900, refreshTtlDays: 7,
    },
  });
  let repository: jest.Mocked<Pick<AuthRepository, 'storeRefreshToken' | 'findAuthUserById' | 'rotateRefreshToken'>>;
  let service: TokenService;

  beforeEach(() => {
    repository = {
      storeRefreshToken: jest.fn().mockResolvedValue(undefined),
      findAuthUserById: jest.fn().mockResolvedValue(user),
      rotateRefreshToken: jest.fn().mockResolvedValue('ROTATED'),
    };
    service = new TokenService(new JwtService(), config, repository as unknown as AuthRepository);
  });

  it('binds access and refresh tokens to the same session and auth version', async () => {
    const pair = await service.issue(user, {});
    const jwt = new JwtService();
    const access = await jwt.verifyAsync<{ family: string; version: number }>(pair.accessToken, { secret: 'test-access-secret' });
    const refresh = await jwt.verifyAsync<{ family: string; version: number }>(pair.refreshToken, { secret: 'test-refresh-secret' });
    expect(access.family).toBe(refresh.family);
    expect(access.version).toBe(2);
    expect(refresh.version).toBe(2);
    expect(repository.storeRefreshToken).toHaveBeenCalledWith(expect.objectContaining({ familyId: access.family, userId: user.id }));
  });

  it('rejects refresh tokens issued before a password change', async () => {
    const oldPair = await service.issue(user, {});
    repository.findAuthUserById.mockResolvedValue({ ...user, authVersion: 3 });
    await expect(service.refresh(oldPair.refreshToken, {})).rejects.toMatchObject({ code: 'INVALID_REFRESH_TOKEN', statusCode: 401 });
    expect(repository.rotateRefreshToken).not.toHaveBeenCalled();
  });

  it('asks another tab to retry a just-rotated token without revoking the session', async () => {
    const pair = await service.issue(user, {});
    repository.rotateRefreshToken.mockResolvedValue('STALE');
    await expect(service.refresh(pair.refreshToken, {})).rejects.toMatchObject({ code: 'REFRESH_TOKEN_STALE', statusCode: 409 });
  });

  it('rejects an older replay after the concurrency window', async () => {
    const pair = await service.issue(user, {});
    repository.rotateRefreshToken.mockResolvedValue('REUSED');
    await expect(service.refresh(pair.refreshToken, {})).rejects.toMatchObject({ code: 'REFRESH_TOKEN_REUSED', statusCode: 401 });
  });
});
