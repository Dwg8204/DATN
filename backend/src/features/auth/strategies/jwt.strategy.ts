import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ApplicationError } from '../../../common/errors/application.error';
import { AuthRepository } from '../repositories/auth.repository';
import { AccessTokenPayload, AuthUser } from '../types/auth-user.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private readonly repository: AuthRepository) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => request?.cookies?.aptimate_access_token as string | null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('auth.accessSecret'),
      issuer: config.getOrThrow<string>('auth.issuer'),
      audience: config.getOrThrow<string>('auth.audience'),
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AuthUser> {
    if (payload.type !== 'access' || !payload.family || !Number.isInteger(payload.version)) {
      throw new ApplicationError('INVALID_TOKEN', 'The access token is invalid.', 401);
    }
    const user = await this.repository.findAuthUserById(payload.sub, payload.family);
    if (!user || user.status !== 'ACTIVE') throw new ApplicationError('ACCOUNT_UNAVAILABLE', 'The account is unavailable.', 401);
    if (payload.version !== user.authVersion) throw new ApplicationError('INVALID_TOKEN', 'The session has expired. Please sign in again.', 401);
    return user;
  }
}
