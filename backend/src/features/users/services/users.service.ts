import { Injectable } from '@nestjs/common';
import { ApplicationError } from '../../../common/errors/application.error';
import { paginate, PaginatedResponse } from '../../../common/pagination/pagination.dto';
import { AuthUser } from '../../auth/types/auth-user.type';
import { PasswordService } from '../../auth/services/password.service';
import { ChangeUserRoleDto } from '../dto/change-user-role.dto';
import { CreateTeacherDto } from '../dto/create-teacher.dto';
import { ListUsersQueryDto } from '../dto/list-users-query.dto';
import { UsersRepository } from '../repositories/users.repository';
import { AuditMetadata, ManagedUserDetail, ManagedUserSummary, MutationResult } from '../types/managed-user.type';

@Injectable()
export class UsersService {
  constructor(
    private readonly repository: UsersRepository,
    private readonly passwords: PasswordService,
  ) {}

  async list(query: ListUsersQueryDto): Promise<PaginatedResponse<ManagedUserSummary>> {
    const result = await this.repository.list(query);
    return paginate(result.users, result.total, query);
  }

  async get(id: string): Promise<ManagedUserDetail> {
    const user = await this.repository.findById(id);
    if (!user) throw new ApplicationError('USER_NOT_FOUND', 'Account not found.', 404);
    return user;
  }

  async createTeacher(
    actor: AuthUser,
    dto: CreateTeacherDto,
    audit: AuditMetadata,
  ): Promise<ManagedUserSummary> {
    this.passwords.assertConfirmation(dto.password, dto.confirmPassword);
    const email = dto.email.trim().toLowerCase();
    if (await this.repository.emailExists(email)) {
      throw new ApplicationError('EMAIL_ALREADY_EXISTS', 'Email already in use.', 409);
    }

    try {
      const teacher = await this.repository.createTeacher({
        actorId: actor.id,
        email,
        passwordHash: await this.passwords.hash(dto.password),
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        audit,
      });
      if (!teacher) {
        throw new ApplicationError('TEACHER_ROLE_UNAVAILABLE', 'Teacher accounts cannot be created right now.', 500);
      }
      return teacher;
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ApplicationError('EMAIL_ALREADY_EXISTS', 'Email already in use.', 409);
      }
      throw error;
    }
  }

  async changeRole(
    actor: AuthUser,
    targetId: string,
    _dto: ChangeUserRoleDto,
    audit: AuditMetadata,
  ): Promise<ManagedUserSummary> {
    const result = await this.repository.promoteStudentToTeacher(targetId, actor.id, audit);
    return this.unwrapMutation(result);
  }

  async remove(actor: AuthUser, targetId: string, audit: AuditMetadata): Promise<void> {
    const result = await this.repository.softDelete(targetId, actor.id, audit);
    this.unwrapMutation(result);
  }

  private unwrapMutation<T>(result: MutationResult<T>): T {
    if (result.outcome === 'SUCCESS') return result.value;
    if (result.outcome === 'NOT_FOUND') {
      throw new ApplicationError('USER_NOT_FOUND', 'Account not found.', 404);
    }
    if (result.outcome === 'ADMIN_PROTECTED') {
      throw new ApplicationError('ADMIN_ACCOUNT_PROTECTED', 'Administrator accounts cannot be edited or deleted.', 403);
    }
    throw new ApplicationError(
      'ROLE_CHANGE_NOT_ALLOWED',
      'Only student accounts can be promoted to teacher.',
      409,
    );
  }

  private isUniqueViolation(error: unknown): boolean {
    return typeof error === 'object' && error !== null &&
      'driverError' in error &&
      (error as { driverError?: { code?: string } }).driverError?.code === '23505';
  }
}
