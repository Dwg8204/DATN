import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { StudyPlansRepository } from './study-plans.repository';
import { LearningGoalRow, StudyPlanRow } from '../types/personalization.type';
import {
  allocatePlanProgress,
  ProgressAttempt,
} from '../policies/plan-progress';

@Injectable()
export class PlanProgressRepository {
  constructor(private readonly plans: StudyPlansRepository) {}
  async syncGoal(manager: EntityManager, goal: LearningGoalRow, asOf: Date) {
    const plans = await manager.query<StudyPlanRow[]>(
      `SELECT *,starts_on::text starts_on,ends_on::text ends_on FROM study_plans WHERE goal_id=$1 AND user_id=$2 ORDER BY week_index`,
      [goal.id, goal.user_id],
    );
    for (const plan of plans) await this.syncPlan(manager, goal, plan, asOf);
  }
  async syncPlan(
    manager: EntityManager,
    goal: LearningGoalRow,
    plan: StudyPlanRow,
    asOf: Date,
  ) {
    const parameters = [
      goal.user_id,
      plan.starts_on,
      plan.ends_on,
      goal.timezone,
      asOf,
    ];
    const attempts = await manager.query<ProgressAttempt[]>(
      `SELECT id,component,part_number,submitted_at FROM test_attempts WHERE student_id=$1 AND status='SUBMITTED'
      AND submitted_at >= ($2::date::timestamp AT TIME ZONE $4) AND submitted_at < (($3::date+1)::timestamp AT TIME ZONE $4) AND submitted_at <= $5 ORDER BY submitted_at,id`,
      parameters,
    );
    const reviews = await manager.query<Array<{ reviewed_at: Date }>>(
      `SELECT e.reviewed_at FROM vocabulary_review_events e JOIN user_notebook_items n ON n.id=e.notebook_item_id WHERE n.user_id=$1
      AND e.reviewed_at >= ($2::date::timestamp AT TIME ZONE $4) AND e.reviewed_at < (($3::date+1)::timestamp AT TIME ZONE $4) AND e.reviewed_at <= $5 ORDER BY e.reviewed_at,e.id`,
      parameters,
    );
    const items = await this.plans.findItems(goal.user_id, plan.id, manager);
    const progress = allocatePlanProgress(
      items,
      attempts,
      reviews.map((row) => row.reviewed_at),
      plan.ends_on,
      goal.timezone,
    );
    if (!progress.length) return;
    await manager.query(
      `UPDATE study_plan_items i SET done_count=v.done_count,completed_at=v.completed_at
       FROM jsonb_to_recordset($1::jsonb) AS v(id uuid,done_count integer,completed_at timestamptz)
       WHERE i.id=v.id AND (i.done_count IS DISTINCT FROM v.done_count OR i.completed_at IS DISTINCT FROM v.completed_at)`,
      [
        JSON.stringify(
          progress.map((item) => ({
            id: item.id,
            done_count: item.doneCount,
            completed_at: item.completedAt,
          })),
        ),
      ],
    );
  }
}
