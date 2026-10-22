import { ApplicationError } from '../../../common/errors/application.error';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { GoalStatus, TargetCefr } from '../types/personalization.type';

export const MAX_DAILY_TESTS = 3;
export function assertGoalPace(dto: {targetTests:number;durationDays:number}) {
  if(dto.targetTests > MAX_DAILY_TESTS * dto.durationDays) throw new ApplicationError('GOAL_PACE_TOO_HIGH','The goal cannot exceed three tests per day.',400);
}
export class CreateLearningGoalDto {
  @IsIn(['A1', 'A2', 'B1', 'B2', 'C']) targetCefr!: TargetCefr;
  @IsInt() @Min(1) @Max(500) targetTests!: number;
  @IsInt() @Min(3) @Max(180) durationDays!: number;
}
export class GoalIdentityDto {
  @IsUUID() goalId!: string;
}
export class ReplaceLearningGoalDto extends CreateLearningGoalDto {
  @IsUUID() goalId!: string;
}
export class GoalHistoryQueryDto {
  @IsOptional()
  @IsIn(['ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED', 'REPLACED'])
  status?: GoalStatus;
  @Type(() => Number) @IsInt() @Min(1) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(50) pageSize = 20;
}
export class SaveLearningPreferencesDto {
  @IsBoolean() reminderEnabled!: boolean;
  @Matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/) reminderTime!: string;
  @IsBoolean() emailReminderEnabled!: boolean;
  @IsBoolean() emailReportEnabled!: boolean;
}
