import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  CreateGoalInput,
  LearningGoalRow,
} from '../types/personalization.type';

const fields = '*,start_date::text AS start_date';

@Injectable()
export class LearningGoalsRepository {
  constructor(private readonly db: DataSource) {}

  async findActive(
    userId: string,
    manager = this.db.manager,
  ): Promise<LearningGoalRow | null> {
    const rows = await manager.query<LearningGoalRow[]>(
      `SELECT ${fields} FROM learning_goals WHERE user_id=$1 AND status='ACTIVE'`,
      [userId],
    );
    return rows[0] ?? null;
  }

  async findById(
    userId: string,
    goalId: string,
    manager = this.db.manager,
  ): Promise<LearningGoalRow | null> {
    const rows = await manager.query<LearningGoalRow[]>(
      `SELECT ${fields} FROM learning_goals WHERE user_id=$1 AND id=$2`,
      [userId, goalId],
    );
    return rows[0] ?? null;
  }

  async create(
    userId: string,
    input: CreateGoalInput,
    manager = this.db.manager,
  ): Promise<LearningGoalRow> {
    const rows = await manager.query<LearningGoalRow[]>(
      `INSERT INTO learning_goals(user_id,target_cefr,target_test_count,duration_days,start_date,timezone)
       VALUES($1,$2,$3,$4,$5,$6) RETURNING ${fields}`,
      [
        userId,
        input.targetCefr,
        input.targetTests,
        input.durationDays,
        input.startDate,
        input.timezone,
      ],
    );
    return rows[0];
  }
}
