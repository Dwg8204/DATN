import {
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateQuestionDto {
  @IsUUID()
  @IsNotEmpty()
  testId!: string;

  @IsInt()
  @Min(1)
  @Max(4)
  partNumber!: number;

  @IsInt()
  @Min(1)
  position!: number;

  @IsString()
  @IsNotEmpty()
  questionType!: string; // 'GAP_FILLING' | 'TEXT_COHESION' | 'OPINION_MATCHING' | 'MATCHING_HEADINGS'

  @IsObject()
  @IsNotEmpty()
  content!: Record<string, unknown>;

  @IsObject()
  @IsNotEmpty()
  correctAnswer!: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  explanation?: Record<string, unknown>;
}
