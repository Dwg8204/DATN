import { BadRequestException } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsEmail, IsString, ValidateNested } from 'class-validator';
import { RegisterDto } from '../../features/auth/dto/register.dto';
import { VerifyPasswordOtpDto } from '../../features/auth/dto/forgot-password.dto';
import { createValidationPipe } from './create-validation.pipe';

class ContactDto {
  @IsEmail()
  email!: string;
}
class NestedDto {
  @ValidateNested()
  @Type(() => ContactDto)
  contact!: ContactDto;

  @IsString()
  name!: string;
}

describe('createValidationPipe', () => {
  it('returns every invalid field separately and uses a readable first message', async () => {
    try {
      await createValidationPipe().transform({ firstName: '', lastName: 'Test', email: 'invalid', password: 'short', confirmPassword: 'short' }, { type: 'body', metatype: RegisterDto });
      throw new Error('Expected validation failure');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as { code: string; message: string; fieldErrors: { field: string; message: string }[] };
      expect(response.code).toBe('VALIDATION_ERROR');
      expect(response.fieldErrors.map(field => field.field)).toEqual(expect.arrayContaining(['firstName', 'email', 'password']));
      expect(response.message).toBe(response.fieldErrors[0].message);
      expect(response.message).toMatch(/^First name/);
      expect(response).not.toHaveProperty('target');
    }
  });

  it('keeps nested paths so clients can locate the input rather than guessing from text', async () => {
    await expect(createValidationPipe().transform({ name: 'Test', contact: { email: 'bad' } }, { type: 'body', metatype: NestedDto })).rejects.toMatchObject({
      response: { fieldErrors: [expect.objectContaining({ field: 'contact.email' })] },
    });
  });

  it('explains the OTP format without displaying a regular expression', async () => {
    await expect(createValidationPipe().transform({ email: 'test@example.com', otp: '12' }, { type: 'body', metatype: VerifyPasswordOtpDto })).rejects.toMatchObject({
      response: { message: 'Enter the 6-digit verification code from your email.' },
    });
  });

  it('rejects unexpected fields without echoing their values', async () => {
    await expect(createValidationPipe().transform({ email: 'test@example.com', otp: '123456', secret: 'private' }, { type: 'body', metatype: VerifyPasswordOtpDto })).rejects.toMatchObject({
      response: { fieldErrors: [expect.objectContaining({ field: 'secret', message: 'Secret is not an accepted field.' })] },
    });
  });
});
