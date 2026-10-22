import {missingPlacement} from '../../ai-shared/placement';
import { readAbilityProfile } from '../../ai-shared/ability-profile.repository';
import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ApplicationError } from '../../../common/errors/application.error';
import {
  assertGoalPace,
  CreateLearningGoalDto,
  GoalHistoryQueryDto,
  ReplaceLearningGoalDto,
} from '../dto/learning-goal.dto';
import { LearningGoalsRepository } from '../repositories/learning-goals.repository';
import { LearningGoalRow } from '../types/personalization.type';
import { addDays, localDay } from '../policies/calendar';
import { PersonalizationClock } from './personalization-clock';
import { PlanProgressRepository } from '../repositories/plan-progress.repository';
import { recordGoalAchievement } from './goal-achievement';
import { queueFinalReport } from './final-report-queue';

export function presentGoal(goal: LearningGoalRow, completed: number) {
  return {
    id: goal.id,
    targetCefr: goal.target_cefr,
    targetTests: goal.target_test_count,
    durationDays: goal.duration_days,
    startDate: goal.start_date,
    endsOn: addDays(goal.start_date, goal.duration_days - 1),
    timezone: goal.timezone,
    status: goal.status,
    replacedByGoalId: goal.replaced_by_goal_id,
    targetReachedAt: goal.target_reached_at,
    endedAt: goal.ended_at,
    completed,
    canFinish: goal.status === 'ACTIVE' && goal.target_reached_at !== null,
  };
}

@Injectable()
export class GoalsService {
  constructor(
    private readonly db: DataSource,
    private readonly goals: LearningGoalsRepository,
    private readonly clock: PersonalizationClock,
    private readonly progress: PlanProgressRepository,
  ) {}

  async lockUser(manager: EntityManager, userId: string): Promise<string> {
    const [user] = await manager.query<Array<{ timezone: string }>>(
      'SELECT timezone FROM users WHERE id=$1 FOR UPDATE',
      [userId],
    );
    if (!user)
      throw new ApplicationError(
        'LEARNER_NOT_FOUND',
        'Learner not found.',
        404,
      );
    return user.timezone;
  }

  async count(manager: EntityManager, goal: LearningGoalRow, asOf: Date) {
    const [counts] = await manager.query<
      Array<{ completed: number; reached_at: Date | null }>
    >(
      `SELECT count(*)::int AS completed,
      (array_agg(submitted_at ORDER BY submitted_at,id))[$5] AS reached_at FROM test_attempts
      WHERE student_id=$1 AND status='SUBMITTED' AND submitted_at >= ($2::date::timestamp AT TIME ZONE $4)
        AND submitted_at < (($2::date+$3::int)::timestamp AT TIME ZONE $4) AND submitted_at <= $6`,
      [
        goal.user_id,
        goal.start_date,
        goal.duration_days,
        goal.timezone,
        goal.target_test_count,
        asOf,
      ],
    );
    return counts;
  }

  async reconcile(manager: EntityManager, userId: string, asOf: Date) {
    const goal = await this.goals.findActive(userId, manager);
    if (!goal) return null;
    await this.progress.syncGoal(manager, goal, asOf);
    const counts = await this.count(manager, goal, asOf);
    if (!goal.target_reached_at && counts.reached_at) {
      await manager.query(
        'UPDATE learning_goals SET target_reached_at=$2,updated_at=now() WHERE id=$1',
        [goal.id, counts.reached_at],
      );
      goal.target_reached_at = counts.reached_at;
    }
    if (goal.target_reached_at) await recordGoalAchievement(manager, goal);
    if (
      localDay(asOf, goal.timezone) >=
      addDays(goal.start_date, goal.duration_days)
    ) {
      await manager.query(
        `UPDATE learning_goals SET status=$2,ended_at=(($3::date+$4::int)::timestamp AT TIME ZONE $5),updated_at=now() WHERE id=$1`,
        [
          goal.id,
          goal.target_reached_at ? 'COMPLETED' : 'EXPIRED',
          goal.start_date,
          goal.duration_days,
          goal.timezone,
        ],
      );
      await queueFinalReport(manager, goal.id);
      return null;
    }
    return { goal, completed: counts.completed };
  }

  async current(userId: string) {
    return this.db.transaction(async (manager) => {
      await this.lockUser(manager, userId);
      const active = await this.reconcile(manager, userId, this.clock.now());
      return {
        goal: active ? presentGoal(active.goal, active.completed) : null,
      };
    });
  }

  async create(userId: string, dto: CreateLearningGoalDto) {
    assertGoalPace(dto);
    return this.db.transaction(async (manager) => {
      const timezone = await this.lockUser(manager, userId),
        now = this.clock.now();
      if (await this.reconcile(manager, userId, now))
        throw new ApplicationError(
          'GOAL_ALREADY_ACTIVE',
          'An active goal already exists.',
          409,
        );
      const goal = await this.goals.create(
        userId,
        { ...dto, startDate: localDay(now, timezone), timezone },
        manager,
      );
      const baseline = await readAbilityProfile(manager, userId, now);
      await manager.query('UPDATE learning_goals SET baseline_profile=$2 WHERE id=$1', [goal.id, baseline]);
      const refreshed = await this.reconcile(manager, userId, now);
      return { goal: presentGoal(refreshed!.goal, refreshed!.completed), placementComplete: missingPlacement(baseline).length===0 };
    });
  }

  async replace(userId: string, dto: ReplaceLearningGoalDto) {
    assertGoalPace(dto);
    return this.db.transaction(async (manager) => {
      const timezone = await this.lockUser(manager, userId),
        now = this.clock.now();
      const active = await this.reconcile(manager, userId, now);
      this.assertCurrent(active?.goal, dto.goalId);
      await manager.query(
        "UPDATE learning_goals SET status='REPLACED',ended_at=$2,updated_at=now() WHERE id=$1",
        [dto.goalId, now],
      );
      const goal = await this.goals.create(
        userId,
        { ...dto, startDate: localDay(now, timezone), timezone },
        manager,
      );
      await manager.query(
        'UPDATE learning_goals SET replaced_by_goal_id=$2 WHERE id=$1',
        [dto.goalId, goal.id],
      );
      await queueFinalReport(manager, dto.goalId);
      const baseline = await readAbilityProfile(manager, userId, now);
      await manager.query('UPDATE learning_goals SET baseline_profile=$2 WHERE id=$1', [goal.id, baseline]);
      const refreshed = await this.reconcile(manager, userId, now);
      return { goal: presentGoal(refreshed!.goal, refreshed!.completed), placementComplete: missingPlacement(baseline).length===0 };
    });
  }

  async end(userId: string, goalId: string, finish: boolean) {
    return this.db.transaction(async (manager) => {
      await this.lockUser(manager, userId);
      const now = this.clock.now(),
        active = await this.reconcile(manager, userId, now);
      this.assertCurrent(active?.goal, goalId);
      if (finish && !active!.goal.target_reached_at)
        throw new ApplicationError(
          'GOAL_TARGET_NOT_REACHED',
          'Complete the target number of tests first.',
          409,
        );
      await manager.query(
        'UPDATE learning_goals SET status=$2,ended_at=$3,updated_at=now() WHERE id=$1',
        [goalId, finish ? 'COMPLETED' : 'CANCELLED', now],
      );
      if (finish) await queueFinalReport(manager, goalId);
      return { goal: null };
    });
  }

  async history(userId: string, query: GoalHistoryQueryDto) {
    const rows = await this.db.query<LearningGoalRow[]>(
      `SELECT *,start_date::text AS start_date FROM learning_goals
      WHERE user_id=$1 AND ($2::text IS NULL AND status<>'ACTIVE' OR status::text=$2)
      ORDER BY created_at DESC,id DESC LIMIT $3 OFFSET $4`,
      [
        userId,
        query.status ?? null,
        query.pageSize + 1,
        (query.page - 1) * query.pageSize,
      ],
    );
    return {
      items: await Promise.all(
        rows
          .slice(0, query.pageSize)
          .map(async (row) =>
            presentGoal(
              row,
              (
                await this.count(
                  this.db.manager,
                  row,
                  row.ended_at ?? this.clock.now(),
                )
              ).completed,
            ),
          ),
      ),
      page: query.page,
      hasMore: rows.length > query.pageSize,
    };
  }

  private assertCurrent(
    goal: LearningGoalRow | undefined,
    id: string,
  ): asserts goal is LearningGoalRow {
    if (!goal || goal.id !== id)
      throw new ApplicationError(
        'GOAL_CHANGED',
        'The active goal has changed. Reload before continuing.',
        409,
      );
  }
}
