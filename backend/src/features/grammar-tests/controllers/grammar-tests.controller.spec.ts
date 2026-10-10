import { ROLES_KEY } from '../../auth/decorators/roles.decorator';
import { GrammarTestsController } from './grammar-tests.controller';

describe('GrammarTestsController authorization', () => {
  it('allows only administrators and teachers to manage tests', () => {
    expect(Reflect.getMetadata(ROLES_KEY, GrammarTestsController)).toEqual(['ADMIN', 'TEACHER']);
  });
});

