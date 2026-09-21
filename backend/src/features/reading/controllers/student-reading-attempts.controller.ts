import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthUser } from '../../auth/types/auth-user.type';
import { ReadingAttemptsService } from '../services/reading-attempts.service';
import { StartAttemptDto } from '../dto/start-attempt.dto';
import { SaveProgressDto } from '../dto/save-progress.dto';
import { SubmitAttemptDto } from '../dto/submit-attempt.dto';

@Controller('reading/attempts')
@UseGuards(JwtAuthGuard)
export class StudentReadingAttemptsController {
  constructor(private readonly attemptsService: ReadingAttemptsService) {}

  @Post('start')
  async startAttempt(@CurrentUser() user: AuthUser, @Body() dto: StartAttemptDto) {
    const data = await this.attemptsService.startAttempt(user.id, dto.testId);
    return { data };
  }

  @Patch(':id/progress')
  async saveProgress(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SaveProgressDto,
  ) {
    const data = await this.attemptsService.saveProgress(id, user.id, dto);
    return { data };
  }

  @Post(':id/submit')
  async submitAttempt(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SubmitAttemptDto,
  ) {
    const data = await this.attemptsService.submitAttempt(id, user.id, dto);
    return { data };
  }

  @Get(':id/result')
  async getResult(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.attemptsService.getAttemptResult(id, user.id);
    return { data };
  }

  @Get(':id/review')
  async getReview(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.attemptsService.getAttemptResult(id, user.id);
    return { data };
  }
}
