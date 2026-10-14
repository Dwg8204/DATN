import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
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
      const writing = await this.assessor.assess(input, job.config_snapshot);
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
      this.logger.log(`Writing assessment completed: job=${job.id} elapsedMs=${Date.now() - started}`);
    } catch (error) {
      const failure = error instanceof AiError ? error : new AiError('WRITING_AI_UNAVAILABLE', true);
      const rule = failure.validationRule?.replace(/[^a-zA-Z0-9_.:\[\]-]/g, '').slice(0, 240);
      this.logger.warn(`Writing assessment failed: job=${job?.id ?? 'none'} attempt=${job?.attempt_id ?? 'none'} stage=${stage} code=${failure.code} rule=${rule ?? 'none'} retryable=${failure.retryable} elapsedMs=${Date.now() - started}`);
      if (job) {
        const invalidOutput = [
          'AI_INVALID_RESPONSE',
          'AI_WRITING_EVIDENCE_INVALID',
          'AI_RESPONSE_INCOMPLETE',
        ].includes(failure.code);
        await this.jobs
          .fail(
            job,
            failure.code,
            failure.retryable && (!invalidOutput || job.attempt_count < 2),
            failure.retryAfterMs ??
              Math.min(600000, 30000 * 2 ** (job.attempt_count - 1)) + Math.floor(Math.random() * 3000),
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
