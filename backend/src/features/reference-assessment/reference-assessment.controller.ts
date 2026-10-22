import { Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '../auth/types/auth-user.type';
import { ReferenceAssessmentService } from './reference-assessment.service';

@Controller('reference-assessments')
@UseGuards(JwtAuthGuard,RolesGuard)
@Roles('STUDENT','ADMIN')
export class ReferenceAssessmentController {
  constructor(private readonly service:ReferenceAssessmentService) {}
  @Get(':attemptId')
  get(@Param('attemptId',new ParseUUIDPipe()) id:string,@CurrentUser() actor:AuthUser) { return this.service.result(id,actor.id); }
  @Post(':attemptId/retry')
  @HttpCode(202)
  retry(@Param('attemptId',new ParseUUIDPipe()) id:string,@CurrentUser() actor:AuthUser) { return this.service.retry(id,actor.id); }
}
