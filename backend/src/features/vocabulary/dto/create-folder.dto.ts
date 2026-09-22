import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateFolderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;
}
