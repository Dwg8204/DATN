import { AuthUser } from '../../auth/types/auth-user.type';
import { PasswordService } from '../../auth/services/password.service';
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
  const teacher: ManagedUserSummary = { ...student, role: 'TEACHER' };

  let repository: jest.Mocked<UsersRepository>;
  let passwords: jest.Mocked<PasswordService>;
  let service: UsersService;

  beforeEach(() => {
    repository = {
      list: jest.fn(),
      findById: jest.fn(),
      emailExists: jest.fn(),
      createTeacher: jest.fn(),
      promoteStudentToTeacher: jest.fn(),
      softDelete: jest.fn(),
    } as unknown as jest.Mocked<UsersRepository>;
    passwords = {
      assertConfirmation: jest.fn(),
      hash: jest.fn().mockResolvedValue('hashed-password'),
    } as unknown as jest.Mocked<PasswordService>;
    service = new UsersService(repository, passwords);
  });

  it('returns the shared pagination contract', async () => {
    repository.list.mockResolvedValue({ users: [student], total: 11 });

    await expect(service.list({ page: 2, pageSize: 5, role: 'STUDENT' })).resolves.toEqual({
      data: [student],
      pagination: { page: 2, pageSize: 5, totalItems: 11, totalPages: 3 },
    });
  });

  it('creates an active teacher without accepting a client-selected role', async () => {
    repository.emailExists.mockResolvedValue(false);
    repository.createTeacher.mockResolvedValue(teacher);

    await expect(service.createTeacher(actor, {
      firstName: ' Apti ',
      lastName: ' Teacher ',
      email: 'TEACHER@APTIMATE.TEST ',
      password: 'StrongPassword123!',
      confirmPassword: 'StrongPassword123!',
    }, {})).resolves.toEqual(teacher);

    expect(repository.createTeacher).toHaveBeenCalledWith(expect.objectContaining({
      actorId: actor.id,
      email: 'teacher@aptimate.test',
      firstName: 'Apti',
      lastName: 'Teacher',
      passwordHash: 'hashed-password',
    }));
  });

  it('returns a stable conflict error when the email already exists', async () => {
    repository.emailExists.mockResolvedValue(true);

    await expect(service.createTeacher(actor, {
      firstName: 'Apti', lastName: 'Teacher', email: 'teacher@aptimate.test',
      password: 'StrongPassword123!', confirmPassword: 'StrongPassword123!',
    }, {})).rejects.toMatchObject({ code: 'EMAIL_ALREADY_EXISTS', statusCode: 409 });
    expect(repository.createTeacher).not.toHaveBeenCalled();
  });

  it('allows only the student to teacher transition', async () => {
    repository.promoteStudentToTeacher.mockResolvedValue({ outcome: 'SUCCESS', value: teacher });

    await expect(service.changeRole(actor, student.id, { role: 'TEACHER' }, {})).resolves.toEqual(teacher);
    expect(repository.promoteStudentToTeacher).toHaveBeenCalledWith(student.id, actor.id, {});
  });

  it('rejects a teacher to admin transition with a stable business error', async () => {
    repository.promoteStudentToTeacher.mockResolvedValue({ outcome: 'INVALID_ROLE_TRANSITION' });

    await expect(service.changeRole(actor, student.id, { role: 'TEACHER' }, {}))
      .rejects.toMatchObject({ code: 'ROLE_CHANGE_NOT_ALLOWED', statusCode: 409 });
  });

  it('does not allow an administrator account to be deleted', async () => {
    repository.softDelete.mockResolvedValue({ outcome: 'ADMIN_PROTECTED' });

    await expect(service.remove(actor, actor.id, {}))
      .rejects.toMatchObject({ code: 'ADMIN_ACCOUNT_PROTECTED', statusCode: 403 });
  });
});
