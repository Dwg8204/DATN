import { ArgumentMetadata } from '@nestjs/common';
import { createValidationPipe } from '../../../common/validation/create-validation.pipe';
import { ListUsersQueryDto } from './list-users-query.dto';

describe('user management role filters', () => {
  const pipe = createValidationPipe();
  const metadata: ArgumentMetadata = { type: 'query', metatype: ListUsersQueryDto, data: '' };

  it.each(['ADMIN', 'STUDENT'])('accepts %s', async role => {
    await expect(pipe.transform({ role }, metadata)).resolves.toMatchObject({ role });
  });
  it.each(['TEACHER', 'UNKNOWN', 'USER'])('rejects unsupported role %s', async role => {
    await expect(pipe.transform({ role }, metadata)).rejects.toMatchObject({ status: 400 });
  });
});
