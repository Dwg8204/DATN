import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AuthUser } from '../../auth/types/auth-user.type';
import { CreateSpeakingTestDto, PublishSpeakingTestDto, UpdateSpeakingTestDto } from '../dto/save-speaking-test.dto';
import { ListSpeakingTestsQueryDto } from '../dto/list-speaking-tests-query.dto';
import { SpeakingTestsService } from '../services/speaking-tests.service';
import { SpeakingAudit } from '../types/speaking-test.type';

const ACCESS_COOKIE = 'aptimate_access_token';

@ApiTags('Speaking Tests')
@ApiCookieAuth(ACCESS_COOKIE)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('speaking-tests')
export class SpeakingTestsController {
  constructor(private readonly testsService: SpeakingTestsService) {}

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Lấy danh sách đề thi Speaking' })
  async list(@Query() query: ListSpeakingTestsQueryDto, @CurrentUser() actor: AuthUser) {
    return this.testsService.list(query, actor);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Tạo mới một đề thi Speaking' })
  async create(@Body() dto: CreateSpeakingTestDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    const audit: SpeakingAudit = { ipAddress: req.ip };
    return this.testsService.create(dto, { id: user.id, role: user.role }, audit);
  }

  @Get(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Lấy chi tiết một đề thi Speaking (draft hoặc published)' })
  async getOne(@Param('id') id: string) {
    return this.testsService.getOne(id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Cập nhật đề thi Speaking (reset status về DRAFT)' })
  async update(@Param('id') id: string, @Body() dto: UpdateSpeakingTestDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    const audit: SpeakingAudit = { ipAddress: req.ip };
    return this.testsService.update(id, dto, { id: user.id, role: user.role }, audit);
  }

  @Post(':id/publish')
  @HttpCode(200)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Xuất bản (publish) đề thi Speaking' })
  async publish(@Param('id') id: string, @Body() dto: PublishSpeakingTestDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    const audit: SpeakingAudit = { ipAddress: req.ip };
    return this.testsService.publish(id, dto, { id: user.id, role: user.role }, audit);
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Lưu trữ (archive) đề thi Speaking' })
  async archive(@Param('id') id: string, @CurrentUser() user: AuthUser, @Req() req: Request) {
    const audit: SpeakingAudit = { ipAddress: req.ip };
    return this.testsService.archive(id, { id: user.id, role: user.role }, audit);
  }
}

@ApiTags('Speaking Tests (Learner)')
@Controller('speaking-tests/published')
export class PublishedSpeakingTestsController {
  constructor(private readonly testsService: SpeakingTestsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách đề thi Speaking đã xuất bản' })
  async listPublished(@Query() query: ListSpeakingTestsQueryDto) {
    return this.testsService.listPublished(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy đề thi Speaking đã xuất bản để làm bài' })
  async getPublished(@Param('id') id: string) {
    return this.testsService.getPublished(id);
  }
}
