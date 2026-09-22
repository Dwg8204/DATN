import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class SubmitDictationAttemptDto {
  @IsUUID()
  @IsNotEmpty()
  exerciseId!: string;

  @IsString()
  @IsNotEmpty()
  typedText!: string;

  @IsBoolean()
  @IsOptional()
  hintUsed?: boolean = false;

  @IsNumber()
  @Min(0.1)
  @IsOptional()
  playbackRate?: number = 1.0;

  @IsNumber()
  @Min(0)
  @IsOptional()
  playbackCount?: number = 1;
}
