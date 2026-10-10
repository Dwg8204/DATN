import { IsIn, IsOptional } from 'class-validator';
import { DASHBOARD_PERIODS, DashboardPeriod } from '../types/admin-dashboard.type';

export class DashboardQueryDto {
  @IsOptional()
  @IsIn(DASHBOARD_PERIODS)
  period: DashboardPeriod = '12-months';
}
