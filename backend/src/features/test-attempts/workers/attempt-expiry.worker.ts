import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { TestAttemptsService } from '../services/test-attempts.service';

@Injectable()
export class AttemptExpiryWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AttemptExpiryWorker.name);
  private timer?: NodeJS.Timeout;
  private running = false;
  private currentRun?: Promise<void>;

  constructor(private readonly attempts: TestAttemptsService) {}

  onModuleInit(): void {
    if (process.env.ATTEMPT_EXPIRY_WORKER_ENABLED === 'false') return;
    this.timer = setInterval(() => {
      if (!this.running) this.currentRun = this.run();
    }, 15_000);
    this.timer.unref();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    await this.currentRun;
  }

  private async run(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      for (let batch = 0; batch < 10; batch += 1) {
        const processed = await this.attempts.finalizeExpiredBatch();
        if (processed < 25) break;
      }
    } catch (error) {
      this.logger.error('Could not finalize expired test attempts.', error instanceof Error ? error.stack : undefined);
    } finally {
      this.running = false;
    }
  }
}
