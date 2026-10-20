import { PersonalizationProgressModule } from '../personalization/personalization-progress.module';
import { Module } from '@nestjs/common';
import { AiModule } from '../../common/ai/ai.module';
import { WritingAiConfig } from './writing-ai-config.service';
import { WritingGradingJobsRepository } from './repositories/writing-grading-jobs.repository';
import { WritingInputBuilder } from './services/writing-input-builder.service';
import { WritingAssessmentValidator } from './services/writing-assessment-validator.service';
import { WritingAssessmentService } from './services/writing-assessment.service';
import { WritingAssessmentCoordinator } from './services/writing-assessment-coordinator.service';
import { WritingAssessmentWorker } from './workers/writing-assessment.worker';

@Module({
  imports: [AiModule, PersonalizationProgressModule],
  providers: [
    WritingAiConfig,
    WritingGradingJobsRepository,
    WritingInputBuilder,
    WritingAssessmentValidator,
    WritingAssessmentService,
    WritingAssessmentCoordinator,
    WritingAssessmentWorker,
  ],
  exports: [WritingAssessmentCoordinator],
})
export class WritingAssessmentModule {}
