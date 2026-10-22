import { readAbilityProfile } from '../../ai-shared/ability-profile.repository';
import { Injectable } from '@nestjs/common';
import { readWeakTopics } from '../../topics/topic-evidence';
import { DataSource } from 'typeorm';
import { AuthUser } from '../../auth/types/auth-user.type';
import { LearningGoalsRepository } from '../repositories/learning-goals.repository';
import {
  buildLearnerSnapshot,
  snapshotHash,
} from '../policies/learner-snapshot';
import { SnapshotAttempt, SnapshotWindow } from '../types/snapshot.type';
import { LearningGoalRow } from '../types/personalization.type';
import { GoalsService } from './goals.service';
import { MistakeSourceService } from './mistake-source.service';
import { PersonalizationClock } from './personalization-clock';
import { addDays, localDay } from '../policies/calendar';

@Injectable()
export class SnapshotService {
  constructor(
    private readonly db: DataSource,
    private readonly goals: GoalsService,
    private readonly repository: LearningGoalsRepository,
    private readonly mistakes: MistakeSourceService,
    private readonly clock: PersonalizationClock,
  ) {}

  async current(actor: AuthUser) {
    const current = await this.goals.current(actor.id);
    const goal = current.goal
      ? await this.repository.findById(actor.id, current.goal.id)
      : null;
    return {
      ...current,
      snapshot: goal ? await this.build(actor, goal, { kind: 'GOAL' }) : null,
    };
  }

  async build(
    actor: AuthUser,
    goal: LearningGoalRow | null,
    window: SnapshotWindow,
    asOf = this.clock.now(),
  ) {
    const [user] = await this.db.query<Array<{ timezone: string }>>(
      'SELECT timezone FROM users WHERE id=$1',
      [actor.id],
    );
    if (goal && goal.user_id !== actor.id)
      throw new Error('Snapshot owner mismatch');
    const timezone = goal?.timezone ?? user.timezone;
    const end = goal?.ended_at && goal.ended_at < asOf ? goal.ended_at : asOf;
    const from = goal?.start_date ?? '1970-01-01';
    const until = goal
      ? addDays(goal.start_date, goal.duration_days)
      : addDays(localDay(end, timezone), 1);
    const params = [actor.id, from, until, timezone, end];
    const where = `student_id=$1 AND status='SUBMITTED' AND submitted_at >= ($2::date::timestamp AT TIME ZONE $4)
      AND submitted_at < ($3::date::timestamp AT TIME ZONE $4) AND submitted_at <= $5`;
    const scoreFields =
      'id,student_id,component,purpose,scope,part_number,status,submitted_at,score,max_score,estimated_cefr,result';
    const period =
      window.kind === 'WEEKLY' || window.kind === 'MIDTERM' ? window : null;
    const scoreQuery = period
      ? `WITH cumulative AS (SELECT ${scoreFields} FROM test_attempts WHERE ${where} ORDER BY submitted_at DESC,id DESC LIMIT 200),
      period AS (SELECT ${scoreFields} FROM test_attempts WHERE ${where} AND submitted_at >= ($6::date::timestamp AT TIME ZONE $4)
        AND submitted_at < (($7::date+1)::timestamp AT TIME ZONE $4) ORDER BY submitted_at DESC,id DESC LIMIT 200)
      SELECT * FROM cumulative UNION SELECT * FROM period`
      : window.kind === 'COMMENT'
        ? `SELECT ${scoreFields} FROM test_attempts WHERE ${where} ORDER BY submitted_at DESC,id ASC LIMIT 20`
        : `SELECT ${scoreFields} FROM test_attempts WHERE ${where} ORDER BY submitted_at DESC,id DESC LIMIT 200`;
    const [attempts, scoredAttempts, reviews, [vocab], planItems, mistakes] =
      await Promise.all([
        this.db.query<SnapshotAttempt[]>(
          `SELECT id,student_id,component,purpose,scope,part_number,status,submitted_at FROM test_attempts WHERE ${where} ORDER BY submitted_at DESC,id DESC`,
          params,
        ),
        this.db.query<SnapshotAttempt[]>(
          scoreQuery,
          period ? [...params, period.from, period.to] : params,
        ),
        this.db.query<Array<{ reviewed_at: Date }>>(
          `SELECT e.reviewed_at FROM vocabulary_review_events e JOIN user_notebook_items n ON n.id=e.notebook_item_id
        WHERE n.user_id=$1 AND e.reviewed_at >= ($2::date::timestamp AT TIME ZONE $4) AND e.reviewed_at < ($3::date::timestamp AT TIME ZONE $4) AND e.reviewed_at <= $5 ORDER BY e.reviewed_at`,
          params,
        ),
        this.db.query<Array<{ count: number; active_count: number }>>(
          "SELECT count(*) FILTER(WHERE last_rating='LEARNING')::int count, count(*)::int active_count FROM user_notebook_items WHERE user_id=$1 AND archived_at IS NULL",
          [actor.id],
        ),
        goal
          ? this.db.query<
              Array<{
                scheduledOn: string;
                targetCount: number;
                doneCount: number;
              }>
            >(
              `SELECT i.scheduled_on::text AS "scheduledOn",i.target_count AS "targetCount",i.done_count AS "doneCount"
        FROM study_plan_items i JOIN study_plans p ON p.id=i.plan_id WHERE p.user_id=$1 AND p.goal_id=$2 ORDER BY i.scheduled_on,i.sort_order,i.id`,
              [actor.id, goal.id],
            )
          : Promise.resolve([]),
        this.mistakes.recent(actor, end, timezone),
      ]);
    const [bounds] = await this.db.query('SELECT $1::date::timestamp AT TIME ZONE $2 AS start', [period?.from ?? from, timezone]);
    const weakTopics = await readWeakTopics(this.db.manager, actor.id, bounds.start, end);
    const abilityProfile = await readAbilityProfile(this.db.manager, actor.id, end);
    const snapshot = buildLearnerSnapshot(
      actor.id,
      goal,
      window,
      end,
      {
        attempts,
        scoredAttempts,
        abilityProfile,
        reviewDates: reviews.map((row) => row.reviewed_at),
        learningCount: vocab.count,
        activeCount: vocab.active_count,
        mistakes,
        planItems,
        weakTopics,
      },
      timezone,
    );
    return { ...snapshot, inputHash: snapshotHash(snapshot) };
  }
}
