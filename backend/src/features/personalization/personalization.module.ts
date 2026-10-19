import { Module } from '@nestjs/common';
import { TestAttemptsModule } from '../test-attempts/test-attempts.module';
import { PersonalizationDataModule } from './personalization-data.module';
import { PersonalizationController } from './controllers/personalization.controller';
import { SnapshotService } from './services/snapshot.service';
import { MistakeSourceService } from './services/mistake-source.service';

@Module({
  imports: [PersonalizationDataModule, TestAttemptsModule],
  controllers: [PersonalizationController],
  providers: [SnapshotService, MistakeSourceService],
  exports: [PersonalizationDataModule, SnapshotService],
})
export class PersonalizationModule {}
