import { PersonalizationProgressService } from '../../personalization/services/personalization-progress.service';
import { Injectable, Logger, Optional, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { SpeakingGradingRepository, SpeakingJob } from '../repositories/speaking-grading.repository';
import { SpeakingAiConfig } from '../services/speaking-ai-config.service';
import { SpeakingAiProvider } from '../services/speaking-ai-provider.service';
import { TestAttemptsRepository } from '../repositories/test-attempts.repository';
import { AssessmentPaperFactory } from '../assessments/assessment-paper.factory';
import { AssessmentResult } from '../types/attempt.type';
import { finalizeSpeaking } from '../assessments/speaking-ai-policy';
import { ApplicationError } from '../../../common/errors/application.error';
import { AiError } from '../../../common/ai/ai-error';

@Injectable()
export class SpeakingGradingWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SpeakingGradingWorker.name);
  private timer?: NodeJS.Timeout;
  private running?: Promise<void>;
  constructor(private readonly config: SpeakingAiConfig, private readonly jobs: SpeakingGradingRepository,
    private readonly attempts: TestAttemptsRepository, private readonly papers: AssessmentPaperFactory,
    private readonly provider: SpeakingAiProvider, @Optional() private readonly personalization?: PersonalizationProgressService) {}
  onModuleInit(): void {
    if (!this.config.enabled) return;
    this.timer = setInterval(() => {
      if (!this.running) this.running = this.run().finally(() => { this.running = undefined; });
    }, 5000);
    this.timer.unref();
  }
  async onModuleDestroy(): Promise<void> { if (this.timer) clearInterval(this.timer); await this.running; }
  private async run(): Promise<void> {
    let job: SpeakingJob | null = null;
    try {
      job = await this.jobs.claim(this.config.policyVersion);
      if (!job) return;
      const progress = await this.attempts.progress(job.attempt_id);
      if (!progress?.sealed_at) throw new Error('SPEAKING_PROGRESS_NOT_SEALED');
      const attempt = await this.attempts.find(job.attempt_id, await this.jobs.owner(job.attempt_id));
      if (!attempt || attempt.result?.method !== 'PENDING_AI') throw new Error('SPEAKING_ATTEMPT_NOT_PENDING');
      const paper = await this.papers.getOrBuild(attempt.snapshot_id, 'SPEAKING', () => this.attempts.snapshot(attempt.snapshot_id));
      const recordings = paper.items.flatMap(item => {
        const answer = progress.answers[item.key];
        return answer?.kind === 'AUDIO' && answer.mediaKey.trim() ? [{ key: item.key, mediaKey: answer.mediaKey }] : [];
      });
      const assessed = recordings.length ? await this.provider.assess(job, paper, recordings)
        : { responses: [], estimatedCefr: null, cefrReason: 'Không có bản ghi âm; không đủ dữ liệu để ước lượng CEFR.' };
      const result = finalizeSpeaking(paper, job.responses, assessed, this.config.model, attempt.result as AssessmentResult);
      await this.jobs.finish(job, result, result.speaking?.estimatedCefr ?? null);
      await this.personalization?.afterLearning(attempt.student_id);
    } catch (error) {
      const message = error instanceof ApplicationError ? error.code : error instanceof Error ? error.message : '';
      const code = /^[A-Z][A-Z0-9_]{1,99}$/.test(message) ? message : 'SPEAKING_AI_UNAVAILABLE';
      this.logger.warn(`Speaking grading failed: attempt=${job?.attempt_id ?? 'unclaimed'} run=${job?.failures ?? 0} code=${code}.`); // No audio, text or secrets.
      if (job) {
        const retry = /HTTP_(429|5\d\d)$/.test(code) || ['SPEAKING_AI_UNAVAILABLE','AUDIO_DOWNLOAD_FAILED','SPEAKING_CEFR_INCONSISTENT'].includes(code);
        await this.jobs.fail(job, code, retry, code === 'SPEAKING_BUDGET_EXCEEDED'
          ? 'Đã hết ngân sách chấm AI tháng này. Bản ghi âm vẫn được lưu; bài sẽ được thử lại vào tháng sau.'
          : `Chưa chấm được bài (${code}). ${retry && job.failures < 3 ? 'Hệ thống sẽ thử lại sau.' : 'Vui lòng liên hệ quản trị viên.'}`,
          error instanceof AiError ? error.retryAfterMs : undefined)
          .catch(() => this.logger.warn('Could not persist Speaking grading failure.'));
      }
    }
  }
}
