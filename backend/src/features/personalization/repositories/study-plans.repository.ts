import { Injectable } from '@nestjs/common';
import { TOPIC_COVERAGE_SQL } from '../../topics/topics.service';
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
      if(item.activityType==='TOPIC_REVIEW') {
        const [eligible]=await manager.query(`WITH coverage AS (${TOPIC_COVERAGE_SQL}) SELECT 1 FROM learning_topics p
          JOIN coverage c ON c.component=p.component AND c.total>0 AND c.approved::numeric/c.total>=0.8
          JOIN question_topics l ON l.topic_id=p.id AND l.status='APPROVED'
          JOIN topic_question_catalog q ON q.id=l.question_id AND q.question_hash=l.question_hash
          JOIN tests t ON t.id=q.test_id AND t.status='PUBLISHED' AND t.archived_at IS NULL
          JOIN topic_snapshot_questions sq ON sq.snapshot_id=t.published_snapshot_id AND sq.question_id=q.id AND sq.question_hash=q.question_hash
          WHERE p.id=$1 AND p.is_active AND t.id=$2 LIMIT 1`,[item.topicId,item.testId]);
        if(!eligible) throw new ApplicationError('TOPIC_REVIEW_UNAVAILABLE','Topic coverage or published labels changed.',409);
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
