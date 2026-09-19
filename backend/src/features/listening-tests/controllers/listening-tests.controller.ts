import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Put, Query, Req, UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AuthUser } from '../../auth/types/auth-user.type';
import { ListListeningTestsQueryDto } from '../dto/list-listening-tests-query.dto';
import { SubmitListeningAttemptDto } from '../dto/submit-listening-attempt.dto';
import { CreateListeningTestDto, UpdateListeningTestDto, PublishListeningTestDto } from '../dto/save-listening-test.dto';
import { ListeningTestsService } from '../services/listening-tests.service';
import { ListeningAttemptService } from '../services/listening-attempt.service';
import { ListeningAudit } from '../types/listening-test.type';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@ApiTags('Listening Test Management')
@ApiCookieAuth('aptimate_access_token')
@Controller('admin/listening-tests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'TEACHER')
export class ListeningTestsController {
  constructor(private readonly tests: ListeningTestsService) {}

  @Get()
  list(@Query() query: ListListeningTestsQueryDto, @CurrentUser() actor: AuthUser) {
    return this.tests.list(query, actor);
  }

  @Get(':id')
  get(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() actor: AuthUser) {
    return this.tests.get(id, actor);
  }

  @Post()
  create(@Body() dto: CreateListeningTestDto, @CurrentUser() actor: AuthUser, @Req() request: Request) {
    return this.tests.create(actor, dto, this.audit(request));
  }

  @Put(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateListeningTestDto,
    @CurrentUser() actor: AuthUser,
    @Req() request: Request,
  ) {
    return this.tests.update(id, actor, dto, this.audit(request));
  }

  @Post(':id/publish')
  publish(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: PublishListeningTestDto,
    @CurrentUser() actor: AuthUser,
    @Req() request: Request,
  ) {
    return this.tests.publish(id, actor, dto, this.audit(request));
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

  private audit(request: Request): ListeningAudit {
    const requestId = request.headers['x-request-id'];
    return {
      requestId: typeof requestId === 'string' && UUID_PATTERN.test(requestId) ? requestId : undefined,
      ipAddress: request.ip,
    };
  }
}

@ApiTags('Listening Tests')
@ApiCookieAuth('aptimate_access_token')
@Controller('listening-tests')
@UseGuards(JwtAuthGuard)
export class PublishedListeningTestsController {
  constructor(
    private readonly tests: ListeningTestsService,
    private readonly attempts: ListeningAttemptService
  ) {}

  @ApiOperation({ summary: 'Lấy danh sách đề thi (Published)' })
  @Get()
  list(@Query() query: ListListeningTestsQueryDto) {
    return this.tests.listPublished(query);
  }

  @ApiOperation({ summary: 'Lấy chi tiết đề thi (Published)' })
  @ApiParam({ name: 'id', description: 'ID của bài Listening' })
  @Get(':id')
  get(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.tests.getPublished(id);
  }

  @ApiOperation({ summary: 'Bắt đầu một phiên làm bài' })
  @ApiParam({ name: 'id', description: 'ID của bài Listening' })
  @ApiQuery({ name: 'mode', required: false, description: 'Chế độ thi (VD: full, part1, part2,...)' })
  @Post(':id/attempts')
  startAttempt(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('mode') mode: string,
    @CurrentUser() actor: AuthUser
  ) {
    return this.attempts.startAttempt(id, mode || 'full', actor);
  }

  @ApiOperation({ summary: 'Nộp bài và chấm điểm' })
  @ApiParam({ name: 'id', description: 'ID của bài Listening' })
  @ApiParam({ name: 'attemptId', description: 'ID của phiên làm bài' })
  @Post(':id/attempts/:attemptId/submit')
  submitAttempt(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SubmitListeningAttemptDto,
    @CurrentUser() actor: AuthUser
  ) {
    return this.attempts.submitAttempt(id, actor, dto);
  }
}
