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
  @Matches(/^(?=.*\S).{8,128}$/, { message: 'New password must contain 8–128 characters and cannot contain only spaces.' })
  newPassword!: string;

  @IsString()
  @MinLength(1, { message: 'Confirm your new password.' })
  @MaxLength(128)
  confirmPassword!: string;
}
