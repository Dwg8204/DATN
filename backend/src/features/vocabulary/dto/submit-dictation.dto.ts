import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class SubmitDictationAttemptDto {
  @IsUUID()
  @IsNotEmpty()
  exerciseId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  typedText!: string;

  @IsOptional()
  @IsUUID()
  clientEventId?: string;

  @IsBoolean()
  @IsOptional()
  hintUsed?: boolean = false;

  @IsNumber()
  @Min(0.1)
  @Max(3)
  @IsOptional()
  playbackRate?: number = 1.0;

  @IsInt()
  @Min(0)
  @IsOptional()
  playbackCount?: number = 1;
}
