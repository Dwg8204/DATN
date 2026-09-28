import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AssessmentPaperFactory } from './assessments/assessment-paper.factory';
import { ObjectiveGraderService } from './assessments/objective-grader.service';
import { TestAttemptsController } from './controllers/test-attempts.controller';
import { TestAttemptsRepository } from './repositories/test-attempts.repository';
import { TestAttemptsService } from './services/test-attempts.service';
import { AttemptExpiryWorker } from './workers/attempt-expiry.worker';
import { PracticeAttemptsController } from './controllers/practice-attempts.controller';
import { PracticeAttemptsService } from './services/practice-attempts.service';

@Module({
  imports: [AuthModule],
  controllers: [TestAttemptsController, PracticeAttemptsController],
  providers: [AssessmentPaperFactory, ObjectiveGraderService, TestAttemptsRepository, TestAttemptsService, PracticeAttemptsService, AttemptExpiryWorker],
  exports: [TestAttemptsService],
})
export class TestAttemptsModule {}
