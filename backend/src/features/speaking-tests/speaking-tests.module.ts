import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PublishedSpeakingTestsController, SpeakingTestsController } from './controllers/speaking-tests.controller';
import { SpeakingTestsRepository } from './repositories/speaking-tests.repository';
import { SpeakingTestContentService } from './services/speaking-test-content.service';
import { SpeakingTestsService } from './services/speaking-tests.service';

@Module({
  imports: [AuthModule],
  controllers: [SpeakingTestsController, PublishedSpeakingTestsController],
  providers: [SpeakingTestsRepository, SpeakingTestContentService, SpeakingTestsService],
  exports: [SpeakingTestsService],
})
export class SpeakingTestsModule {}
