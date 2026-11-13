import {PersonalizationOverviewController} from './controllers/personalization-overview.controller';
import {AdminPlacementController} from './controllers/admin-placement.controller';
import {AbilityProfileController} from './controllers/ability-profile.controller';
import { ErrorPatternsService } from './services/error-patterns.service';
import { Module } from '@nestjs/common';
import { RetrievalModule } from '../retrieval/retrieval.module';
import { TestAttemptsModule } from '../test-attempts/test-attempts.module';
import { PersonalizationDataModule } from './personalization-data.module';
import { PersonalizationController } from './controllers/personalization.controller';
import { SnapshotService } from './services/snapshot.service';
import { MistakeSourceService } from './services/mistake-source.service';
import { MistakeExplanationService } from './services/mistake-explanation.service';
import { RetrievalCandidatesService } from './services/retrieval-candidates.service';
import { PlanCandidatesService } from './services/plan-candidates.service';
import { PlanService } from './services/plan.service';
import { StudyPlanController } from './controllers/study-plan.controller';
import { PersonalizationWorker } from './workers/personalization.worker';
import { RemindersService } from './services/reminders.service';
import { AiSharedModule } from '../ai-shared/ai-shared.module';
import { ConfigModule } from '@nestjs/config';
import { PersonalizationAiService } from './services/personalization-ai.service';
import { CommentsService } from './services/comments.service';
import { CommentGenerationWorker } from './workers/comment-generation.worker';
import { ReportJobsService } from './services/report-jobs.service';
import { ReportsService } from './services/reports.service';
import { ReportsController } from './controllers/reports.controller';
import { InsightContextService } from './services/insight-context.service';

@Module({
  imports: [RetrievalModule, PersonalizationDataModule, TestAttemptsModule, AiSharedModule, ConfigModule],
  controllers: [PersonalizationOverviewController, AdminPlacementController, AbilityProfileController, PersonalizationController, StudyPlanController, ReportsController],
  providers: [
    ErrorPatternsService,
    SnapshotService,
    MistakeSourceService,
    MistakeExplanationService,
    PlanCandidatesService,
    RetrievalCandidatesService,
    PlanService,
    PersonalizationWorker,
    RemindersService,
    PersonalizationAiService,
    CommentsService,
    CommentGenerationWorker,
    ReportJobsService,
    ReportsService,
    InsightContextService,
  ],
  exports: [PersonalizationDataModule, SnapshotService, InsightContextService],
})
export class PersonalizationModule {}
