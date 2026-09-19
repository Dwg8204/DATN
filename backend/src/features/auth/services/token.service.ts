import { createHash, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ApplicationError } from '../../../common/errors/application.error';
import { AuthRepository } from '../repositories/auth.repository';
import { AccessTokenPayload, AuthUser, RefreshTokenPayload } from '../types/auth-user.type';

export interface ClientMetadata { userAgent?: string; ipAddress?: string }
export interface TokenPair { accessToken: string; refreshToken: string; expiresIn: number }

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly repository: AuthRepository,
  ) {}

  async issue(user: AuthUser, metadata: ClientMetadata): Promise<TokenPair> {
    const familyId = randomUUID();
    return this.createPair(user, familyId, metadata, true);
  }

  async refresh(rawToken: string, metadata: ClientMetadata): Promise<TokenPair> {
    const payload = await this.verifyRefresh(rawToken);
    const user = await this.repository.findAuthUserById(payload.sub);
    if (!user || user.status !== 'ACTIVE') throw new ApplicationError('ACCOUNT_UNAVAILABLE', 'The account is unavailable.', 401);
    if (payload.version !== user.authVersion) throw new ApplicationError('INVALID_REFRESH_TOKEN', 'The session has expired. Please sign in again.', 401);

    const nextId = randomUUID();
    const nextToken = await this.signRefresh(user.id, nextId, payload.family, payload.version);
    const result = await this.repository.rotateRefreshToken({
      currentId: payload.jti, currentHash: this.hash(rawToken), nextId, nextHash: this.hash(nextToken),
      userId: user.id, familyId: payload.family, expiresAt: this.refreshExpiry(), ...metadata,
    });
    if (result === 'STALE') throw new ApplicationError('REFRESH_TOKEN_STALE', 'The session is refreshing in another tab. Please retry.', 409);
    if (result === 'REUSED') throw new ApplicationError('REFRESH_TOKEN_REUSED', 'This session has been revoked. Please sign in again.', 401);
    if (result !== 'ROTATED') throw new ApplicationError('INVALID_REFRESH_TOKEN', 'The refresh token is invalid.', 401);
    return { accessToken: await this.signAccess(user, payload.family), refreshToken: nextToken, expiresIn: this.accessTtl() };
  }

  async revoke(rawToken?: string): Promise<void> {
    if (rawToken) await this.repository.revokeRefreshToken(this.hash(rawToken));
  }

  async revokeAll(userId: string): Promise<void> {
    await this.repository.revokeAllRefreshTokens(userId);
  }

  private async createPair(user: AuthUser, familyId: string, metadata: ClientMetadata, persist: boolean): Promise<TokenPair> {
    const tokenId = randomUUID();
    const refreshToken = await this.signRefresh(user.id, tokenId, familyId, this.authVersion(user));
    if (persist) {
      await this.repository.storeRefreshToken({
        id: tokenId, userId: user.id, hash: this.hash(refreshToken), familyId,
        expiresAt: this.refreshExpiry(), ...metadata,
      });
    }
    return { accessToken: await this.signAccess(user, familyId), refreshToken, expiresIn: this.accessTtl() };
  }

  private signAccess(user: AuthUser, familyId: string): Promise<string> {
    const payload: AccessTokenPayload = {
      sub: user.id, email: user.email, role: user.role, type: 'access',
      family: familyId, version: this.authVersion(user),
    };
    return this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('auth.accessSecret'), issuer: this.config.getOrThrow<string>('auth.issuer'),
      audience: this.config.getOrThrow<string>('auth.audience'), expiresIn: this.accessTtl(),
    });
  }

  private signRefresh(userId: string, tokenId: string, familyId: string, version: number): Promise<string> {
    const payload: RefreshTokenPayload = { sub: userId, jti: tokenId, family: familyId, type: 'refresh', version };
    return this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('auth.refreshSecret'), issuer: this.config.getOrThrow<string>('auth.issuer'),
      audience: this.config.getOrThrow<string>('auth.audience'), expiresIn: `${this.refreshDays()}d`,
    });
  }

  private async verifyRefresh(token: string): Promise<RefreshTokenPayload> {
    try {
      const payload = await this.jwt.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.config.getOrThrow<string>('auth.refreshSecret'), issuer: this.config.getOrThrow<string>('auth.issuer'),
        audience: this.config.getOrThrow<string>('auth.audience'),
      });
      if (payload.type !== 'refresh' || !payload.jti || !payload.family || !Number.isInteger(payload.version)) {
        throw new Error('Invalid token type');
      }
      return payload;
    } catch {
      throw new ApplicationError('INVALID_REFRESH_TOKEN', 'The refresh token is invalid or expired.', 401);
    }
  }

  private hash(token: string): string { return createHash('sha256').update(token).digest('hex'); }
  private authVersion(user: AuthUser): number {
    if (!Number.isInteger(user.authVersion)) throw new Error('Account session version is unavailable. Run database migrations.');
    return user.authVersion as number;
  }
  private accessTtl(): number { return this.config.get<number>('auth.accessTtlSeconds', 900); }
  private refreshDays(): number { return this.config.get<number>('auth.refreshTtlDays', 7); }
  private refreshExpiry(): Date { return new Date(Date.now() + this.refreshDays() * 86_400_000); }
}
