import { IsObject, IsOptional } from 'class-validator';

export class SubmitAttemptDto {
  @IsObject()
  @IsOptional()
  answers?: Record<string, unknown>;
}
