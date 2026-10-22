import { PersonalizationProgressModule } from '../personalization/personalization-progress.module';
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
import { SharedSpeakingTranscript } from './services/shared-speaking-transcript.service';
import { GroqReferenceProvider } from '../reference-assessment/groq-reference.provider';
import { ReferenceAssessmentService } from '../reference-assessment/reference-assessment.service';
import { ReferenceAssessmentController } from '../reference-assessment/reference-assessment.controller';

@Module({
  imports: [AuthModule, WritingAssessmentModule, PersonalizationProgressModule],
  controllers: [TestAttemptsController, PracticeAttemptsController, SpeakingGradingController, ReferenceAssessmentController],
  providers: [AssessmentPaperFactory, ObjectiveGraderService, TestAttemptsRepository, TestAttemptsService, PracticeAttemptsService, StudentDashboardService, AttemptExpiryWorker,
    SpeakingGradingRepository, SpeakingAiConfig, SpeakingAudioService, SpeakingAiProvider, SpeakingGradingWorker,
    SharedSpeakingTranscript, GroqReferenceProvider, ReferenceAssessmentService],
  exports: [TestAttemptsService, PracticeAttemptsService],
})
export class TestAttemptsModule {}
