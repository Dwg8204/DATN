import { createHash, createHmac, randomBytes, randomInt } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApplicationError } from '../../../common/errors/application.error';
import { AuthRepository } from '../repositories/auth.repository';
import { MailService } from './mail.service';
import { PasswordService } from './password.service';

@Injectable()
export class PasswordResetService {
  constructor(
    private readonly repository: AuthRepository, private readonly passwords: PasswordService,
    private readonly mail: MailService, private readonly config: ConfigService,
  ) {}

  async request(emailInput: string): Promise<void> {
    this.mail.assertConfigured();
    const email = emailInput.trim().toLowerCase();
    const user = await this.repository.findCredentialByEmail(email);
    if (!user || user.status !== 'ACTIVE') return;
    const otp = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const ttl = this.config.get<number>('auth.resetOtpTtlMinutes', 10);
    await this.repository.createPasswordReset({
      userId: user.id, challengeHash: this.otpHash(email, otp), expiresAt: new Date(Date.now() + ttl * 60_000),
    });
    await this.mail.sendPasswordResetOtp(user.email, user.firstName, otp, ttl);
  }

  async verify(emailInput: string, otp: string): Promise<string> {
    const email = emailInput.trim().toLowerCase();
    const challenge = await this.repository.findActivePasswordReset(email);
    if (!challenge || challenge.expiresAt <= new Date()) throw new ApplicationError('OTP_INVALID_OR_EXPIRED', 'The OTP is invalid or expired.', 400);
    const maxAttempts = this.config.get<number>('auth.resetMaxAttempts', 5);
    if (challenge.failedAttempts >= maxAttempts) throw new ApplicationError('OTP_ATTEMPTS_EXCEEDED', 'Too many incorrect attempts. Request a new OTP.', 429);
    if (challenge.challengeHash !== this.otpHash(email, otp)) {
      const nextAttempts = challenge.failedAttempts + 1;
      await this.repository.recordFailedOtp(challenge.id, nextAttempts >= maxAttempts);
      throw new ApplicationError('OTP_INVALID_OR_EXPIRED', 'The OTP is invalid or expired.', 400);
    }
    const resetToken = randomBytes(32).toString('base64url');
    const grantTtl = this.config.get<number>('auth.resetGrantTtlMinutes', 15);
    await this.repository.verifyPasswordReset(challenge.id, this.tokenHash(resetToken), new Date(Date.now() + grantTtl * 60_000));
    return resetToken;
  }

  async reset(resetToken: string, password: string, confirmation: string): Promise<void> {
    this.passwords.assertConfirmation(password, confirmation);
    const changed = await this.repository.resetPassword(this.tokenHash(resetToken), await this.passwords.hash(password));
    if (!changed) throw new ApplicationError('RESET_TOKEN_INVALID_OR_EXPIRED', 'The password reset session is invalid or expired.', 400);
  }

  private otpHash(email: string, otp: string): string {
    return createHmac('sha256', this.config.getOrThrow<string>('auth.refreshSecret')).update(`${email}:${otp}`).digest('hex');
  }
  private tokenHash(token: string): string { return createHash('sha256').update(token).digest('hex'); }
}
