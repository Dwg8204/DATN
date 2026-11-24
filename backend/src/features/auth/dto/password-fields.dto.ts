import { STRONG_PASSWORD, PASSWORD_REQUIREMENTS } from '../services/password-policy';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class PasswordFieldsDto {
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(STRONG_PASSWORD, { message: PASSWORD_REQUIREMENTS })
  password!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  confirmPassword!: string;
}
