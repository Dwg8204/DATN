import { ArgumentMetadata } from '@nestjs/common';
import { createValidationPipe } from '../../../common/validation/create-validation.pipe';
import { ChangeUserRoleDto } from './change-user-role.dto';
import { CreateTeacherDto } from './create-teacher.dto';

describe('user management DTO validation', () => {
  const pipe = createValidationPipe();
  const bodyMetadata = <T>(metatype: new () => T): ArgumentMetadata => ({
    type: 'body',
    metatype,
    data: '',
  });
  const validTeacher = {
    firstName: 'Apti',
    lastName: 'Teacher',
    email: 'teacher@aptimate.test',
    password: 'StrongPassword123!',
    confirmPassword: 'StrongPassword123!',
  };

  it.each(['role', 'status'])('rejects %s overposting when creating a teacher', async field => {
    await expect(pipe.transform(
      { ...validTeacher, [field]: field === 'role' ? 'ADMIN' : 'ACTIVE' },
      bodyMetadata(CreateTeacherDto),
    )).rejects.toMatchObject({ status: 400 });
  });

  it('accepts only TEACHER as a role change target', async () => {
    await expect(pipe.transform({ role: 'TEACHER' }, bodyMetadata(ChangeUserRoleDto)))
      .resolves.toMatchObject({ role: 'TEACHER' });
    await expect(pipe.transform({ role: 'ADMIN' }, bodyMetadata(ChangeUserRoleDto)))
      .rejects.toMatchObject({ status: 400 });
  });
});
