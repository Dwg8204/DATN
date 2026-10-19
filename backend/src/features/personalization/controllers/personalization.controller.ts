import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AuthUser } from '../../auth/types/auth-user.type';
import {
  CreateLearningGoalDto,
  GoalHistoryQueryDto,
  GoalIdentityDto,
  ReplaceLearningGoalDto,
  SaveLearningPreferencesDto,
} from '../dto/learning-goal.dto';
import { GoalsService } from '../services/goals.service';
import { PreferencesService } from '../services/preferences.service';
import { SnapshotService } from '../services/snapshot.service';
import { PlanService } from '../services/plan.service';

@Controller('me')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STUDENT')
export class PersonalizationController {
  constructor(
    private readonly goals: GoalsService,
    private readonly preferences: PreferencesService,
    private readonly snapshots: SnapshotService,
    private readonly plans: PlanService,
  ) {}
  @Get('learning-goal') current(@CurrentUser() actor: AuthUser) {
    return this.snapshots.current(actor);
  }
  @Post('learning-goal') async create(
    @CurrentUser() actor: AuthUser,
    @Body() dto: CreateLearningGoalDto,
  ) {
    const created = await this.goals.create(actor.id, dto);
    await this.plans.afterGoalCreated(actor);
    return created;
  }
  @Post('learning-goal/replace') @HttpCode(200) async replace(
    @CurrentUser() actor: AuthUser,
    @Body() dto: ReplaceLearningGoalDto,
  ) {
    const replaced = await this.goals.replace(actor.id, dto);
    await this.plans.afterGoalCreated(actor);
    return replaced;
  }
  @Delete('learning-goal') cancel(
    @CurrentUser() actor: AuthUser,
    @Body() dto: GoalIdentityDto,
  ) {
    return this.goals.end(actor.id, dto.goalId, false);
  }
  @Post('learning-goal/finish') @HttpCode(200) finish(
    @CurrentUser() actor: AuthUser,
    @Body() dto: GoalIdentityDto,
  ) {
    return this.goals.end(actor.id, dto.goalId, true);
  }
  @Get('learning-goals') history(
    @CurrentUser() actor: AuthUser,
    @Query() query: GoalHistoryQueryDto,
  ) {
    return this.goals.history(actor.id, query);
  }
  @Get('learning-preferences') settings(@CurrentUser() actor: AuthUser) {
    return this.preferences.get(actor.id);
  }
  @Put('learning-preferences') saveSettings(
    @CurrentUser() actor: AuthUser,
    @Body() dto: SaveLearningPreferencesDto,
  ) {
    return this.preferences.save(actor.id, dto);
  }
}
