import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ApplicationError } from '../../../common/errors/application.error';
import { AssessmentResult, LockedAttemptRow } from '../../test-attempts/types/attempt.type';
import { WritingAiConfig } from '../writing-ai-config.service';
import { WritingGradingJobsRepository } from '../repositories/writing-grading-jobs.repository';
import { WritingInputBuilder } from './writing-input-builder.service';

@Injectable()
export class WritingAssessmentCoordinator {
  constructor(
    private readonly config: WritingAiConfig,
    private readonly jobs: WritingGradingJobsRepository,
    private readonly builder: WritingInputBuilder,
  ) {}
  get enabled(): boolean {
    return this.config.enabled;
  }
  prepare(result: AssessmentResult, component: string): AssessmentResult {
    return component === 'WRITING' && !this.enabled
      ? { ...result, method: 'UNASSESSED', score: null, maxScore: null }
      : result;
  }
  async enqueue(manager: EntityManager, attempt: LockedAttemptRow): Promise<LockedAttemptRow> {
    if (attempt.component !== 'WRITING' || !this.enabled) return attempt;
    const [data] = await manager.query(
      `SELECT s.snapshot,p.answers,p.sealed_at FROM test_snapshots s
      JOIN attempt_progress p ON p.attempt_id=$1 WHERE s.id=$2`,
      [attempt.id, attempt.snapshot_id],
    );
    if (!data?.sealed_at) throw new Error('WRITING_PROGRESS_NOT_SEALED');
    const locale = 'vi' as const;
    const result = attempt.result as AssessmentResult;
    const input = this.builder.build(
      data.snapshot,
      data.answers,
      attempt.scope,
      locale,
      result.assistance?.revealedKeys,
    );
    return this.jobs.enqueue(manager, attempt, input, this.config.snapshot(locale));
  }
  async status(attempt: LockedAttemptRow, manager?: EntityManager) {
    if (attempt.component !== 'WRITING') return undefined;
    const job =
      attempt.grading_status === 'FAILED' || attempt.grading_status === 'QUEUED'
        ? await this.jobs.status(attempt.id, manager)
        : undefined;
    return {
      enabled: this.enabled,
      errorCode: job?.error_code ?? null,
      retryable: this.enabled && attempt.grading_status === 'FAILED',
      nextRetryAt: job?.status === 'QUEUED' ? job.available_at : null,
    };
  }
  async retry(attemptId: string, userId: string, purpose: 'EXAM' | 'PRACTICE') {
    if (!this.enabled)
      throw new ApplicationError('WRITING_AI_DISABLED', 'Writing assessment is not enabled.', 503);
    const attempt = await this.jobs.retry(attemptId, userId, purpose, (manager, row) =>
      this.enqueue(manager, row),
    );
    return {
      attemptId,
      gradingStatus: attempt.grading_status,
      assessmentRevision: attempt.assessment_revision,
    };
  }
}
