import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Put, Query, Req, UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AuthUser } from '../../auth/types/auth-user.type';
import { ListGrammarTestsQueryDto } from '../dto/list-grammar-tests-query.dto';
import { CreateGrammarTestDto, UpdateGrammarTestDto } from '../dto/save-grammar-test.dto';
import { GrammarTestsService } from '../services/grammar-tests.service';
import { GrammarAudit } from '../types/grammar-test.type';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@ApiTags('Grammar & Vocabulary Test Management')
@ApiCookieAuth('aptimate_access_token')
@Controller('admin/grammar-tests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'TEACHER')
export class GrammarTestsController {
  constructor(private readonly tests: GrammarTestsService) {}

  @Get()
  list(@Query() query: ListGrammarTestsQueryDto, @CurrentUser() actor: AuthUser) {
    return this.tests.list(query, actor);
  }

  @Get(':id')
  get(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() actor: AuthUser) {
    return this.tests.get(id, actor);
  }

  @Post()
  create(@Body() dto: CreateGrammarTestDto, @CurrentUser() actor: AuthUser, @Req() request: Request) {
    return this.tests.create(actor, dto, this.audit(request));
  }

  @Put(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateGrammarTestDto,
    @CurrentUser() actor: AuthUser,
    @Req() request: Request,
  ) {
    return this.tests.update(id, actor, dto, this.audit(request));
  }

  @Post(':id/publish')
  publish(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() actor: AuthUser,
    @Req() request: Request,
  ) {
    return this.tests.publish(id, actor, this.audit(request));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async archive(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() actor: AuthUser,
    @Req() request: Request,
  ): Promise<void> {
    await this.tests.archive(id, actor, this.audit(request));
  }

  private audit(request: Request): GrammarAudit {
    const requestId = request.headers['x-request-id'];
    return {
      requestId: typeof requestId === 'string' && UUID_PATTERN.test(requestId) ? requestId : undefined,
      ipAddress: request.ip,
    };
  }
}

@ApiTags('Grammar & Vocabulary Tests')
@ApiCookieAuth('aptimate_access_token')
@Controller('grammar-tests')
@UseGuards(JwtAuthGuard)
export class PublishedGrammarTestsController {
  constructor(private readonly tests: GrammarTestsService) {}

  @Get()
  list(@Query() query: ListGrammarTestsQueryDto) {
    return this.tests.listPublished(query);
  }

  @Get(':id')
  get(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.tests.getPublished(id);
  }
}
