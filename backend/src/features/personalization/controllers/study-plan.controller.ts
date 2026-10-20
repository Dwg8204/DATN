import {
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { AuthUser } from '../../auth/types/auth-user.type';
import { PlanService } from '../services/plan.service';

@Controller('me')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STUDENT')
export class StudyPlanController {
  constructor(private readonly plans: PlanService) {}
  @Get('study-plan/current') current(@CurrentUser() actor: AuthUser) {
    return this.plans.current(actor);
  }
  @Post('study-plan/items/:id/done') @HttpCode(200) done(
    @CurrentUser() actor: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.plans.markReviewed(actor, id);
  }
  @Get('mistakes') review(
    @CurrentUser() actor: AuthUser,
    @Query('itemId', ParseUUIDPipe) id: string,
  ) {
    return this.plans.review(actor, id);
  }
}
