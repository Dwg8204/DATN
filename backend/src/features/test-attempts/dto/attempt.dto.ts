import { IsIn, IsObject, IsOptional, IsUUID, IsInt, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../../common/pagination/pagination.dto';
import { Answer } from '../types/attempt.type';

export class StartAttemptDto {
  @IsUUID()
  testId!: string;

  @IsUUID()
  attemptId!: string;

  @IsOptional()
  @IsIn(['part1', 'part2', 'part3', 'part4', 'full'])
  mode?: string;
}

export class SaveProgressDto {
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  expectedRevision!: number;

  @IsObject()
  changes!: Record<string, Answer | null>;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  currentQuestionKey?: string;
}

export class SubmitAttemptDto {
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  expectedRevision!: number;

  @IsOptional()
  @IsObject()
  finalChanges?: Record<string, Answer | null>;
}

export class AttemptHistoryQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Type(() => String)
  @IsIn(['GRAMMAR_VOCAB', 'READING', 'LISTENING', 'WRITING', 'SPEAKING'])
  component?: string;

  @IsOptional()
  @IsIn(['part1', 'part2', 'part3', 'part4', 'full'])
  mode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sort = 'desc';
}

export class AttemptStatesQueryDto {
  @IsString()
  @MaxLength(3_700)
  testIds!: string;
}
