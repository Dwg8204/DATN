import { LearnerErrorsWorker } from './learner-errors.worker';
import { LearnerKnowledgeService } from './learner-knowledge.service';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiSharedModule } from '../ai-shared/ai-shared.module';
import { EmbeddingService } from './embedding.service';
import { KnowledgeSearchService } from './knowledge-search.service';
import { QuestionSearchService } from './question-search.service';
import { QuestionEmbeddingWorker } from './question-embedding.worker';
@Module({
  imports: [ConfigModule, AiSharedModule],
  providers: [
    LearnerErrorsWorker,
    LearnerKnowledgeService,
    EmbeddingService,
    KnowledgeSearchService,
    QuestionSearchService,
    QuestionEmbeddingWorker,
  ],
  exports: [LearnerKnowledgeService, LearnerErrorsWorker, EmbeddingService, KnowledgeSearchService, QuestionSearchService],
})
export class RetrievalModule {}
