import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination.dto';
import { GrammarTestMode, GrammarTestStatus } from '../types/grammar-test.type';
import { TestPurpose } from '../../../common/tests/test-purpose';

export class ListGrammarTestsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['EXAM', 'PRACTICE'])
  purpose?: TestPurpose;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsIn(['part1', 'part2', 'full'])
  mode?: GrammarTestMode;

  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  status?: GrammarTestStatus;
}
