import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GrammarTestsController, PublishedGrammarTestsController } from './controllers/grammar-tests.controller';
import { GrammarTestsRepository } from './repositories/grammar-tests.repository';
import { GrammarTestContentService } from './services/grammar-test-content.service';
import { GrammarTestsService } from './services/grammar-tests.service';

@Module({
  imports: [AuthModule],
  controllers: [GrammarTestsController, PublishedGrammarTestsController],
  providers: [GrammarTestsRepository, GrammarTestContentService, GrammarTestsService],
})
export class GrammarTestsModule {}

