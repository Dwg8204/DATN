import { STRONG_PASSWORD, PASSWORD_REQUIREMENTS } from '../services/password-policy';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RequestPasswordOtpDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;
}

export class VerifyPasswordOtpDto extends RequestPasswordOtpDto {
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Enter the 6-digit verification code from your email.' })
  otp!: string;
}

export class ResetPasswordDto {
  @IsString()
  @Matches(STRONG_PASSWORD, { message: PASSWORD_REQUIREMENTS })
  newPassword!: string;

  @IsString()
  @MinLength(1, { message: 'Confirm your new password.' })
  @MaxLength(128)
  confirmPassword!: string;
}
