import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AuthUser } from '../../auth/types/auth-user.type';
import { ChangeUserRoleDto } from '../dto/change-user-role.dto';
import { CreateTeacherDto } from '../dto/create-teacher.dto';
import { ListUsersQueryDto } from '../dto/list-users-query.dto';
import { UsersService } from '../services/users.service';
import { AuditMetadata } from '../types/managed-user.type';

const ACCESS_COOKIE = 'aptimate_access_token';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@ApiTags('User Management')
@ApiCookieAuth(ACCESS_COOKIE)
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@Query() query: ListUsersQueryDto) {
    return this.users.list(query);
  }

  @Get(':id')
  get(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.users.get(id);
  }

  @Post()
  createTeacher(
    @CurrentUser() actor: AuthUser,
    @Body() dto: CreateTeacherDto,
    @Req() request: Request,
  ) {
    return this.users.createTeacher(actor, dto, this.auditMetadata(request));
  }

  @Patch(':id/role')
  changeRole(
    @CurrentUser() actor: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ChangeUserRoleDto,
    @Req() request: Request,
  ) {
    return this.users.changeRole(actor, id, dto, this.auditMetadata(request));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() actor: AuthUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() request: Request,
  ): Promise<void> {
    await this.users.remove(actor, id, this.auditMetadata(request));
  }

  private auditMetadata(request: Request): AuditMetadata {
    const rawRequestId = request.headers['x-request-id'];
    const requestId = typeof rawRequestId === 'string' && UUID_PATTERN.test(rawRequestId)
      ? rawRequestId
      : undefined;
    return { requestId, ipAddress: request.ip };
  }
}
