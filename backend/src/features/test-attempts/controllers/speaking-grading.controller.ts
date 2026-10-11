import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { SpeakingConsentDto } from '../dto/speaking-consent.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthUser } from '../../auth/types/auth-user.type';
import { SpeakingGradingRepository } from '../repositories/speaking-grading.repository';
import { SpeakingAiConfig } from '../services/speaking-ai-config.service';
import { ApplicationError } from '../../../common/errors/application.error';

@Controller('speaking-grading')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STUDENT','TEACHER','ADMIN')
export class SpeakingGradingController {
  constructor(private readonly jobs: SpeakingGradingRepository, private readonly config: SpeakingAiConfig) {}
  @Get('budget')
  @Roles('ADMIN')
  async budget() {
    const budget = await this.jobs.budget();
    return { ...budget, limit: this.config.cap, currency: 'USD', monthTimezone: 'UTC',
      warning: budget.used + budget.reserved >= .8 ? '80%' : budget.used + budget.reserved >= .5 ? '50%' : null,
      enabled: this.config.enabled, billingTier: this.config.tier };
  }
  @Get(':attemptId/consent')
  async get(@Param('attemptId', ParseUUIDPipe) attemptId: string, @CurrentUser() actor: AuthUser) {
    const consent = await this.jobs.consent(attemptId, actor.id, this.config.policyVersion, false);
    return { enabled: this.config.enabled, consent, policyVersion: this.config.policyVersion, billingTier: this.config.tier };
  }
  @Post(':attemptId/consent')
  async accept(@Param('attemptId', ParseUUIDPipe) attemptId: string, @Body() dto: SpeakingConsentDto, @CurrentUser() actor: AuthUser) {
    if (!this.config.enabled) throw new ApplicationError('SPEAKING_AI_DISABLED', 'Chấm AI chưa được bật.', 503);
    if (dto.policyVersion !== this.config.policyVersion) throw new ApplicationError('CONSENT_POLICY_CHANGED', 'Chính sách chấm AI đã thay đổi. Vui lòng tải lại trang và xác nhận.', 409);
    return { enabled: true, consent: await this.jobs.consent(attemptId, actor.id, dto.policyVersion, true), policyVersion: dto.policyVersion, billingTier: this.config.tier };
  }
}
