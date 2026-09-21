import { Body, Controller, Get, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AuthUser } from '../../auth/types/auth-user.type';
import { AttemptHistoryQueryDto, AttemptStatesQueryDto, SaveProgressDto, StartAttemptDto, SubmitAttemptDto } from '../dto/attempt.dto';
import { TestAttemptsService } from '../services/test-attempts.service';

@ApiTags('Test Attempts')
@ApiCookieAuth('aptimate_access_token')
@Controller('test-attempts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STUDENT')
export class TestAttemptsController {
  constructor(private readonly attempts: TestAttemptsService) {}

  @Post()
  start(@Body() dto: StartAttemptDto, @CurrentUser() actor: AuthUser) {
    return this.attempts.start(dto.testId, dto.attemptId, actor, dto.mode);
  }

  @Get('history')
  history(@Query() query: AttemptHistoryQueryDto, @CurrentUser() actor: AuthUser) {
    return this.attempts.history(actor, query);
  }

  @Get('states')
  states(@Query() query: AttemptStatesQueryDto, @CurrentUser() actor: AuthUser) {
    return this.attempts.states(actor, query.testIds);
  }

  @Get(':attemptId')
  get(@Param('attemptId', new ParseUUIDPipe()) attemptId: string, @CurrentUser() actor: AuthUser) {
    return this.attempts.get(attemptId, actor);
  }

  @Patch(':attemptId/progress')
  save(@Param('attemptId', new ParseUUIDPipe()) attemptId: string, @Body() dto: SaveProgressDto, @CurrentUser() actor: AuthUser) {
    return this.attempts.save(attemptId, actor, dto);
  }

  @Post(':attemptId/submit')
  submit(@Param('attemptId', new ParseUUIDPipe()) attemptId: string, @Body() dto: SubmitAttemptDto, @CurrentUser() actor: AuthUser) {
    return this.attempts.submit(attemptId, actor, dto);
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
