import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  CreateInsightInput,
  LearningInsightRow,
} from '../types/personalization.type';

const fields =
  '*,covers_from::text AS covers_from,covers_to::text AS covers_to';

@Injectable()
export class LearningInsightsRepository {
  constructor(private readonly db: DataSource) {}

  async findById(
    userId: string,
    insightId: string,
    manager = this.db.manager,
  ): Promise<LearningInsightRow | null> {
    const rows = await manager.query<LearningInsightRow[]>(
      `SELECT ${fields} FROM learning_insights WHERE user_id=$1 AND id=$2`,
      [userId, insightId],
    );
    return rows[0] ?? null;
  }

  /** A null result means this user's day/goal period has already been queued. */
  async createPending(
    userId: string,
    input: CreateInsightInput,
    manager = this.db.manager,
  ): Promise<LearningInsightRow | null> {
    const rows = await manager.query<LearningInsightRow[]>(
      `INSERT INTO learning_insights(user_id,goal_id,kind,period_key,week_index,covers_from,covers_to,
         snapshot_version,input_hash,snapshot,deliver_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11) ON CONFLICT DO NOTHING RETURNING ${fields}`,
      [
        userId,
        input.goalId ?? null,
        input.kind,
        input.periodKey,
        input.weekIndex ?? null,
        input.coversFrom ?? null,
        input.coversTo ?? null,
        input.snapshotVersion,
        input.inputHash,
        JSON.stringify(input.snapshot),
        input.deliverAt ?? null,
      ],
    );
    return rows[0] ?? null;
  }
}
