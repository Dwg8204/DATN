import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import {
  InjectThrottlerOptions, InjectThrottlerStorage, ThrottlerGuard,
  ThrottlerModuleOptions, ThrottlerStorage,
} from '@nestjs/throttler';
import { Request } from 'express';
import { AccessTokenPayload } from '../../features/auth/types/auth-user.type';

@Injectable()
export class AccountThrottlerGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storage: ThrottlerStorage,
    reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    super(options, storage, reflector);
  }

  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const request = req as unknown as Request;
    const cookie = request.cookies?.aptimate_access_token as unknown;
    const authorization = request.headers.authorization;
    const token = typeof cookie === 'string' ? cookie
      : authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
    if (token) {
      try {
        const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
          secret: this.config.getOrThrow<string>('auth.accessSecret'),
          issuer: this.config.getOrThrow<string>('auth.issuer'),
          audience: this.config.getOrThrow<string>('auth.audience'),
        });
        if (payload.type === 'access' && payload.sub) return `user:${payload.sub}`;
      } catch { /* Invalid tokens use the IP limit. */ }
    }
    return `ip:${await super.getTracker(req)}`;
  }
}
