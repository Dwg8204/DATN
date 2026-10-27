import { localDay } from '../policies/calendar';
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
      `SELECT *,starts_on::text starts_on,ends_on::text ends_on FROM study_plans WHERE goal_id=$1 AND user_id=$2 AND progress_finalized_at IS NULL ORDER BY week_index`,
      [goal.id, goal.user_id],
    );
    for (const plan of plans) {
      await this.syncPlan(manager, goal, plan, asOf);
      if (localDay(asOf, goal.timezone) > plan.ends_on)
        await manager.query(
          'UPDATE study_plans SET progress_finalized_at=$2 WHERE id=$1 AND progress_finalized_at IS NULL',
          [plan.id, asOf],
        );
    }
  }
  async syncPlan(
    manager: EntityManager,
    goal: LearningGoalRow,
    plan: StudyPlanRow,
    asOf: Date,
  ) {
    const [state] = await manager.query(
      'SELECT progress_finalized_at FROM study_plans WHERE id=$1',
      [plan.id],
    );
    if (state?.progress_finalized_at) return;
    const items = await this.plans.findItems(goal.user_id, plan.id, manager);
    const hasTopics = items.some(
      (item) => item.activity_type === 'TOPIC_REVIEW',
    );
    const parameters = [
      goal.user_id,
      plan.starts_on,
      plan.ends_on,
      goal.timezone,
      asOf,
    ];
    const attempts = await manager.query<ProgressAttempt[]>(
      `SELECT a.id,a.component,a.part_number,a.submitted_at,s.test_id,
        ${
          hasTopics
            ? `ARRAY(SELECT DISTINCT l.topic_id FROM topic_snapshot_questions sq
          JOIN question_topics l ON l.question_id=sq.question_id AND l.question_hash=sq.question_hash AND l.status='APPROVED'
          JOIN topic_question_catalog q ON q.id=l.question_id AND q.question_hash=l.question_hash
          JOIN learning_topics p ON p.id=l.topic_id AND p.is_active
          WHERE sq.snapshot_id=a.snapshot_id AND (a.part_number IS NULL OR q.part_number=a.part_number))`
            : 'ARRAY[]::uuid[]'
        } topic_ids
      FROM test_attempts a JOIN test_snapshots s ON s.id=a.snapshot_id WHERE student_id=$1 AND a.status='SUBMITTED'
      AND submitted_at >= ($2::date::timestamp AT TIME ZONE $4) AND submitted_at < (($3::date+1)::timestamp AT TIME ZONE $4) AND submitted_at <= $5 ORDER BY submitted_at,a.id`,
      parameters,
    );
    const reviews = await manager.query<Array<{ reviewed_at: Date }>>(
      `SELECT e.reviewed_at FROM vocabulary_review_events e JOIN user_notebook_items n ON n.id=e.notebook_item_id WHERE n.user_id=$1
      AND e.reviewed_at >= ($2::date::timestamp AT TIME ZONE $4) AND e.reviewed_at < (($3::date+1)::timestamp AT TIME ZONE $4) AND e.reviewed_at <= $5 ORDER BY e.reviewed_at,e.id`,
      parameters,
    );

    const progress = allocatePlanProgress(
      items,
      attempts,
      reviews.map((row) => row.reviewed_at),
      plan.starts_on,
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
