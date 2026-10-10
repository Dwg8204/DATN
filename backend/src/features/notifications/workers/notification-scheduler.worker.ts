import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { NotificationsService } from '../services/notifications.service';

@Injectable()
export class NotificationSchedulerWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationSchedulerWorker.name);
  private timer?: NodeJS.Timeout;
  private running = false;
  private currentRun?: Promise<void>;

  constructor(private readonly notifications: NotificationsService) {}

  onModuleInit(): void {
    if (process.env.NOTIFICATION_SCHEDULER_ENABLED === 'false') return;
    this.currentRun = this.run();
    this.timer = setInterval(() => {
      if (!this.running) this.currentRun = this.run();
    }, 5_000);
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
        const processed = await this.notifications.processDueScheduledBatch();
        if (processed < 25) break;
      }
    } catch (error) {
      this.logger.error(
        'Could not process scheduled notifications.',
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.running = false;
    }
  }
}
