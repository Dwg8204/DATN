import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination.dto';
import { RoleCode } from '../../auth/types/auth-user.type';
import { AccountStatus } from '../types/managed-user.type';

export class ListUsersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['ADMIN', 'TEACHER', 'STUDENT'])
  role?: RoleCode;

  @IsOptional()
  @IsIn(['INACTIVE', 'ACTIVE', 'BANNED'])
  status?: AccountStatus;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MaxLength(100)
  search?: string;
}
