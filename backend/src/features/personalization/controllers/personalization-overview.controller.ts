import { Controller, Get, Post, HttpCode, UseGuards } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AuthUser } from '../../auth/types/auth-user.type';
import { readAbilityProfile } from '../../ai-shared/ability-profile.repository';
import {
  missingPlacement,
  placementTests,
  PLACEMENT_REQUIRED,
  suggestedTarget,
} from '../../ai-shared/placement';
import { GoalsService } from '../services/goals.service';
import { SnapshotService } from '../services/snapshot.service';
import { PlanService } from '../services/plan.service';
import { CommentsService } from '../services/comments.service';
import { ReportsService } from '../services/reports.service';
import { PersonalizationClock } from '../services/personalization-clock';
@Controller('me/personalization')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STUDENT')
export class PersonalizationOverviewController {
  constructor(
    private readonly db: DataSource,
    private readonly goals: GoalsService,
    private readonly snapshots: SnapshotService,
    private readonly plans: PlanService,
    private readonly comments: CommentsService,
    private readonly reports: ReportsService,
    private readonly clock: PersonalizationClock,
  ) {}

  @Get('overview') async overview(@CurrentUser() actor: AuthUser) {
    const [
      current,
      schedule,
      comment,
      recentReports,
      ability,
      tests,
      commentNeedsSync,
    ] = await Promise.all([
      this.snapshots.current(actor),
      this.plans.current(actor),
      this.comments.current(actor),
      this.reports.list(actor.id, undefined),
      readAbilityProfile(this.db.manager, actor.id, this.clock.now()),
      placementTests(this.db.manager),
      this.comments.needsSync(actor),
    ]);
    const missing = missingPlacement(ability);
    return {
      goal: current.goal,
      progress: current.snapshot,
      profile: {
        ...ability,
        placement: {
          required: PLACEMENT_REQUIRED,
          missing,
          complete: missing.length === 0,
          tests,
        },
        suggestedTargetCefr: suggestedTarget(ability),
      },
      plan: schedule.plan,
      today: schedule.today,
      comment,
      recentReports: recentReports.items.slice(0, 3),
      needsSync:
        !!(
          current.goal &&
          (current.goal.effectiveStatus === 'ENDING' || !schedule.plan)
        ) || commentNeedsSync,
    };
  }

  @Post('sync') @HttpCode(200) async sync(@CurrentUser() actor: AuthUser) {
    await this.db.transaction(async (manager) => {
      const timezone = await this.goals.lockUser(manager, actor.id);
      const active = await this.goals.reconcile(
        manager,
        actor.id,
        this.clock.now(),
      );
      if (active) await this.plans.ensureLocked(manager, actor, active.goal);
      await this.comments.syncLocked(actor, manager, timezone);
    });
    return { synced: true };
  }
}
