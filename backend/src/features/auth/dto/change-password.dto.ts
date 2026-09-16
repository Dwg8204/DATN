import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(1, { message: 'Enter your current password.' })
  @MaxLength(128)
  currentPassword!: string;

  @IsString()
  @Matches(/^(?=.*\S).{8,128}$/, { message: 'New password must contain 8–128 characters and cannot contain only spaces.' })
  newPassword!: string;

  @IsString()
  @MinLength(1, { message: 'Confirm your new password.' })
  @MaxLength(128)
  confirmPassword!: string;
}
