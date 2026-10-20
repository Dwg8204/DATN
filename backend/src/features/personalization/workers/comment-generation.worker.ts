import { Injectable, Optional } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { AiProviderError } from '../../ai-shared/ai-provider.error';
import { CommentValidationError } from '../ai/comment.contract';
import { LearningInsightRow } from '../types/personalization.type';
import { PersonalizationAiService } from '../services/personalization-ai.service';
import { PersonalizationClock } from '../services/personalization-clock';
import { ReportJobsService } from '../services/report-jobs.service';
import { ReportJob, ReportKind, validateWeeklyContent } from '../ai/report.contract';

const BACKOFF = [15 * 60_000, 60 * 60_000, 4 * 60 * 60_000];

@Injectable()
export class CommentGenerationWorker {
  constructor(
    private readonly db: DataSource,
    private readonly ai: PersonalizationAiService,
    private readonly clock: PersonalizationClock,
    @Optional() private readonly reports?: ReportJobsService,
  ) {}

  async runBatch() {
    if (!this.ai.enabled) return;
    for (let i = 0; i < 50; i++) {
      if (!(await this.processOne())) break;
    }
  }

  private async processOne(): Promise<boolean> {
    return this.db.transaction(async (manager) => {
      // Serialize the feature's calls across processes, keeping quota counts and retries atomic.
      // Network calls have a configured timeout; process death releases locks automatically.
      const [lock] = await manager.query<Array<{ acquired: boolean }>>(
        'SELECT pg_try_advisory_xact_lock(167740,6) acquired',
      );
      if (!lock.acquired) return false;
      const now = this.clock.now();
      const [row] = await manager.query<
        Array<LearningInsightRow & { timezone: string }>
      >(
        `SELECT i.*,u.timezone FROM learning_insights i JOIN users u ON u.id=i.user_id JOIN roles r ON r.id=u.role_id
         WHERE (i.kind='COMMENT' OR ($2 AND i.kind IN ('PLAN_START','WEEKLY','MIDTERM')))
           AND (i.status IN ('PENDING','FAILED') OR ($2 AND i.kind<>'COMMENT' AND i.status='FALLBACK'))
           AND i.retry_count<=3
           AND (i.next_retry_at IS NULL OR i.next_retry_at<=$1)
           AND u.status='ACTIVE' AND u.deleted_at IS NULL AND r.code='STUDENT'
         ORDER BY i.created_at,i.id LIMIT 1 FOR UPDATE OF i SKIP LOCKED`,
        [now, !!this.reports],
      );
      if (!row) return false;
      if (row.kind !== 'COMMENT') {
        const [cached] = await manager.query<LearningInsightRow[]>(
          `SELECT * FROM learning_insights WHERE user_id=$1 AND kind=$2 AND input_hash=$3 AND status='READY' AND id<>$4
           ORDER BY created_at DESC LIMIT 1`, [row.user_id, row.kind, row.input_hash, row.id],
        );
        if (cached?.content && cached.ai_request_id) {
          const { source: _source, ...raw } = cached.content;
          void _source;
          try {
            const content = validateWeeklyContent(raw, row.kind as ReportKind, row.snapshot as unknown as ReportJob);
            await this.reports!.completeLocked(manager, row, content, cached.ai_request_id, row.timezone);
            return true;
          } catch (error) {
            if (!(error instanceof CommentValidationError)) throw error;
          }
        }
      }
      const { gradingFingerprint: _fingerprint, ...snapshot } = row.snapshot;
      void _fingerprint;
      let issues: string[] = [];
      for (let attempt = 0; attempt < 2; attempt++) {
        const quota = await this.quota(manager, row.user_id, row.timezone, now);
        if (quota !== 'OK') {
          await this.defer(
            manager,
            row.id,
            new Date(
              now.getTime() + (quota === 'DAILY' ? 60 * 60_000 : 60_000),
            ),
          );
          return quota === 'DAILY';
        }
        try {
          if (row.kind === 'COMMENT') {
            const result = await this.ai.comment(row.user_id, snapshot, issues);
            await manager.query(
              "UPDATE learning_insights SET status='READY',content=$2,ai_request_id=$3,next_retry_at=NULL,updated_at=now() WHERE id=$1",
              [row.id, result.content, result.requestId],
            );
          } else {
            const result = await this.ai.report(row.user_id, row.kind as ReportKind, row.snapshot as unknown as ReportJob, issues);
            await this.reports!.completeLocked(manager, row, result.content, result.requestId, row.timezone);
          }
          return true;
        } catch (error) {
          if (error instanceof AiProviderError && error.reason === 'QUOTA') {
            await this.defer(
              manager,
              row.id,
              new Date(
                now.getTime() + Math.max(60_000, error.retryAfterMs ?? 0),
              ),
            );
            return false;
          }
          if (error instanceof CommentValidationError && attempt === 0) {
            issues = error.issues;
            continue;
          }
          const exhausted = row.retry_count >= 3;
          await manager.query(
            `UPDATE learning_insights SET status=$2,retry_count=retry_count+1,next_retry_at=$3,updated_at=now() WHERE id=$1`,
            [
              row.id,
              exhausted ? 'FALLBACK' : 'FAILED',
              exhausted
                ? null
                : new Date(now.getTime() + BACKOFF[row.retry_count]),
            ],
          );
          if (exhausted && row.kind !== 'COMMENT')
            await this.reports?.scheduleFallbackLocked(manager, row, row.timezone);
          return true;
        }
      }
      return true;
    });
  }

  private async quota(
    manager: EntityManager,
    userId: string,
    timezone: string,
    now: Date,
  ) {
    const [counts] = await manager.query<
      Array<{ daily: number; minute_count: number }>
    >(
      `SELECT count(*) FILTER (WHERE user_id=$1 AND (started_at AT TIME ZONE $2)::date=($3::timestamptz AT TIME ZONE $2)::date)::int daily,
        count(*) FILTER (WHERE started_at>$3::timestamptz-interval '1 minute')::int minute_count
       FROM ai_requests WHERE purpose IN ('PERSONAL_COMMENT','PERSONAL_PLAN','PERSONAL_WEEKLY','PERSONAL_FINAL') AND started_at >= LEAST(($3::timestamptz AT TIME ZONE $2)::date::timestamp AT TIME ZONE $2,$3::timestamptz-interval '1 minute')`,
      [userId, timezone, now],
    );
    return counts.daily >= 6
      ? 'DAILY'
      : counts.minute_count >= this.ai.maxRpm
        ? 'MINUTE'
        : 'OK';
  }

  private async defer(manager: EntityManager, id: string, until: Date) {
    await manager.query(
      "UPDATE learning_insights SET status='FAILED',next_retry_at=$2,updated_at=now() WHERE id=$1",
      [id, until],
    );
  }
}
