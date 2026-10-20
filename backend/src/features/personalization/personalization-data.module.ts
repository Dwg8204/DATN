import { Module } from '@nestjs/common';
import { LearningGoalsRepository } from './repositories/learning-goals.repository';
import { LearnerPreferencesRepository } from './repositories/learner-preferences.repository';
import { LearningInsightsRepository } from './repositories/learning-insights.repository';
import { StudyPlansRepository } from './repositories/study-plans.repository';
import { GoalsService } from './services/goals.service';
import { PreferencesService } from './services/preferences.service';
import { PersonalizationClock } from './services/personalization-clock';
import { PlanProgressRepository } from './repositories/plan-progress.repository';

const repositories = [
  LearningGoalsRepository,
  LearnerPreferencesRepository,
  LearningInsightsRepository,
  StudyPlansRepository,
  PlanProgressRepository,
];

@Module({
  providers: [
    ...repositories,
    GoalsService,
    PreferencesService,
    PersonalizationClock,
  ],
  exports: [
    ...repositories,
    GoalsService,
    PreferencesService,
    PersonalizationClock,
  ],
})
export class PersonalizationDataModule {}
