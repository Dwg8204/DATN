import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 10;
}

export type PaginatedResponse<T> = {
  data: T[];
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
};

export function paginate<T>(data: T[], totalItems: number, query: PaginationQueryDto): PaginatedResponse<T> {
  return {
    data,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      totalItems,
      totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize),
    },
  };
}
