import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Buffer } from 'node:buffer';
import { compare, hash } from 'bcryptjs';
import { ApplicationError } from '../../../common/errors/application.error';

@Injectable()
export class PasswordService {
  constructor(private readonly config: ConfigService) {}

  hash(password: string): Promise<string> {
    this.assertByteLength(password);
    return hash(password, this.config.get<number>('auth.passwordHashRounds', 12));
  }

  verify(password: string, passwordHash: string): Promise<boolean> {
    return compare(password, passwordHash);
  }

  assertConfirmation(password: string, confirmation: string): void {
    if (password !== confirmation) throw new ApplicationError('PASSWORD_MISMATCH', 'Passwords do not match.', 400);
    if (!password.trim()) throw new ApplicationError('INVALID_PASSWORD', 'Password cannot contain only spaces.', 400);
    this.assertByteLength(password);
  }

  private assertByteLength(password: string): void {
    if (Buffer.byteLength(password, 'utf8') > 72) {
      throw new ApplicationError('PASSWORD_TOO_LONG', 'Password must not exceed 72 bytes in UTF-8.', 400);
    }
  }
}
