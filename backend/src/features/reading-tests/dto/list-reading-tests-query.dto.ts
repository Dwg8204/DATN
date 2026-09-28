import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { TestPurpose } from '../../../common/tests/test-purpose';

export class ListReadingTestsQueryDto {
  @IsOptional() @IsIn(['EXAM', 'PRACTICE']) purpose?: TestPurpose;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsIn(['part1', 'part2', 'part3', 'part4', 'full']) mode?: string;
  @IsOptional() @IsIn(['DRAFT', 'PUBLISHED', 'ARCHIVED']) status?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 10;
}
