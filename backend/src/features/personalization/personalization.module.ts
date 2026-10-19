import { Module } from '@nestjs/common';
import { TestAttemptsModule } from '../test-attempts/test-attempts.module';
import { PersonalizationDataModule } from './personalization-data.module';
import { PersonalizationController } from './controllers/personalization.controller';
import { SnapshotService } from './services/snapshot.service';
import { MistakeSourceService } from './services/mistake-source.service';
import { PlanCandidatesService } from './services/plan-candidates.service';
import { PlanService } from './services/plan.service';
import { StudyPlanController } from './controllers/study-plan.controller';
import { PersonalizationWorker } from './workers/personalization.worker';

@Module({
  imports: [PersonalizationDataModule, TestAttemptsModule],
  controllers: [PersonalizationController, StudyPlanController],
  providers: [
    SnapshotService,
    MistakeSourceService,
    PlanCandidatesService,
    PlanService,
    PersonalizationWorker,
  ],
  exports: [PersonalizationDataModule, SnapshotService],
})
export class PersonalizationModule {}
