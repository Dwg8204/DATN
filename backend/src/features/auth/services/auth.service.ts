import { Injectable } from '@nestjs/common';
import { ApplicationError } from '../../../common/errors/application.error';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { AuthRepository } from '../repositories/auth.repository';
import { AuthUser } from '../types/auth-user.type';
import { PasswordService } from './password.service';
import { ClientMetadata, TokenPair, TokenService } from './token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly repository: AuthRepository, private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
  ) {}

  async register(dto: RegisterDto, metadata: ClientMetadata): Promise<{ user: AuthUser; tokens: TokenPair }> {
    this.passwords.assertConfirmation(dto.password, dto.confirmPassword);
    const email = dto.email.trim().toLowerCase();
    if (await this.repository.findCredentialByEmail(email)) throw new ApplicationError('EMAIL_ALREADY_EXISTS', 'Email already in use.', 409);
    const user = await this.repository.createStudent({
      email, passwordHash: await this.passwords.hash(dto.password),
      firstName: dto.firstName.trim(), lastName: dto.lastName.trim(),
    });
    return { user, tokens: await this.tokens.issue(user, metadata) };
  }

  async login(dto: LoginDto, metadata: ClientMetadata): Promise<{ user: AuthUser; tokens: TokenPair }> {
    const user = await this.repository.findCredentialByEmail(dto.email.trim().toLowerCase());
    if (!user || !(await this.passwords.verify(dto.password, user.passwordHash))) {
      throw new ApplicationError('INVALID_CREDENTIALS', 'Invalid email or password.', 401);
    }
    if (user.status === 'BANNED') throw new ApplicationError('ACCOUNT_BANNED', 'This account has been locked.', 403);
    if (user.status !== 'ACTIVE') throw new ApplicationError('ACCOUNT_INACTIVE', 'This account is not active.', 403);
    await this.repository.updateLastLogin(user.id);
    const publicUser: AuthUser = {
      id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName,
      role: user.role, status: user.status,
    };
    return { user: publicUser, tokens: await this.tokens.issue(publicUser, metadata) };
  }

  async changePassword(user: AuthUser, dto: ChangePasswordDto): Promise<void> {
    this.passwords.assertConfirmation(dto.newPassword, dto.confirmPassword);
    if (dto.currentPassword === dto.newPassword) throw new ApplicationError('PASSWORD_UNCHANGED', 'New password must be different from the current password.', 400);
    const credential = await this.repository.findCredentialByEmail(user.email);
    if (!credential || !(await this.passwords.verify(dto.currentPassword, credential.passwordHash))) {
      throw new ApplicationError('CURRENT_PASSWORD_INCORRECT', 'Current password is incorrect.', 400);
    }
    await this.repository.changePassword(user.id, await this.passwords.hash(dto.newPassword));
  }
}
