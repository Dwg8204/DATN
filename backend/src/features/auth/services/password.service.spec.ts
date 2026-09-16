import { ConfigService } from '@nestjs/config';
import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService(new ConfigService({ auth: { passwordHashRounds: 10 } }));

  it('hashes and verifies a password without storing plaintext', async () => {
    const password = 'StrongPassword123!';
    const passwordHash = await service.hash(password);
    expect(passwordHash).not.toBe(password);
    await expect(service.verify(password, passwordHash)).resolves.toBe(true);
    await expect(service.verify('incorrect', passwordHash)).resolves.toBe(false);
  });

  it('rejects mismatched confirmation', () => {
    expect(() => service.assertConfirmation('StrongPassword123!', 'DifferentPassword123!')).toThrow('Passwords do not match.');
  });
});
