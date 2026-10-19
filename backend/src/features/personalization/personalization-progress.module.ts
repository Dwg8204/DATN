import { Module } from '@nestjs/common';
import { PersonalizationDataModule } from './personalization-data.module';
import { PersonalizationProgressService } from './services/personalization-progress.service';

@Module({
  imports: [PersonalizationDataModule],
  providers: [PersonalizationProgressService],
  exports: [PersonalizationProgressService],
})
export class PersonalizationProgressModule {}
