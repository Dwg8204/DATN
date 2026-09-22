import { IsObject, IsOptional } from 'class-validator';

export class SaveProgressDto {
  @IsObject()
  @IsOptional()
  answers?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  progress?: Record<string, unknown>;
}
