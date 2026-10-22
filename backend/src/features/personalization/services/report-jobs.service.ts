import { Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { AuthUser } from '../../auth/types/auth-user.type';
import { LearningGoalRow, LearningInsightRow, StudyPlanRow } from '../types/personalization.type';
import { LearningInsightsRepository } from '../repositories/learning-insights.repository';
import { LearningGoalsRepository } from '../repositories/learning-goals.repository';
import { StudyPlansRepository } from '../repositories/study-plans.repository';
import { PlanProgressRepository } from '../repositories/plan-progress.repository';
import { SnapshotService } from './snapshot.service';
import { PlanCandidatesService } from './plan-candidates.service';
import { PersonalizationClock } from './personalization-clock';
import { PersonalizationAiService } from './personalization-ai.service';
import { GoalsService } from './goals.service';
import { addDays, localDay } from '../policies/calendar';
import { nextReportDelivery, planWindow, reportWeeks } from '../policies/report-schedule';
import { snapshotHash } from '../policies/learner-snapshot';
import { REPORT_PROMPT_VERSION, ReportJob, ReportKind, reportSnapshot, resolveAiItems, WeeklyContent } from '../ai/report.contract';
import { FINAL_PROMPT_VERSION, FinalContent } from '../ai/final.contract';
import { queueFinalReport } from './final-report-queue';

@Injectable()
export class ReportJobsService {
  private readonly logger = new Logger(ReportJobsService.name);
  constructor(
    private readonly db: DataSource,
    private readonly goals: GoalsService,
    private readonly goalRepository: LearningGoalsRepository,
    private readonly insights: LearningInsightsRepository,
    private readonly snapshots: SnapshotService,
    private readonly candidates: PlanCandidatesService,
    private readonly plans: StudyPlansRepository,
    private readonly progress: PlanProgressRepository,
    private readonly clock: PersonalizationClock,
    private readonly ai: PersonalizationAiService,
  ) {}

  /** A transaction owning the learner lock also owns goal/plan scheduling. */
  async queueStartLocked(manager: EntityManager, goal: LearningGoalRow) {
    if (goal.status !== 'ACTIVE' || localDay(this.clock.now(), goal.timezone) >= addDays(goal.start_date, 7)) return;
    await this.enqueueLocked(manager, goal, 0);
  }

  async scheduleBatch() {
    const now = this.clock.now();
    await this.scheduleFinalBatch();
    // Select only missing periods so the first 50 old goals cannot starve later learners.
    const due = await this.db.query<Array<{ goal_id: string; user_id: string; week: number }>>(
      `SELECT g.id goal_id,g.user_id,w.week FROM learning_goals g
       JOIN users u ON u.id=g.user_id JOIN roles r ON r.id=u.role_id
       CROSS JOIN LATERAL generate_series(0,(g.duration_days-1)/7) w(week)
       WHERE u.status='ACTIVE' AND u.deleted_at IS NULL AND r.code='STUDENT' AND g.status<>'CANCELLED'
       AND ((w.week=0 AND g.status='ACTIVE' AND ($1::timestamptz AT TIME ZONE g.timezone)::date<g.start_date+7)
         OR (w.week>0 AND ((g.start_date+w.week*7)::timestamp AT TIME ZONE g.timezone)<=LEAST($1::timestamptz,COALESCE(g.ended_at,$1::timestamptz))))
       AND NOT EXISTS(SELECT 1 FROM learning_insights i WHERE i.goal_id=g.id AND i.period_key=CASE WHEN w.week=0 THEN 'START' ELSE 'W'||w.week END)
       ORDER BY g.start_date,w.week,g.id LIMIT 50`, [now],
    );
    for (const period of due) {
      try {
        await this.db.transaction(async manager => {
          const [lock] = await manager.query<Array<{ id: string }>>('SELECT id FROM users WHERE id=$1 FOR UPDATE SKIP LOCKED', [period.user_id]);
          if (!lock) return;
          const goal = await this.goalRepository.findById(period.user_id, period.goal_id, manager);
          if (!goal || goal.status === 'CANCELLED') return;
          if (period.week === 0) await this.queueStartLocked(manager, goal);
          else await this.enqueueLocked(manager, goal, period.week);
        });
      } catch {
        this.logger.warn('One report period could not be scheduled; retrying on the next run.');
      }
    }
    // Disabled AI must never leave a report stuck at PENDING or spend requests.
    if (!this.ai.enabled) {
      await this.db.transaction(async manager => {
        const rows = await manager.query<Array<LearningInsightRow & { timezone: string }>>(
          `SELECT i.*,u.timezone FROM learning_insights i JOIN users u ON u.id=i.user_id
           WHERE i.kind IN ('PLAN_START','WEEKLY','MIDTERM','FINAL') AND i.snapshot ? 'learner' AND
             (i.status IN ('PENDING','FAILED') OR (i.status='FALLBACK' AND i.retry_count>3))
           ORDER BY i.created_at LIMIT 50 FOR UPDATE OF i SKIP LOCKED`,
        );
        for (const row of rows) {
          await manager.query("UPDATE learning_insights SET status='FALLBACK',retry_count=0,next_retry_at=NULL,updated_at=now() WHERE id=$1", [row.id]);
          await this.scheduleFallbackLocked(manager, row, row.timezone);
        }
      });
    } else {
      // A changed provider/model/prompt is an explicit recovery opportunity, not an endless retry loop.
      await this.db.query(
        `UPDATE learning_insights SET retry_count=0,next_retry_at=NULL,
         content=jsonb_set(COALESCE(content,'{}'::jsonb),'{generationKey}',to_jsonb($1::text))
         WHERE id IN (SELECT id FROM learning_insights WHERE kind IN ('PLAN_START','WEEKLY','MIDTERM','FINAL')
           AND status='FALLBACK' AND retry_count>3 AND content->>'generationKey' IS DISTINCT FROM $1
           ORDER BY created_at LIMIT 50 FOR UPDATE SKIP LOCKED)`, [this.ai.configurationKey],
      );
    }
  }

  private async scheduleFinalBatch() {
    // Also recover goals ended before GĐ8 was deployed or while the worker was stopped.
    const due = await this.db.query<Array<{ id: string; user_id: string }>>(
      `SELECT g.id,g.user_id FROM learning_goals g
       JOIN users u ON u.id=g.user_id JOIN roles r ON r.id=u.role_id
       WHERE u.status='ACTIVE' AND u.deleted_at IS NULL AND r.code='STUDENT' AND g.ended_at<=$1
         AND (g.status IN ('COMPLETED','EXPIRED') OR (g.status='REPLACED' AND
           (g.ended_at AT TIME ZONE g.timezone)::date-g.start_date+1>=3))
         AND NOT EXISTS(SELECT 1 FROM learning_insights i WHERE i.goal_id=g.id AND i.kind='FINAL' AND i.snapshot ? 'learner')
       ORDER BY g.ended_at,g.id LIMIT 50`, [this.clock.now()],
    );
    for (const target of due) {
      try {
        await this.db.transaction(async manager => {
          const [lock] = await manager.query('SELECT id FROM users WHERE id=$1 FOR UPDATE SKIP LOCKED', [target.user_id]);
          if (!lock) return;
          const goal = (await this.goalRepository.findById(target.user_id, target.id, manager))!;
          await queueFinalReport(manager, goal.id);
          const [row] = await manager.query<LearningInsightRow[]>(
            "SELECT * FROM learning_insights WHERE goal_id=$1 AND kind='FINAL' AND NOT(snapshot ? 'learner') FOR UPDATE SKIP LOCKED", [goal.id]);
          if (!row) return;
          const [boundary] = await manager.query<Array<{ cutoff: Date }>>(
            "SELECT LEAST(ended_at,((start_date+duration_days)::timestamp AT TIME ZONE timezone)-interval '1 millisecond') cutoff FROM learning_goals WHERE id=$1", [goal.id]);
          const full = await this.snapshots.build({ id: goal.user_id, role: 'STUDENT' } as AuthUser, goal, { kind: 'FINAL' }, boundary.cutoff);
          const learner = reportSnapshot(full, full.cumulative.completed);
          const bands: Record<string, number> = { A1: 1, A2: 2, B1: 3, B2: 4, C: 5, C1: 5, C2: 6 };
          const estimate = learner.band.overallEstimate;
          const job: ReportJob = {
            snapshotVersion: full.snapshotVersion, learner, candidates: [],
            plan: { weekIndex: 0, startsOn: goal.start_date, endsOn: localDay(boundary.cutoff, goal.timezone),
              days: 0, requiredPace: 0, remainingTests: 0 },
            promptVersion: FINAL_PROMPT_VERSION,
            outcome: { lifecycle: goal.status, testTargetReached: full.cumulative.completed >= goal.target_test_count,
              targetReachedOn: goal.target_reached_at ? localDay(goal.target_reached_at, goal.timezone) : null,
              bandTargetStatus: !estimate ? 'INSUFFICIENT_DATA' : bands[estimate] >= bands[goal.target_cefr] ? 'REACHED' : 'NOT_REACHED',
              endedOn: localDay(boundary.cutoff, goal.timezone) },
          };
          const [user] = await manager.query<Array<{ timezone: string }>>('SELECT timezone FROM users WHERE id=$1', [goal.user_id]);
          await manager.query(
            `UPDATE learning_insights SET snapshot=$2,input_hash=$3,snapshot_version=$4,content=$5,status=$6,deliver_at=$7,
             covers_to=$8,updated_at=now() WHERE id=$1`,
            [row.id, job, snapshotHash(job), job.snapshotVersion,
              { ...this.fallback('FINAL'), generationKey: this.ai.configurationKey },
              this.ai.enabled ? 'PENDING' : 'FALLBACK', nextReportDelivery(this.clock.now(), user.timezone), job.outcome!.endedOn],
          );
        });
      } catch {
        this.logger.warn('One final report could not be prepared; retrying on the next run.');
      }
    }
  }

  async scheduleFallbackLocked(manager: EntityManager, row: LearningInsightRow, timezone: string) {
    if (row.kind === 'PLAN_START') return;
    await manager.query(
      `UPDATE learning_insights SET deliver_at=$2 WHERE id=$1 AND notified_at IS NULL
       AND NOT EXISTS(SELECT 1 FROM notifications WHERE dedupe_key='report:'||$1::text||':IN_APP')`,
      [row.id, nextReportDelivery(this.clock.now(), timezone)],
    );
  }

  private async enqueueLocked(manager: EntityManager, goal: LearningGoalRow, week: number) {
    const periodKey = week ? `W${week}` : 'START';
    const [existing] = await manager.query('SELECT id FROM learning_insights WHERE goal_id=$1 AND period_key=$2', [goal.id, periodKey]);
    if (existing) return;
    const now = this.clock.now();
    const kind: ReportKind = week ? reportWeeks(goal.duration_days).find(p => p.week === week)!.kind : 'PLAN_START';
    const from = addDays(goal.start_date, Math.max(0, week - 1) * 7);
    const to = addDays(goal.start_date, week ? week * 7 - 1 : Math.min(7, goal.duration_days) - 1);
    const [boundary] = await manager.query<Array<{ end_at: Date }>>(
      "SELECT (($1::date+1)::timestamp AT TIME ZONE $2)-interval '1 millisecond' end_at", [to, goal.timezone],
    );
    if (week && (boundary.end_at >= now || (goal.ended_at && boundary.end_at >= goal.ended_at))) return;
    const asOf = week ? boundary.end_at : now;
    // Historical reports use the lifecycle as it stood at that boundary.
    const historicalGoal = { ...goal, status: 'ACTIVE' as const, ended_at: null };
    const actor = { id: goal.user_id, role: 'STUDENT' } as AuthUser;
    const full = await this.snapshots.build(actor, historicalGoal, week ? { kind: kind as 'WEEKLY' | 'MIDTERM', from, to } : { kind: 'GOAL' }, asOf);
    const [periodCount] = await manager.query<Array<{ count: number }>>(
      `SELECT count(*)::int count FROM test_attempts WHERE student_id=$1 AND status='SUBMITTED'
       AND submitted_at>=($2::date::timestamp AT TIME ZONE $4)
       AND submitted_at<(($3::date+1)::timestamp AT TIME ZONE $4) AND submitted_at<=$5`, [goal.user_id, from, to, goal.timezone, asOf],
    );
    const candidates = (await this.candidates.build(manager, goal.user_id, full)).map(candidate =>
      candidate.activityType === 'TEST' ? { ...candidate, title: '' } : candidate);
    const plan = planWindow(goal.start_date, goal.duration_days, week + 1);
    const remainingTests = Math.max(0, goal.target_test_count - full.cumulative.completed);
    // At a report boundary the completed day is no longer available for the next week's pace.
    const remainingDays = week ? goal.duration_days - week * 7 : goal.duration_days;
    const job: ReportJob = {
      snapshotVersion: full.snapshotVersion,
      learner: reportSnapshot(full, periodCount.count), candidates,
      plan: { ...plan, requiredPace: Math.ceil(remainingTests / Math.max(1, remainingDays)), remainingTests },
      promptVersion: REPORT_PROMPT_VERSION,
    };
    const inputHash = snapshotHash(job);
    const row = await this.insights.createPending(goal.user_id, {
      kind, goalId: goal.id, periodKey, weekIndex: week || 1, coversFrom: from, coversTo: to,
      snapshotVersion: job.snapshotVersion, inputHash, snapshot: job as unknown as Record<string, unknown>,
    }, manager);
    if (!row) return;
    const [user] = await manager.query<Array<{ timezone: string }>>('SELECT timezone FROM users WHERE id=$1', [goal.user_id]);
    // Numeric fallback is readable immediately, including during provider backoff.
    await manager.query(
      `UPDATE learning_insights SET status=$2,content=$3,deliver_at=$4 WHERE id=$1`,
      [row.id, this.ai.enabled ? 'PENDING' : 'FALLBACK', { ...this.fallback(kind), generationKey: this.ai.configurationKey },
        week ? nextReportDelivery(now, user.timezone) : null],
    );
  }

  fallback(kind: string) {
    if (kind === 'FINAL') return { source: 'RULE', report: {
      headline: 'Tổng kết mục tiêu học tập',
      narrative: 'Mục tiêu đã kết thúc. Xem số bài đã hoàn thành và band ước lượng trong bảng số liệu để chuẩn bị mục tiêu tiếp theo.',
      achievements: [], nextGoalSuggestion: null,
    } };
    return { source: 'RULE', ...(kind !== 'PLAN_START' ? { report: {
      headline: kind === 'MIDTERM' ? 'Báo cáo học tập giữa kỳ' : 'Báo cáo học tập tuần',
      narrative: 'Số liệu học tập đã được cập nhật. Tiếp tục theo lộ trình để tiến tới mục tiêu.',
      wins: [], nextSteps: [],
      ...(kind === 'MIDTERM' ? { progressSoFar: 'Xem tiến độ tích lũy từ đầu mục tiêu trong bảng số liệu.' } : {}),
    } } : {}) };
  }

  async completeLocked(manager: EntityManager, row: LearningInsightRow, content: WeeklyContent | FinalContent, requestId: string, timezone: string) {
    if (row.kind !== 'FINAL') await this.applyPlanLocked(manager, row, content as WeeklyContent);
    const readyAt = this.clock.now();
    await manager.query(
      `UPDATE learning_insights SET status='READY',content=$2,ai_request_id=$3,next_retry_at=NULL,
       deliver_at=CASE WHEN kind='PLAN_START' THEN NULL
         WHEN notified_at IS NULL AND NOT EXISTS(SELECT 1 FROM notifications WHERE dedupe_key='report:'||$1::text||':IN_APP') THEN $4 ELSE deliver_at END,
       updated_at=now() WHERE id=$1`,
      [row.id, row.kind === 'FINAL' ? { report: content, source: 'AI' } : { ...content, source: 'AI' }, requestId, nextReportDelivery(readyAt, timezone)],
    );
  }

  private async applyPlanLocked(manager: EntityManager, row: LearningInsightRow, content: WeeklyContent) {
    const job = row.snapshot as unknown as ReportJob;
    await this.goals.lockUser(manager, row.user_id);
    const goal = await this.goalRepository.findById(row.user_id, row.goal_id!, manager);
    if (!goal || goal.status !== 'ACTIVE') return;
    const today = localDay(this.clock.now(), goal.timezone);
    if (today > job.plan.endsOn) return;
    let plan = await this.plans.findWeek(row.user_id, goal.id, job.plan.weekIndex, manager);
    if (plan) await this.progress.syncPlan(manager, goal, plan, this.clock.now());
    else plan = await this.plans.create(row.user_id, {
      goalId: goal.id, weekIndex: job.plan.weekIndex, startsOn: job.plan.startsOn,
      endsOn: job.plan.endsOn, source: 'RULE',
    }, [], manager);
    await this.replaceUntouched(manager, goal, plan, row.id, resolveAiItems(content, job), today);
  }

  private async replaceUntouched(
    manager: EntityManager, goal: LearningGoalRow, plan: StudyPlanRow, insightId: string,
    proposed: ReturnType<typeof resolveAiItems>, today: string,
  ) {
    const original = await this.plans.findItems(goal.user_id, plan.id, manager);
    // Freeze the whole day once any activity has progress. This also preserves attempt
    // allocation order and avoids moving a submitted attempt out of a completed task.
    const frozenDays = new Set(original.filter(i => i.done_count > 0 || i.completed_at || i.scheduled_on < today).map(i => i.scheduled_on));
    const replacement = proposed.filter(i => i.scheduledOn >= today && !frozenDays.has(i.scheduledOn));
    // A test can be archived while the AI request is in flight. Keep RULE in that case.
    const ids = replacement.flatMap(i => 'testId' in i && i.testId ? [i.testId] : []);
    if (ids.length) {
      const available = await manager.query<Array<{ id: string }>>(
        "SELECT id FROM tests WHERE id=ANY($1::uuid[]) AND status='PUBLISHED' AND archived_at IS NULL AND published_snapshot_id IS NOT NULL FOR SHARE", [ids],
      );
      if (ids.some(id => !available.some(test => test.id === id))) return;
    }
    await manager.query(
      `DELETE FROM study_plan_items WHERE plan_id=$1 AND scheduled_on>=$2 AND NOT(scheduled_on=ANY($3::date[]))
       AND done_count=0 AND completed_at IS NULL`, [plan.id, today, [...frozenDays]],
    );
    await this.plans.insertItems(goal.user_id, plan, replacement, manager);
    await manager.query("UPDATE study_plans SET source='AI',insight_id=$2 WHERE id=$1", [plan.id, insightId]);
    await this.progress.syncPlan(manager, goal, plan, this.clock.now());
  }
}
