import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ApplicationError } from '../../../common/errors/application.error';
import {
  CreatePlanInput,
  CreatePlanItemInput,
  StudyPlanItemRow,
  StudyPlanRow,
} from '../types/personalization.type';

const fields = '*,starts_on::text AS starts_on,ends_on::text AS ends_on';

@Injectable()
export class StudyPlansRepository {
  constructor(private readonly db: DataSource) {}

  async findWeek(
    userId: string,
    goalId: string,
    weekIndex: number,
    manager = this.db.manager,
  ): Promise<StudyPlanRow | null> {
    const rows = await manager.query<StudyPlanRow[]>(
      `SELECT ${fields} FROM study_plans WHERE user_id=$1 AND goal_id=$2 AND week_index=$3`,
      [userId, goalId, weekIndex],
    );
    return rows[0] ?? null;
  }

  async findItems(
    userId: string,
    planId: string,
    manager = this.db.manager,
  ): Promise<StudyPlanItemRow[]> {
    return manager.query<StudyPlanItemRow[]>(
      `SELECT i.*,i.scheduled_on::text AS scheduled_on FROM study_plan_items i
       JOIN study_plans p ON p.id=i.plan_id WHERE p.user_id=$1 AND p.id=$2
       ORDER BY i.scheduled_on,i.sort_order,i.id`,
      [userId, planId],
    );
  }

  async create(
    userId: string,
    input: CreatePlanInput,
    items: readonly CreatePlanItemInput[],
    manager?: EntityManager,
  ): Promise<StudyPlanRow> {
    if (!manager)
      return this.db.transaction((transaction) =>
        this.create(userId, input, items, transaction),
      );
    if (!manager.queryRunner?.isTransactionActive) {
      throw new Error('PLAN_TRANSACTION_REQUIRED');
    }
    const rows = await manager.query<StudyPlanRow[]>(
      `INSERT INTO study_plans(user_id,goal_id,week_index,starts_on,ends_on,source,insight_id)
       VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING ${fields}`,
      [
        userId,
        input.goalId,
        input.weekIndex,
        input.startsOn,
        input.endsOn,
        input.source,
        input.insightId ?? null,
      ],
    );
    const plan = rows[0];
    await this.insertItems(userId, plan, items, manager);
    return plan;
  }

  async insertItems(
    userId: string,
    plan: StudyPlanRow,
    items: readonly CreatePlanItemInput[],
    manager: EntityManager,
  ): Promise<void> {
    if (!manager.queryRunner?.isTransactionActive || plan.user_id !== userId)
      throw new Error('PLAN_TRANSACTION_OWNER_REQUIRED');
    for (const item of items) {
      if (
        item.scheduledOn < plan.starts_on ||
        item.scheduledOn > plan.ends_on
      ) {
        throw new ApplicationError(
          'PLAN_ITEM_OUTSIDE_PERIOD',
          'The activity must fall within its study plan.',
          400,
        );
      }
      if (item.activityType === 'MISTAKE_REVIEW') {
        const owned = await manager.query<Array<{ id: string }>>(
          "SELECT id FROM test_attempts WHERE id=$1 AND student_id=$2 AND status='SUBMITTED'",
          [item.sourceAttemptId, userId],
        );
        if (!owned.length)
          throw new ApplicationError(
            'PLAN_SOURCE_ATTEMPT_NOT_FOUND',
            'Submitted attempt not found.',
            404,
          );
      }
      await manager.query(
        `INSERT INTO study_plan_items(plan_id,scheduled_on,sort_order,activity_type,component,
        part_number,test_id,topic_id,source_attempt_id,question_keys,target_count,reason)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          plan.id,
          item.scheduledOn,
          item.sortOrder,
          item.activityType,
          'component' in item ? (item.component ?? null) : null,
          'partNumber' in item ? (item.partNumber ?? null) : null,
          'testId' in item ? (item.testId ?? null) : null,
          'topicId' in item ? item.topicId : null,
          'sourceAttemptId' in item ? item.sourceAttemptId : null,
          'questionKeys' in item ? item.questionKeys : null,
          item.targetCount,
          item.reason ?? null,
        ],
      );
    }
  }
}
