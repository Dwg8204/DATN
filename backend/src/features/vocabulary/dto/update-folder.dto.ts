import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateFolderDto {
  @IsString()
  @IsOptional()
  @MaxLength(40)
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
