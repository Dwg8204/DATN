import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PublishedWritingTestsController, WritingTestsController } from './controllers/writing-tests.controller';
import { WritingTestsRepository } from './repositories/writing-tests.repository';
import { WritingTestContentService } from './services/writing-test-content.service';
import { WritingTestsService } from './services/writing-tests.service';

@Module({
  imports: [AuthModule],
  controllers: [WritingTestsController, PublishedWritingTestsController],
  providers: [WritingTestsRepository, WritingTestContentService, WritingTestsService],
})
export class WritingTestsModule {}

