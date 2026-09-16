import { ROLES_KEY } from '../../auth/decorators/roles.decorator';
import { UsersController } from './users.controller';

describe('UsersController authorization', () => {
  it('requires the ADMIN role for the entire controller', () => {
    expect(Reflect.getMetadata(ROLES_KEY, UsersController)).toEqual(['ADMIN']);
  });
});
