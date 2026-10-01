import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthUser } from '../../auth/types/auth-user.type';
import { ReadingTestsService } from '../services/reading-tests.service';
import { CreateReadingTestDto } from '../dto/create-reading-test.dto';
import { UpdateReadingTestDto } from '../dto/update-reading-test.dto';
import { QueryReadingTestDto } from '../dto/query-reading-test.dto';
import { CreateQuestionDto } from '../dto/create-question.dto';

@Controller('admin/reading/tests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'TEACHER')
export class AdminReadingTestsController {
  constructor(private readonly testsService: ReadingTestsService) {}

  @Get()
  async listTests(@Query() query: QueryReadingTestDto) {
    return this.testsService.listTests(query);
  }

  @Post()
  async createTest(@CurrentUser() user: AuthUser, @Body() dto: CreateReadingTestDto) {
    const data = await this.testsService.createTest(user.id, dto);
    return { data };
  }

  @Get(':id')
  async getTestDetail(@Param('id') id: string) {
    const data = await this.testsService.getTestDetail(id);
    return { data };
  }

  @Put(':id')
  async updateTest(@Param('id') id: string, @Body() dto: UpdateReadingTestDto) {
    const data = await this.testsService.updateTest(id, dto);
    return { data };
  }

  @Post(':id/questions')
  async addQuestion(@Param('id') id: string, @Body() dto: CreateQuestionDto) {
    dto.testId = id;
    const data = await this.testsService.addQuestion(dto);
    return { data };
  }

  @Post(':id/publish')
  async publishSnapshot(@Param('id') id: string) {
    const data = await this.testsService.publishSnapshot(id);
    return { data };
  }
}
