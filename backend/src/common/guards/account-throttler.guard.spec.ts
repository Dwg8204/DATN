import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ThrottlerModuleOptions, ThrottlerStorage } from '@nestjs/throttler';
import { AccountThrottlerGuard } from './account-throttler.guard';

class ExposedGuard extends AccountThrottlerGuard {
  tracker(request: Record<string, unknown>) { return this.getTracker(request); }
}

describe('account rate tracker', () => {
  const jwt = new JwtService();
  const values: Record<string, string> = { 'auth.accessSecret': 'test-secret', 'auth.issuer': 'aptimate', 'auth.audience': 'aptimate-web' };
  const config = { getOrThrow: (key: string) => values[key] } as ConfigService;
  const guard = new ExposedGuard([{ ttl: 60_000, limit: 120 }] as ThrottlerModuleOptions,
    {} as ThrottlerStorage, new Reflector(), jwt, config);

  it('groups valid access tokens by student rather than shared IP', async () => {
    const token = await jwt.signAsync({ sub: 'student-1', type: 'access' }, {
      secret: values['auth.accessSecret'], issuer: values['auth.issuer'], audience: values['auth.audience'], expiresIn: 60,
    });
    expect(await guard.tracker({ ip: '10.0.0.1', headers: {}, cookies: { aptimate_access_token: token } })).toBe('user:student-1');
    expect(await guard.tracker({ ip: '10.0.0.1', headers: {}, cookies: { aptimate_access_token: 'invalid' } })).toBe('ip:10.0.0.1');
  });
});
