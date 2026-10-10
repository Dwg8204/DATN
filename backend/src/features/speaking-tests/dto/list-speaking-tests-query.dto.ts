import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { SpeakingTestStatus } from '../types/speaking-test.type';
import { TestPurpose } from '../../../common/tests/test-purpose';

export class ListSpeakingTestsQueryDto {
  @IsOptional()
  @IsIn(['EXAM', 'PRACTICE'])
  purpose?: TestPurpose;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['part1', 'part2', 'part3', 'part4', 'full'])
  mode?: string;

  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  status?: SpeakingTestStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 10;
}
