import { Module } from '@nestjs/common';
import { LearningGoalsRepository } from './repositories/learning-goals.repository';
import { LearnerPreferencesRepository } from './repositories/learner-preferences.repository';
import { LearningInsightsRepository } from './repositories/learning-insights.repository';
import { StudyPlansRepository } from './repositories/study-plans.repository';
import { PersonalizationController } from './controllers/personalization.controller';
import { GoalsService } from './services/goals.service';
import { PreferencesService } from './services/preferences.service';
import { PersonalizationClock } from './services/personalization-clock';

const repositories = [
  LearningGoalsRepository,
  LearnerPreferencesRepository,
  LearningInsightsRepository,
  StudyPlansRepository,
];

@Module({
  controllers: [PersonalizationController],
  providers: [
    ...repositories,
    GoalsService,
    PreferencesService,
    PersonalizationClock,
  ],
  exports: [...repositories, GoalsService, PersonalizationClock],
})
export class PersonalizationModule {}
