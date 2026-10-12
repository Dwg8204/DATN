import { ArrayMaxSize, IsArray, IsIn, IsObject, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { Answer } from '../types/attempt.type';

export class StartPracticeAttemptDto {
  @IsOptional()
  @IsIn(['vi', 'en'])
  feedbackLocale?: 'vi' | 'en';
  @IsUUID()
  testId!: string;

  @IsUUID()
  attemptId!: string;

  @IsOptional()
  @Matches(/^(part[1-4]|full)$/)
  mode?: string;
}

export class RevealPracticeAnswerDto {
  @IsString()
  @MaxLength(80)
  key!: string;
}

export class CompletePracticeAttemptDto {
  @IsOptional()
  @IsIn(['vi', 'en'])
  feedbackLocale?: 'vi' | 'en';
  @IsObject()
  answers!: Record<string, Answer | null>;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(150)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  revealedKeys: string[] = [];
}
