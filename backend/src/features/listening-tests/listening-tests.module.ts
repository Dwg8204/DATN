import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ListeningTestsController, PublishedListeningTestsController } from './controllers/listening-tests.controller';
import { ListeningTestsRepository } from './repositories/listening-tests.repository';
import { ListeningTestContentService } from './services/listening-test-content.service';
import { ListeningTestsService } from './services/listening-tests.service';
import { ListeningAttemptService } from './services/listening-attempt.service';

@Module({
  imports: [AuthModule],
  controllers: [ListeningTestsController, PublishedListeningTestsController],
  providers: [ListeningTestsRepository, ListeningTestContentService, ListeningTestsService, ListeningAttemptService],
  exports: [ListeningTestsService, ListeningAttemptService],
})
export class ListeningTestsModule {}
