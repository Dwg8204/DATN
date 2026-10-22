import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuthUser } from '../../auth/types/auth-user.type';
import { GoalsService } from '../services/goals.service';
import { PlanService } from '../services/plan.service';
import { PersonalizationClock } from '../services/personalization-clock';
import { RemindersService } from '../services/reminders.service';
import { CommentGenerationWorker } from './comment-generation.worker';
import { ReportJobsService } from '../services/report-jobs.service';
import { ReportsService } from '../services/reports.service';

@Injectable()
export class PersonalizationWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PersonalizationWorker.name);
  private timer?: NodeJS.Timeout;
  private pending?: Promise<void>;
  constructor(
    private readonly db: DataSource,
    private readonly goals: GoalsService,
    private readonly plans: PlanService,
    private readonly clock: PersonalizationClock,
    private readonly reminders: RemindersService,
    @Optional() private readonly comments?: CommentGenerationWorker,
    @Optional() private readonly reportJobs?: ReportJobsService,
    @Optional() private readonly reports?: ReportsService,
  ) {}
  onModuleInit() {
    if (process.env.PERSONALIZATION_WORKER_ENABLED !== 'true') return;
    this.tick();
    this.timer = setInterval(() => this.tick(), 60_000);
    this.timer.unref();
  }
  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    await this.pending;
  }
  private tick() {
    if (!this.pending)
      this.pending = this.runBatch()
        .catch(() => {
          this.logger.warn(
            'Personalization reconciliation will retry on the next run.',
          );
        })
        .finally(() => {
          this.pending = undefined;
        });
  }

  async runBatch(): Promise<void> {
    const users = await this.db.query<
      Array<{ user_id: string; updated_at: string }>
    >(
      `SELECT g.user_id,g.updated_at::text updated_at FROM learning_goals g JOIN users u ON u.id=g.user_id JOIN roles r ON r.id=u.role_id
      LEFT JOIN learner_preferences pref ON pref.user_id=g.user_id
      WHERE g.status='ACTIVE' AND u.status='ACTIVE' AND u.deleted_at IS NULL AND r.code='STUDENT'
      AND (
        ($1::timestamptz AT TIME ZONE g.timezone)::date >= g.start_date+g.duration_days
        OR NOT EXISTS(SELECT 1 FROM study_plans p WHERE p.goal_id=g.id AND ($1::timestamptz AT TIME ZONE g.timezone)::date BETWEEN p.starts_on AND p.ends_on)
        OR EXISTS(SELECT 1 FROM study_plans p WHERE p.goal_id=g.id AND p.progress_finalized_at IS NULL AND p.ends_on<($1::timestamptz AT TIME ZONE g.timezone)::date)
        OR (($1::timestamptz AT TIME ZONE g.timezone)::time>=COALESCE(pref.reminder_time,'19:00'::time)
          AND pref.last_reminded_on IS DISTINCT FROM ($1::timestamptz AT TIME ZONE g.timezone)::date)
      ) ORDER BY g.updated_at,g.id LIMIT 50`,
      [this.clock.now()],
    );
    for (const user of users) {
      try {
        await this.db.transaction(async (manager) => {
          const [locked] = await manager.query<Array<{ id: string }>>(
            `SELECT u.id FROM users u JOIN learning_goals g ON g.user_id=u.id
            WHERE u.id=$1 AND g.status='ACTIVE' AND g.updated_at=$2 FOR UPDATE OF u SKIP LOCKED`,
            [user.user_id, user.updated_at],
          );
          if (!locked) return;
          const active = await this.goals.reconcile(
            manager,
            user.user_id,
            this.clock.now(),
          );
          if (active) {
            const current = await this.plans.ensureLocked(
              manager,
              { id: user.user_id, role: 'STUDENT' } as AuthUser,
              active.goal,
            );
            await this.reminders.enqueueLocked(
              manager,
              active.goal,
              active.completed,
              current.plan.id,
              this.clock.now(),
            );
            await manager.query(
              'UPDATE learning_goals SET updated_at=clock_timestamp() WHERE id=$1',
              [active.goal.id],
            );
          }
        });
      } catch {
        this.logger.warn(
          'One learner could not be reconciled; continuing the batch.',
        );
      }
    }
    await this.reportJobs?.scheduleBatch();
    await this.comments?.runBatch();
    await this.reports?.enqueueDeliveries();
  }
}
