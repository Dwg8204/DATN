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

  it('rejects passwords whose UTF-8 encoding exceeds bcrypt\'s limit', () => {
    const password = 'é'.repeat(37);
    expect(() => service.assertConfirmation(password, password)).toThrow('72 bytes');
  });
});
