import { PersonalizationProgressService } from '../../personalization/services/personalization-progress.service';
import { Injectable, Logger, Optional, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { AiError } from '../../../common/ai/ai-error';
import { AssessmentResult } from '../../test-attempts/types/attempt.type';
import { WritingAiConfig } from '../writing-ai-config.service';
import {
  WritingGradingJobsRepository,
  WritingJob,
  writingInputHash,
} from '../repositories/writing-grading-jobs.repository';
import { WritingInputBuilder } from '../services/writing-input-builder.service';
import { WritingAssessmentService } from '../services/writing-assessment.service';
import { WritingEvidenceError } from '../services/writing-evidence.error';
import { isWritingInvalidOutput, writingAttemptLimit, writingRetryDelay } from '../writing-retry.policy';

@Injectable()
export class WritingAssessmentWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WritingAssessmentWorker.name);
  private timer?: NodeJS.Timeout;
  private running?: Promise<void>;
  constructor(
    private readonly config: WritingAiConfig,
    private readonly jobs: WritingGradingJobsRepository,
    private readonly builder: WritingInputBuilder,
    private readonly assessor: WritingAssessmentService,
    @Optional() private readonly personalization?: PersonalizationProgressService,
  ) {}
  onModuleInit(): void {
    if (!this.config.enabled) return;
    this.timer = setInterval(() => {
      if (!this.running)
        this.running = this.runOnce().finally(() => {
          this.running = undefined;
        });
    }, 5000);
    this.timer.unref();
  }
  async onModuleDestroy(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    await this.running;
  }
  async runOnce(): Promise<void> {
    let job: WritingJob | null = null;
    const started = Date.now();
    let stage = 'claim';
    try {
      job = await this.jobs.claim(this.config.minIntervalMs);
      if (!job) return;
      this.logger.log(`Writing assessment started: job=${job.id} attempt=${job.attempt_id} run=${job.attempt_count} model=${job.config_snapshot.model}`);
      stage = 'build_input';
      const data = await this.jobs.context(job);
      const previous = data.result as AssessmentResult;
      const input = this.builder.build(
        data.snapshot,
        data.answers,
        data.scope,
        job.config_snapshot.feedbackLocale,
        previous.assistance?.revealedKeys,
        job.config_snapshot.inputVersion ?? 1,
      );
      if (writingInputHash(input, job.config_snapshot) !== job.input_hash)
        throw new AiError('WRITING_INPUT_CHANGED');
      stage = 'assess';
      const currentJob = job;
      let lastCallAt = 0;
      const writing = job.config_snapshot.assessmentMode === 'PARTS_V1'
        ? await this.assessor.assessByParts(input, job.config_snapshot, job.input_hash, job.stage_results,
          async cache => {
            await this.jobs.checkpoint(currentJob, cache);
            this.logger.log(`Writing checkpoint: job=${currentJob.id} parts=${Object.keys(cache.parts).length} final=${!!cache.final}`);
          },
          async nextStage => {
            stage = nextStage;
            await this.jobs.checkpoint(currentJob);
            const nextCallAt = lastCallAt + this.config.minIntervalMs;
            while (Date.now() < nextCallAt) {
              await new Promise(resolve => setTimeout(resolve, Math.min(30000, nextCallAt - Date.now())));
              await this.jobs.checkpoint(currentJob);
            }
            await this.jobs.checkpoint(currentJob);
            lastCallAt = Date.now();
            this.logger.log(`Writing provider call: job=${currentJob.id} stage=${stage} model=${currentJob.config_snapshot.model}`);
          }, job.last_validation_failure)
        : await this.assessor.assess(input, job.config_snapshot);
      writing.metadata = {
        provider: job.config_snapshot.provider,
        model: job.config_snapshot.model,
        rubricVersion: job.config_snapshot.rubricVersion,
        promptVersion: job.config_snapshot.promptVersion,
        assessedAt: new Date().toISOString(),
        assessmentRevision: job.assessment_revision,
      };
      const byKey = new Map(
        writing.details.parts.flatMap((part) =>
          part.questions.map((question) => [question.questionKey, question] as const),
        ),
      );
      const result: AssessmentResult = {
        ...previous,
        method: 'AI',
        score: null,
        maxScore: null,
        writing,
        parts: previous.parts.map((part) => ({
          ...part,
          score: null,
          maxScore: null,
        })),
        items: previous.items.map((item) => ({
          ...item,
          outcome: byKey.get(item.key)?.responseStatus === 'BLANK' ? 'SKIPPED' : 'ASSESSED',
        })),
        counts: {
          correct: 0,
          incorrect: 0,
          skipped: [...byKey.values()].filter((question) => question.responseStatus === 'BLANK').length,
        },
      };
      stage = 'persist';
      await this.jobs.finish(job, result);
      await this.personalization?.afterLearning(data.student_id);
      this.logger.log(`Writing assessment completed: job=${job.id} elapsedMs=${Date.now() - started}`);
    } catch (error) {
      const failure = error instanceof AiError ? error : new AiError('WRITING_AI_UNAVAILABLE', true);
      const rule = failure.validationRule?.replace(/[^a-zA-Z0-9_.:[\]-]/g, '').slice(0, 240);
      const location = failure instanceof WritingEvidenceError ? failure.location : undefined;
      const limit = job ? writingAttemptLimit(job.config_snapshot.maxAttempts, failure.code) : 0;
      const retryAllowed = !!job && failure.retryable && job.attempt_count < limit;
      this.logger.warn(`Writing assessment failed: job=${job?.id ?? 'none'} attempt=${job?.attempt_id ?? 'none'} stage=${stage} code=${failure.code} rule=${rule ?? 'none'} path=${location?.path ?? 'none'} questionKey=${location?.questionKey ?? 'none'} criterion=${location?.criterion ?? 'none'} run=${job?.attempt_count ?? 0} limit=${limit} retryable=${failure.retryable} retryAllowed=${retryAllowed} elapsedMs=${Date.now() - started}`);
      if (job) {
        await this.jobs
          .fail(
            job,
            failure.code,
            retryAllowed,
            writingRetryDelay(failure.code, job.attempt_count, failure.retryAfterMs),
            isWritingInvalidOutput(failure.code) ? { stage, rule: rule ?? failure.code, ...location } : undefined,
          )
          .catch((error) => {
            const code = error?.driverError?.code;
            this.logger.warn(
              `Could not persist Writing assessment failure (${typeof code === 'string' && /^[A-Z0-9]+$/.test(code) ? code : 'DATABASE_ERROR'}).`,
            );
          });
      }
    }
  }
}
