import { STRONG_PASSWORD, PASSWORD_REQUIREMENTS } from '../services/password-policy';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(1, { message: 'Enter your current password.' })
  @MaxLength(128)
  currentPassword!: string;

  @IsString()
  @Matches(STRONG_PASSWORD, { message: PASSWORD_REQUIREMENTS })
  newPassword!: string;

  @IsString()
  @MinLength(1, { message: 'Confirm your new password.' })
  @MaxLength(128)
  confirmPassword!: string;
}
