import { IsIn, IsOptional } from 'class-validator';

export class StudentDashboardQueryDto {
  @IsOptional()
  @IsIn(['all', 'listening', 'reading', 'writing', 'speaking', 'grammar'])
  skill = 'all';

  @IsOptional()
  @IsIn(['all', 'full', 'part1', 'part2', 'part3', 'part4'])
  part = 'all';

  @IsOptional()
  @IsIn(['all', '7', '30', '90'])
  range = 'all';
}
