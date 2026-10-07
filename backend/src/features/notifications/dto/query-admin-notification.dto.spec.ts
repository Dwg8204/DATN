import { QueryAdminNotificationDto } from './query-admin-notification.dto';
import { createValidationPipe } from '../../../common/validation/create-validation.pipe';

describe('Notification history search query', () => {
  const pipe = createValidationPipe();
  const parse = (value: unknown) => pipe.transform(value, { type: 'query', metatype: QueryAdminNotificationDto });

  it('accepts and trims search while transforming pagination', async () => {
    const result = await parse({ search: '  Đi làm  ', page: '2', pageSize: '8' });
    expect(result).toMatchObject({ search: 'Đi làm', page: 2, pageSize: 8 });
  });

  it('accepts empty search', async () => {
    expect(await parse({ search: '  ' })).toMatchObject({ search: '', page: 1, pageSize: 10 });
  });

  it('rejects invalid or excessively long search values', async () => {
    await expect(parse({ search: ['one', 'two'] })).rejects.toThrow();
    await expect(parse({ search: 'x'.repeat(201) })).rejects.toThrow();
  });
});
