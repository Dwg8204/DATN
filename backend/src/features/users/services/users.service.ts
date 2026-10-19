import { Injectable } from '@nestjs/common';
import { ApplicationError } from '../../../common/errors/application.error';
import { paginate, PaginatedResponse } from '../../../common/pagination/pagination.dto';
import { AuthUser } from '../../auth/types/auth-user.type';
import { ListUsersQueryDto } from '../dto/list-users-query.dto';
import { UsersRepository } from '../repositories/users.repository';
import { AuditMetadata, ManagedUserDetail, ManagedUserSummary, MutationResult } from '../types/managed-user.type';

@Injectable()
export class UsersService {
  constructor(
    private readonly repository: UsersRepository,
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
    throw new ApplicationError('INTERNAL_SERVER_ERROR', 'Unknown user mutation outcome.', 500);
  }

}
