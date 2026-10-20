import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { StudyPlansRepository } from '../repositories/study-plans.repository';
import { LearnerPreferencesRepository } from '../repositories/learner-preferences.repository';
import { LearningGoalRow } from '../types/personalization.type';
import { localDay } from '../policies/calendar';
import { reminderContent } from '../policies/daily-reminder';

@Injectable()
export class RemindersService {
  constructor(
    private readonly preferences: LearnerPreferencesRepository,
    private readonly plans: StudyPlansRepository,
  ) {}

  /** Caller holds the user lock; enqueue and daily marker commit together. */
  async enqueueLocked(
    manager: EntityManager,
    goal: LearningGoalRow,
    completed: number,
    planId: string,
    now: Date,
  ): Promise<void> {
    const [user] = await manager.query<Array<{ timezone: string }>>(
      'SELECT timezone FROM users WHERE id=$1',
      [goal.user_id],
    );
    const today = localDay(now, user.timezone);
    const time = new Intl.DateTimeFormat('en-GB', {
      timeZone: user.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(now);
    const preferences = await this.preferences.find(goal.user_id, manager);
    if (
      time < (preferences?.reminder_time.slice(0, 5) ?? '19:00') ||
      (preferences?.last_reminded_on && preferences.last_reminded_on >= today)
    )
      return;

    const items = (
      await this.plans.findItems(goal.user_id, planId, manager)
    ).filter(
      (item) =>
        item.scheduled_on === localDay(now, goal.timezone) &&
        !item.completed_at &&
        item.done_count < item.target_count,
    );
    if ((preferences?.reminder_enabled ?? true) && items.length > 0) {
      const content = reminderContent(goal, completed, items, now);
      const channels = preferences?.email_reminder_enabled
        ? ['IN_APP', 'EMAIL']
        : ['IN_APP'];
      for (const channel of channels) {
        await manager.query(
          `WITH notification AS (
            INSERT INTO notifications(title,content,type,channel,audience_type,action_path,status,scheduled_at,dedupe_key)
            VALUES($1,$2,'LEARNING_REMINDER',$3,'SELECTED_USERS','/profile/dashboard','SCHEDULED',$4,$5)
            ON CONFLICT(dedupe_key) DO NOTHING RETURNING id)
          INSERT INTO notification_recipients(notification_id,user_id,delivery_status)
          SELECT id,$6,'PENDING' FROM notification ON CONFLICT(notification_id,user_id) DO NOTHING`,
          [
            'Đến giờ học cùng AptiMate',
            content,
            channel,
            now,
            `reminder:${goal.user_id}:${today}:${channel}`,
            goal.user_id,
          ],
        );
      }
    }
    // Also mark skipped days: re-enabling or changing goals must not repeat a daily decision.
    await manager.query(
      `INSERT INTO learner_preferences(user_id,last_reminded_on) VALUES($1,$2)
       ON CONFLICT(user_id) DO UPDATE SET last_reminded_on=EXCLUDED.last_reminded_on,updated_at=now()`,
      [goal.user_id, today],
    );
  }
}
