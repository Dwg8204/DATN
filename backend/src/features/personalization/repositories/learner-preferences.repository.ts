import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  LearnerPreferencesRow,
  SavePreferencesInput,
} from '../types/personalization.type';

const fields = '*,last_reminded_on::text AS last_reminded_on';

@Injectable()
export class LearnerPreferencesRepository {
  constructor(private readonly db: DataSource) {}

  async find(
    userId: string,
    manager = this.db.manager,
  ): Promise<LearnerPreferencesRow | null> {
    const rows = await manager.query<LearnerPreferencesRow[]>(
      `SELECT ${fields} FROM learner_preferences WHERE user_id=$1`,
      [userId],
    );
    return rows[0] ?? null;
  }

  async save(
    userId: string,
    input: SavePreferencesInput,
    manager = this.db.manager,
  ): Promise<LearnerPreferencesRow> {
    const rows = await manager.query<LearnerPreferencesRow[]>(
      `INSERT INTO learner_preferences(user_id,reminder_enabled,reminder_time,email_reminder_enabled,email_report_enabled)
       VALUES($1,$2,$3,$4,$5) ON CONFLICT(user_id) DO UPDATE SET
         reminder_enabled=EXCLUDED.reminder_enabled,reminder_time=EXCLUDED.reminder_time,
         email_reminder_enabled=EXCLUDED.email_reminder_enabled,email_report_enabled=EXCLUDED.email_report_enabled,
         updated_at=now() RETURNING ${fields}`,
      [
        userId,
        input.reminderEnabled,
        input.reminderTime,
        input.emailReminderEnabled,
        input.emailReportEnabled,
      ],
    );
    return rows[0];
  }
}
