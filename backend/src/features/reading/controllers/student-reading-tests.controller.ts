import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ReadingTestsService } from '../services/reading-tests.service';
import { QueryReadingTestDto, PublicationStatus } from '../dto/query-reading-test.dto';

@Controller('reading/tests')
@UseGuards(JwtAuthGuard)
export class StudentReadingTestsController {
  constructor(private readonly testsService: ReadingTestsService) {}

  @Get()
  async getPublishedTests(@Query() query: QueryReadingTestDto) {
    query.status = PublicationStatus.PUBLISHED;
    return this.testsService.listTests(query);
  }

  @Get(':id/intro')
  async getTestIntro(@Param('id') id: string) {
    const data = await this.testsService.getTestDetail(id);
    return {
      data: {
        test: data.test,
        totalQuestions: data.questions.length,
      },
    };
  }
}
