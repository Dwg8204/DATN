import { Controller, Get, UseGuards } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthUser } from '../../auth/types/auth-user.type';
import { readAbilityProfile } from '../../ai-shared/ability-profile.repository';
import {
  missingPlacement,
  PLACEMENT_REQUIRED,
  placementTests,
  suggestedTarget,
} from '../../ai-shared/placement';
import { PersonalizationClock } from '../services/personalization-clock';
@Controller('me')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STUDENT')
export class AbilityProfileController {
  constructor(
    private readonly db: DataSource,
    private readonly clock: PersonalizationClock,
  ) {}
  @Get('ability-profile') async get(@CurrentUser() actor: AuthUser) {
    const profile = await readAbilityProfile(
      this.db.manager,
      actor.id,
      this.clock.now(),
    );
    const missing = missingPlacement(profile);
    return {
      ...profile,
      placement: {
        required: PLACEMENT_REQUIRED,
        missing,
        complete: missing.length === 0,
        tests: await placementTests(this.db.manager),
      },
      suggestedTargetCefr: suggestedTarget(profile),
    };
  }
}
