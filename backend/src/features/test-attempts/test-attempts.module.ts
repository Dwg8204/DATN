import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WritingAssessmentModule } from '../writing-assessment/writing-assessment.module';
import { AssessmentPaperFactory } from './assessments/assessment-paper.factory';
import { ObjectiveGraderService } from './assessments/objective-grader.service';
import { TestAttemptsController } from './controllers/test-attempts.controller';
import { TestAttemptsRepository } from './repositories/test-attempts.repository';
import { TestAttemptsService } from './services/test-attempts.service';
import { AttemptExpiryWorker } from './workers/attempt-expiry.worker';
import { PracticeAttemptsController } from './controllers/practice-attempts.controller';
import { PracticeAttemptsService } from './services/practice-attempts.service';
import { StudentDashboardService } from './services/student-dashboard.service';
import { SpeakingGradingRepository } from './repositories/speaking-grading.repository';
import { SpeakingAiConfig } from './services/speaking-ai-config.service';
import { SpeakingAudioService } from './services/speaking-audio.service';
import { SpeakingAiProvider } from './services/speaking-ai-provider.service';
import { SpeakingGradingWorker } from './workers/speaking-grading.worker';
import { SpeakingGradingController } from './controllers/speaking-grading.controller';

@Module({
  imports: [AuthModule, WritingAssessmentModule],
  controllers: [TestAttemptsController, PracticeAttemptsController, SpeakingGradingController],
  providers: [AssessmentPaperFactory, ObjectiveGraderService, TestAttemptsRepository, TestAttemptsService, PracticeAttemptsService, StudentDashboardService, AttemptExpiryWorker,
    SpeakingGradingRepository, SpeakingAiConfig, SpeakingAudioService, SpeakingAiProvider, SpeakingGradingWorker],
  exports: [TestAttemptsService, PracticeAttemptsService],
})
export class TestAttemptsModule {}
