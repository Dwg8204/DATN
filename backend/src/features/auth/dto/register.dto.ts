import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { PasswordFieldsDto } from './password-fields.dto';

export class RegisterDto extends PasswordFieldsDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName!: string;

  @IsEmail()
  @MaxLength(320)
  email!: string;
}
