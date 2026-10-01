import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from '../services/auth.service';
import { PasswordResetService } from '../services/password-reset.service';
import { TokenService } from '../services/token.service';

describe('AuthController cookies', () => {
  it('stores both JWTs in scoped HttpOnly cookies and never returns them in JSON', async () => {
    const profile = {
      id: 'user-1', email: 'student@example.com', firstName: 'Test', lastName: 'Student',
      role: 'STUDENT' as const, status: 'ACTIVE' as const,
    };
    const tokens = { accessToken: 'access.jwt.value', refreshToken: 'refresh.jwt.value', expiresIn: 900 };
    const auth = { login: jest.fn().mockResolvedValue({ user: profile, tokens }) };
    const response = { cookie: jest.fn() };
    const request = { get: jest.fn().mockReturnValue('test-agent'), ip: '127.0.0.1' };
    const controller = new AuthController(
      auth as unknown as AuthService,
      {} as TokenService,
      {} as PasswordResetService,
      new ConfigService({ app: { env: 'development', apiPrefix: 'api/v1' }, auth: { refreshTtlDays: 7 } }),
    );

    const result = await controller.login(
      { email: profile.email, password: 'ValidPassword1!' },
      request as unknown as Request,
      response as unknown as Response,
    );

    expect(response.cookie).toHaveBeenNthCalledWith(1, 'aptimate_access_token', tokens.accessToken, {
      httpOnly: true, secure: false, sameSite: 'lax', path: '/api/v1', maxAge: 900_000,
    });
    expect(response.cookie).toHaveBeenNthCalledWith(2, 'aptimate_refresh_token', tokens.refreshToken, {
      httpOnly: true, secure: false, sameSite: 'lax', path: '/api/v1/auth', maxAge: 604_800_000,
    });
    expect(result).toEqual({ expiresIn: 900, profile });
    expect(JSON.stringify(result)).not.toContain(tokens.accessToken);
    expect(JSON.stringify(result)).not.toContain(tokens.refreshToken);
  });
});
