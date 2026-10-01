import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DictionaryController } from './controllers/dictionary.controller';
import { DictionaryService } from './services/dictionary.service';

@Module({
  imports: [AuthModule],
  controllers: [DictionaryController],
  providers: [DictionaryService],
})
export class DictionaryModule {}
