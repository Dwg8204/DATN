import { Injectable } from '@nestjs/common';
import { LearnerPreferencesRepository } from '../repositories/learner-preferences.repository';
import { SaveLearningPreferencesDto } from '../dto/learning-goal.dto';

@Injectable()
export class PreferencesService {
  constructor(private readonly preferences: LearnerPreferencesRepository) {}
  async get(userId: string) {
    const row = await this.preferences.find(userId);
    return {
      reminderEnabled: row?.reminder_enabled ?? true,
      reminderTime: row?.reminder_time.slice(0, 5) ?? '19:00',
      emailReminderEnabled: row?.email_reminder_enabled ?? false,
      emailReportEnabled: row?.email_report_enabled ?? true,
    };
  }
  async save(userId: string, dto: SaveLearningPreferencesDto) {
    await this.preferences.save(userId, dto);
    return this.get(userId);
  }
}
