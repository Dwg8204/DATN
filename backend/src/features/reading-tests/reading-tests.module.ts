import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PublishedReadingTestsController, ReadingTestsController } from './controllers/reading-tests.controller';
import { ReadingTestsRepository } from './repositories/reading-tests.repository';
import { ReadingTestContentService } from './services/reading-test-content.service';
import { ReadingTestsService } from './services/reading-tests.service';

@Module({ imports: [AuthModule], controllers: [PublishedReadingTestsController, ReadingTestsController],
  providers: [ReadingTestsRepository, ReadingTestContentService, ReadingTestsService], exports: [ReadingTestsService] })
export class ReadingTestsModule {}
