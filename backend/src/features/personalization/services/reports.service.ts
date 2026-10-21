import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ApplicationError } from '../../../common/errors/application.error';
import { LearningInsightRow } from '../types/personalization.type';
import { PersonalizationClock } from './personalization-clock';
import { ReportJob } from '../ai/report.contract';

@Injectable()
export class ReportsService {
  constructor(private readonly db: DataSource, private readonly clock: PersonalizationClock) {}

  async list(userId: string, goalId: string | undefined, page = 1) {
    const rows = await this.db.query<LearningInsightRow[]>(
      `SELECT *,covers_from::text covers_from,covers_to::text covers_to FROM learning_insights
       WHERE user_id=$1 AND kind IN ('WEEKLY','MIDTERM','FINAL') AND snapshot ? 'learner' AND ($2::uuid IS NULL OR goal_id=$2)
       ORDER BY learning_insights.covers_to DESC,created_at DESC,id DESC LIMIT 21 OFFSET $3`, [userId, goalId ?? null, (page - 1) * 20],
    );
    return { items: rows.slice(0, 20).map(row => this.present(row)), page, hasMore: rows.length > 20 };
  }

  async read(userId: string, id: string) {
    const [row] = await this.db.query<LearningInsightRow[]>(
      `WITH viewed AS (UPDATE learning_insights SET read_at=COALESCE(read_at,$3)
       WHERE id=$1 AND user_id=$2 AND kind IN ('WEEKLY','MIDTERM','FINAL') AND snapshot ? 'learner' RETURNING *)
       SELECT *,covers_from::text covers_from,covers_to::text covers_to FROM viewed`, [id, userId, this.clock.now()],
    );
    if (!row) throw new ApplicationError('REPORT_NOT_FOUND', 'Learning report not found.', 404);
    return this.present(row);
  }

  private present(row: LearningInsightRow) {
    const job = row.snapshot as unknown as ReportJob;
    return {
      id: row.id, goalId: row.goal_id, kind: row.kind, weekIndex: row.week_index,
      coversFrom: row.covers_from, coversTo: row.covers_to, status: row.status,
      source: row.content?.source ?? 'RULE', content: row.content?.report ?? null,
      snapshot: job.learner, outcome: job.outcome ?? null, deliverAt: row.deliver_at, readAt: row.read_at,
    };
  }

  /** Queue web + email together. Notification delivery records actual sent timestamps. */
  async enqueueDeliveries() {
    await this.db.transaction(async manager => {
      const rows = await manager.query<Array<LearningInsightRow & { email_enabled: boolean }>>(
        `SELECT i.*,COALESCE(p.email_report_enabled,true) email_enabled FROM learning_insights i
         JOIN users u ON u.id=i.user_id JOIN roles r ON r.id=u.role_id
         LEFT JOIN learner_preferences p ON p.user_id=i.user_id
         WHERE i.kind IN ('WEEKLY','MIDTERM','FINAL') AND i.status IN ('READY','FALLBACK')
           AND i.deliver_at<=$1 AND i.notified_at IS NULL AND u.status='ACTIVE' AND u.deleted_at IS NULL AND r.code='STUDENT'
           AND NOT EXISTS(SELECT 1 FROM notifications n WHERE n.dedupe_key='report:'||i.id::text||':IN_APP')
         ORDER BY i.deliver_at,i.id LIMIT 50 FOR UPDATE OF i SKIP LOCKED`, [this.clock.now()],
      );
      for (const row of rows) {
        const job = row.snapshot as unknown as ReportJob;
        const report = row.content?.report as { headline?: string } | undefined;
        const title = report?.headline ?? (row.kind === 'MIDTERM' ? 'Báo cáo học tập giữa kỳ' : 'Báo cáo học tập tuần');
        // The email contains only a headline and three code-derived aggregates.
        const summary = `${row.kind === 'FINAL' ? 'Bài đã nộp trong mục tiêu' : 'Bài đã nộp trong tuần'}: ${job.learner.period.completed}\nNgày có học: ${job.learner.period.activeDays}\nTiến độ mục tiêu: ${job.learner.goal?.completed ?? 0}/${job.learner.goal?.targetTests ?? 0} bài`;
        for (const channel of row.email_enabled ? ['IN_APP', 'EMAIL'] : ['IN_APP']) {
          await manager.query(
            `WITH queued AS (
              INSERT INTO notifications(title,content,type,channel,audience_type,action_path,status,scheduled_at,dedupe_key)
              VALUES($1,$2,'LEARNING_REPORT',$3,'SELECTED_USERS',$4,'SCHEDULED',$5,$6)
              ON CONFLICT(dedupe_key) DO NOTHING RETURNING id)
             INSERT INTO notification_recipients(notification_id,user_id,delivery_status)
             SELECT id,$7,'PENDING' FROM queued ON CONFLICT(notification_id,user_id) DO NOTHING`,
            [title, summary, channel, `/profile/reports/${row.id}`, row.deliver_at, `report:${row.id}:${channel}`, row.user_id],
          );
        }
      }
    });
  }
}
