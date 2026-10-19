import { Module } from '@nestjs/common';
import { LearningGoalsRepository } from './repositories/learning-goals.repository';
import { LearnerPreferencesRepository } from './repositories/learner-preferences.repository';
import { LearningInsightsRepository } from './repositories/learning-insights.repository';
import { StudyPlansRepository } from './repositories/study-plans.repository';

const repositories = [
  LearningGoalsRepository,
  LearnerPreferencesRepository,
  LearningInsightsRepository,
  StudyPlansRepository,
];

@Module({ providers: repositories, exports: repositories })
export class PersonalizationModule {}
