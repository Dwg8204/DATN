import { Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { GoalsService } from './goals.service';
import { PersonalizationClock } from './personalization-clock';

@Injectable()
export class PersonalizationProgressService {
  private readonly logger = new Logger(PersonalizationProgressService.name);
  constructor(
    private readonly db: DataSource,
    private readonly goals: GoalsService,
    private readonly clock: PersonalizationClock,
  ) {}

  /** Call only after the caller's primary transaction commits. Recovery runs in the worker. */
  async afterLearning(userId: string): Promise<void> {
    try {
      await this.db.transaction(async (manager) => {
        await this.goals.lockUser(manager, userId);
        await this.reconcileLocked(manager, userId);
      });
    } catch {
      this.logger.warn(
        'Personalization progress update deferred to reconciliation.',
      );
    }
  }

  reconcileLocked(manager: EntityManager, userId: string) {
    return this.goals.reconcile(manager, userId, this.clock.now());
  }
}
