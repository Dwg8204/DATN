import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination.dto';
import { WritingTestMode, WritingTestStatus } from '../types/writing-test.type';

export class ListWritingTestsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsIn(['part1', 'part2', 'part3', 'part4', 'full'])
  mode?: WritingTestMode;

  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  status?: WritingTestStatus;
}

