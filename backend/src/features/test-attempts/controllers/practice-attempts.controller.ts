import { Body, Controller, Get, Param, ParseIntPipe, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AuthUser } from '../../auth/types/auth-user.type';
import { AttemptHistoryQueryDto, AttemptStatesQueryDto } from '../dto/attempt.dto';
import { CompletePracticeAttemptDto, RevealPracticeAnswerDto, StartPracticeAttemptDto } from '../dto/practice-attempt.dto';
import { PracticeAttemptsService } from '../services/practice-attempts.service';

@ApiTags('Practice Attempts')
@ApiCookieAuth('aptimate_access_token')
@Controller('practice-attempts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STUDENT', 'TEACHER', 'ADMIN')
export class PracticeAttemptsController {
  constructor(private readonly attempts: PracticeAttemptsService) {}

  @Post()
  start(@Body() dto: StartPracticeAttemptDto, @CurrentUser() actor: AuthUser) {
    return this.attempts.start(dto, actor);
  }

  @Get('history')
  history(@Query() query: AttemptHistoryQueryDto, @CurrentUser() actor: AuthUser) {
    return this.attempts.history(query, actor);
  }

  @Get('states')
  states(@Query() query: AttemptStatesQueryDto, @CurrentUser() actor: AuthUser) {
    return this.attempts.states(query.testIds, actor);
  }

  @Get(':attemptId')
  get(@Param('attemptId', new ParseUUIDPipe()) attemptId: string, @CurrentUser() actor: AuthUser) {
    return this.attempts.get(attemptId, actor);
  }

  @Post(':attemptId/reveal')
  reveal(@Param('attemptId', new ParseUUIDPipe()) attemptId: string, @Body() dto: RevealPracticeAnswerDto,
    @CurrentUser() actor: AuthUser) {
    return this.attempts.reveal(attemptId, dto.key, actor);
  }

  @Post(':attemptId/complete')
  complete(@Param('attemptId', new ParseUUIDPipe()) attemptId: string, @Body() dto: CompletePracticeAttemptDto,
    @CurrentUser() actor: AuthUser) {
    return this.attempts.complete(attemptId, dto, actor);
  }

  @Post(':attemptId/abandon')
  abandon(@Param('attemptId', new ParseUUIDPipe()) attemptId: string, @CurrentUser() actor: AuthUser) {
    return this.attempts.abandon(attemptId, actor);
  }

  @Get(':attemptId/result')
  result(@Param('attemptId', new ParseUUIDPipe()) attemptId: string, @CurrentUser() actor: AuthUser) {
    return this.attempts.result(attemptId, actor);
  }

  @Get(':attemptId/result/parts/:partNumber')
  details(@Param('attemptId', new ParseUUIDPipe()) attemptId: string,
    @Param('partNumber', ParseIntPipe) partNumber: number, @CurrentUser() actor: AuthUser) {
    return this.attempts.details(attemptId, partNumber, actor);
  }
}
