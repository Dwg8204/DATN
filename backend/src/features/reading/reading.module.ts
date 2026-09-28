import { Module } from '@nestjs/common';
import { AdminReadingTestsController } from './controllers/admin-reading-tests.controller';
import { StudentReadingTestsController } from './controllers/student-reading-tests.controller';
import { StudentReadingAttemptsController } from './controllers/student-reading-attempts.controller';
import { ReadingTestsService } from './services/reading-tests.service';
import { ReadingAttemptsService } from './services/reading-attempts.service';
import { ReadingGraderService } from './services/reading-grader.service';
import { ReadingTestsRepository } from './repositories/reading-tests.repository';
import { ReadingAttemptsRepository } from './repositories/reading-attempts.repository';

@Module({
  controllers: [
    AdminReadingTestsController,
    StudentReadingTestsController,
    StudentReadingAttemptsController,
  ],
  providers: [
    ReadingTestsService,
    ReadingAttemptsService,
    ReadingGraderService,
    ReadingTestsRepository,
    ReadingAttemptsRepository,
  ],
  exports: [ReadingTestsService, ReadingAttemptsService, ReadingGraderService],
})
export class ReadingModule {}
