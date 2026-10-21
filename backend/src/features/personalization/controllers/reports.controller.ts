import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AuthUser } from '../../auth/types/auth-user.type';
import { ReportsService } from '../services/reports.service';

export class ReportsQuery {
  @IsOptional() @IsUUID() goalId?: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(10000) page = 1;
}

@Controller('me/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STUDENT')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}
  @Get() list(@CurrentUser() actor: AuthUser, @Query() query: ReportsQuery) {
    return this.reports.list(actor.id, query.goalId, query.page);
  }
  @Get(':id') read(@CurrentUser() actor: AuthUser, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.reports.read(actor.id, id);
  }
}
