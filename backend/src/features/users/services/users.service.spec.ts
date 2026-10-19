import { AuthUser } from '../../auth/types/auth-user.type';
import { UsersRepository } from '../repositories/users.repository';
import { ManagedUserSummary } from '../types/managed-user.type';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const actor: AuthUser = {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    email: 'admin@aptimate.test',
    firstName: 'System',
    lastName: 'Admin',
    role: 'ADMIN',
    status: 'ACTIVE',
  };
  const student: ManagedUserSummary = {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    email: 'learner@aptimate.test',
    firstName: 'Apti',
    lastName: 'Learner',
    fullName: 'Apti Learner',
    role: 'STUDENT',
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    lastLoginAt: null,
  };

  let repository: jest.Mocked<UsersRepository>;
  let service: UsersService;

  beforeEach(() => {
    repository = {
      list: jest.fn(),
      findById: jest.fn(),
      softDelete: jest.fn(),
    } as unknown as jest.Mocked<UsersRepository>;
    service = new UsersService(repository);
  });

  it('returns the shared pagination contract', async () => {
    repository.list.mockResolvedValue({ users: [student], total: 11 });

    await expect(service.list({ page: 2, pageSize: 5, role: 'STUDENT' })).resolves.toEqual({
      data: [student],
      pagination: { page: 2, pageSize: 5, totalItems: 11, totalPages: 3 },
    });
  });

  it('does not allow an administrator account to be deleted', async () => {
    repository.softDelete.mockResolvedValue({ outcome: 'ADMIN_PROTECTED' });

    await expect(service.remove(actor, actor.id, {}))
      .rejects.toMatchObject({ code: 'ADMIN_ACCOUNT_PROTECTED', statusCode: 403 });
  });
});
