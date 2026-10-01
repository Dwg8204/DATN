import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AuthUser } from '../../auth/types/auth-user.type';
import { ListReadingTestsQueryDto } from '../dto/list-reading-tests-query.dto';
import { CreateReadingTestDto, PublishReadingTestDto, UpdateReadingTestDto } from '../dto/save-reading-test.dto';
import { ReadingTestsService } from '../services/reading-tests.service';

@Controller('reading-tests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'TEACHER')
export class ReadingTestsController {
  constructor(private readonly tests: ReadingTestsService) {}
  @Get() list(@Query() query: ListReadingTestsQueryDto, @CurrentUser() user: AuthUser) { return this.tests.list(query, user); }
  @Post() create(@Body() dto: CreateReadingTestDto, @CurrentUser() user: AuthUser, @Req() request: Request) {
    return this.tests.create(dto, user, { ipAddress: request.ip });
  }
  @Get(':id') get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) { return this.tests.getOne(id, user); }
  @Patch(':id') update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateReadingTestDto,
    @CurrentUser() user: AuthUser, @Req() request: Request) { return this.tests.update(id, dto, user, { ipAddress: request.ip }); }
  @Post(':id/publish') @HttpCode(200) publish(@Param('id', ParseUUIDPipe) id: string, @Body() dto: PublishReadingTestDto,
    @CurrentUser() user: AuthUser, @Req() request: Request) { return this.tests.publish(id, dto, user, { ipAddress: request.ip }); }
  @Delete(':id') @HttpCode(204) archive(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser, @Req() request: Request) {
    return this.tests.archive(id, user, { ipAddress: request.ip });
  }
}

@Controller('reading-tests/published')
export class PublishedReadingTestsController {
  constructor(private readonly tests: ReadingTestsService) {}
  @Get() list(@Query() query: ListReadingTestsQueryDto) { return this.tests.listPublished(query); }
  @Get(':id') get(@Param('id', ParseUUIDPipe) id: string) { return this.tests.getPublished(id); }
}
