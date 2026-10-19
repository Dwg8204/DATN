import { Global, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { PersonalizationModule } from './personalization.module';
import { LearningGoalsRepository } from './repositories/learning-goals.repository';
import { LearnerPreferencesRepository } from './repositories/learner-preferences.repository';
import { LearningInsightsRepository } from './repositories/learning-insights.repository';
import { StudyPlansRepository } from './repositories/study-plans.repository';

const query = jest.fn();

@Global()
@Module({
  providers: [{ provide: DataSource, useValue: { manager: { query } } }],
  exports: [DataSource],
})
class DatabaseFixtureModule {}

describe('PersonalizationModule foundation', () => {
  it('exports injectable repositories without starting database or AI work on boot', async () => {
    const module = await Test.createTestingModule({
      imports: [DatabaseFixtureModule, PersonalizationModule],
    }).compile();
    try {
      await module.init();
      for (const repository of [
        LearningGoalsRepository,
        LearnerPreferencesRepository,
        LearningInsightsRepository,
        StudyPlansRepository,
      ]) {
        expect(module.get(repository)).toBeInstanceOf(repository);
      }
      expect(query).not.toHaveBeenCalled();
    } finally {
      await module.close();
    }
  });
});
