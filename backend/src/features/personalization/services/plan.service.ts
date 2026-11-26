import { Injectable, Logger, Optional } from "@nestjs/common";
import { ConfigService } from '@nestjs/config';
import { TOPIC_COVERAGE_SQL } from "../../topics/topics.service";
import { DataSource, EntityManager } from "typeorm";
import { ApplicationError } from "../../../common/errors/application.error";
import { AuthUser } from "../../auth/types/auth-user.type";
import { StudyPlansRepository } from "../repositories/study-plans.repository";
import { PlanProgressRepository } from "../repositories/plan-progress.repository";
import {
  LearningGoalRow,
  StudyPlanItemRow,
  StudyPlanRow,
} from "../types/personalization.type";
import { addDays, dayNumber, localDay } from "../policies/calendar";
import { buildRulePlan } from "../policies/rule-plan";
import { GoalsService } from "./goals.service";
import { SnapshotService } from "./snapshot.service";
import { PlanCandidatesService } from "./plan-candidates.service";
import { PersonalizationClock } from "./personalization-clock";
import { MistakeSourceService } from "./mistake-source.service";
import { ReportJobsService } from "./report-jobs.service";
import { missingPlacement } from '../../ai-shared/placement';
import { AbilityProfile } from '../../ai-shared/ability-profile';
import { readAbilityProfile } from '../../ai-shared/ability-profile.repository';

@Injectable()
export class PlanService {
  private readonly logger = new Logger(PlanService.name);
  constructor(
    private readonly db: DataSource,
    private readonly goals: GoalsService,
    private readonly plans: StudyPlansRepository,
    private readonly progress: PlanProgressRepository,
    private readonly snapshots: SnapshotService,
    private readonly candidates: PlanCandidatesService,
    private readonly clock: PersonalizationClock,
    private readonly mistakes: MistakeSourceService,
    @Optional() private readonly reports?: ReportJobsService,
    @Optional() private readonly config?: ConfigService,
  ) {}

  /** One-time S1 repair; dry run does not lock, sync or write. */
  async replanCurrent(apply = false) {
    const rows = await this.db.query<
      Array<{ user_id: string; goal_id: string; id: string }>
    >(
      `SELECT p.user_id,p.goal_id,p.id FROM study_plans p JOIN learning_goals g ON g.id=p.goal_id
      WHERE g.status='ACTIVE' AND ($1::timestamptz AT TIME ZONE g.timezone)::date BETWEEN p.starts_on AND p.ends_on
        AND ($1::timestamptz AT TIME ZONE g.timezone)::date < g.start_date+g.duration_days
        AND NOT EXISTS(SELECT 1 FROM audit_logs a WHERE a.action='PERSONALIZATION_REPLAN_S1' AND a.entity_id=p.id)
      ORDER BY p.user_id,p.id`,
      [this.clock.now()],
    );
    if (!apply) return { eligible: rows.length, updated: 0 };
    if (!this.reports) throw new Error("REPORT_JOBS_REQUIRED");
    let updated = 0;
    for (const row of rows)
      await this.db.transaction(async (manager) => {
        await this.goals.lockUser(manager, row.user_id);
        if (
          (
            await manager.query(
              "SELECT 1 FROM audit_logs WHERE action='PERSONALIZATION_REPLAN_S1' AND entity_id=$1",
              [row.id],
            )
          ).length
        )
          return;
        const [goal] = await manager.query<LearningGoalRow[]>(
          "SELECT *,start_date::text start_date FROM learning_goals WHERE id=$1 AND status='ACTIVE'",
          [row.goal_id],
        );
        if (!goal) return;
        const today = localDay(this.clock.now(), goal.timezone);
        const week =
          Math.floor((dayNumber(today) - dayNumber(goal.start_date)) / 7) + 1;
        const plan = await this.plans.findWeek(
          row.user_id,
          goal.id,
          week,
          manager,
        );
        if (!plan || plan.id !== row.id || today > plan.ends_on) return;
        const actor = { id: row.user_id, role: "STUDENT" } as AuthUser;
        // Keep existing partial/completed days frozen; replace only untouched days.
        const snapshot = await this.snapshots.build(
          actor,
          goal,
          { kind: "GOAL" },
          this.clock.now(),
          manager,
        );
        const original = await this.plans.findItems(
          row.user_id,
          plan.id,
          manager,
        );
        const frozen = original.filter(
          (i) => i.done_count > 0 || i.completed_at || i.scheduled_on < today,
        );
        const candidates = await this.candidates.build(
          manager,
          row.user_id,
          snapshot,
          week,
        );
        const frozenTests = new Set(
          original
            .filter(
              (i) =>
                frozen.some((f) => f.scheduled_on === i.scheduled_on) &&
                i.test_id,
            )
            .map((i) => i.test_id),
        );
        const preferred = candidates.filter(
          (c) => c.activityType !== "TEST" || !frozenTests.has(c.testId),
        );
        const pool = preferred.some((c) => c.activityType === "TEST")
          ? preferred
          : candidates;
        const items = buildRulePlan(
          pool,
          today,
          plan.ends_on,
          snapshot.goal?.requiredPace ?? 1,
          Math.max(0, goal.target_test_count - (snapshot.goal?.completed ?? 0)),
        );
        const replaced = await this.reports!.replaceUntouched(
          manager,
          goal,
          plan,
          null,
          items,
          today,
        );
        if (!replaced) return;
        // Preserve recorded progress on frozen days during this repair.
        for (const item of frozen)
          await manager.query(
            "UPDATE study_plan_items SET done_count=$2,completed_at=$3 WHERE id=$1",
            [item.id, item.done_count, item.completed_at],
          );
        await manager.query(
          "INSERT INTO audit_logs(actor_id,action,entity_type,entity_id,changes) VALUES($1,'PERSONALIZATION_REPLAN_S1','STUDY_PLAN',$2,$3)",
          [
            row.user_id,
            plan.id,
            { frozenDays: [...new Set(frozen.map((i) => i.scheduled_on))] },
          ],
        );
        updated++;
      });
    return { eligible: rows.length, updated };
  }

  private get placementReplanEnabled() {
    return (
      String(this.config?.get("PERSONALIZATION_RAG_ENABLED", false)) === "true"
    );
  }

  /** Read-only readiness check. Dashboard performs its existing POST sync when true. */
  private async placementReplanNeeded(
    manager: EntityManager,
    goal: LearningGoalRow,
    plan: StudyPlanRow,
    profile?: AbilityProfile,
  ) {
    const today = localDay(this.clock.now(), goal.timezone);
    if (
      !this.placementReplanEnabled ||
      !this.reports ||
      goal.status !== "ACTIVE" ||
      plan.user_id !== goal.user_id ||
      plan.goal_id !== goal.id ||
      plan.replanned_after_placement_at ||
      plan.week_index !==
        Math.floor((dayNumber(today) - dayNumber(goal.start_date)) / 7) + 1 ||
      today < plan.starts_on ||
      today > plan.ends_on ||
      today >= addDays(goal.start_date, goal.duration_days)
    )
      return false;
    const [placement] = await manager.query(
      "SELECT 1 FROM study_plan_items WHERE plan_id=$1 AND reason='PLACEMENT' LIMIT 1",
      [plan.id],
    );
    if (!placement) return false;
    return (
      missingPlacement(
        profile ??
          (await readAbilityProfile(manager, goal.user_id, this.clock.now())),
      ).length === 0
    );
  }

  /** Caller must own the user lock, always acquired before the plan row lock. */
  async replanAfterPlacementLocked(
    manager: EntityManager,
    goal: LearningGoalRow,
    plan: StudyPlanRow,
  ) {
    if (!this.placementReplanEnabled || !this.reports) return false;
    if (!manager.queryRunner?.isTransactionActive)
      throw new Error("PLAN_TRANSACTION_REQUIRED");
    const [fresh] = await manager.query<StudyPlanRow[]>(
      `SELECT *,starts_on::text starts_on,ends_on::text ends_on FROM study_plans
       WHERE id=$1 AND user_id=$2 AND goal_id=$3 FOR UPDATE`,
      [plan.id, goal.user_id, goal.id],
    );
    if (!fresh || !(await this.placementReplanNeeded(manager, goal, fresh)))
      return false;
    const now = this.clock.now(),
      today = localDay(now, goal.timezone);
    // Reconcile submitted work before deciding which entire days must stay frozen.
    await this.progress.syncPlan(manager, goal, fresh, now);
    const original = await this.plans.findItems(
      goal.user_id,
      fresh.id,
      manager,
    );
    const frozenDays = new Set(
      original
        .filter(
          (i) => i.scheduled_on < today || i.done_count > 0 || i.completed_at,
        )
        .map((i) => i.scheduled_on),
    );
    const openDays = Array.from(
      { length: dayNumber(fresh.ends_on) - dayNumber(today) + 1 },
      (_, i) => addDays(today, i),
    ).filter((day) => !frozenDays.has(day));
    const actor = { id: goal.user_id, role: "STUDENT" } as AuthUser;
    const snapshot = await this.snapshots.build(
      actor,
      goal,
      { kind: "GOAL" },
      now,
      manager,
    );
    const candidates = await this.candidates.build(
      manager,
      goal.user_id,
      snapshot,
      fresh.week_index,
    );
    const frozenTests = new Set(
      original
        .filter((i) => frozenDays.has(i.scheduled_on) && i.test_id)
        .map((i) => i.test_id),
    );
    const preferred = candidates.filter(
      (c) => c.activityType !== "TEST" || !frozenTests.has(c.testId),
    );
    const pool = preferred.some((c) => c.activityType === "TEST")
      ? preferred
      : candidates;
    // Build only as many days as can change, then map them to actual dates so a frozen
    // day does not consume the best candidate and drop it from the remaining week.
    const items = openDays.length
      ? buildRulePlan(
          pool,
          today,
          addDays(today, openDays.length - 1),
          snapshot.goal?.requiredPace ?? 1,
          Math.max(0, goal.target_test_count - (snapshot.goal?.completed ?? 0)),
        ).map((item) => ({
          ...item,
          scheduledOn: openDays[dayNumber(item.scheduledOn) - dayNumber(today)],
        }))
      : [];
    if (openDays.length && !items.length) return false;
    if (
      !(await this.reports.replaceUntouched(
        manager,
        goal,
        fresh,
        null,
        items,
        today,
      ))
    )
      return false;
    // Preserve every stored value on frozen days, including manually reviewed items.
    for (const item of original.filter((i) => frozenDays.has(i.scheduled_on)))
      await manager.query(
        "UPDATE study_plan_items SET done_count=$2,completed_at=$3 WHERE id=$1",
        [item.id, item.done_count, item.completed_at],
      );
    await manager.query(
      "UPDATE study_plans SET replanned_after_placement_at=$2 WHERE id=$1",
      [fresh.id, now],
    );
    Object.assign(plan, fresh, {
      source: "RULE",
      insight_id: null,
      replanned_after_placement_at: now,
    });
    return true;
  }

  async replanAfterPlacementBatch() {
    if (!this.placementReplanEnabled || !this.reports) return 0;
    const rows = await this.db.query<
      Array<{ id: string; user_id: string; goal_id: string }>
    >(
      `
      SELECT p.id,p.user_id,p.goal_id FROM study_plans p JOIN learning_goals g ON g.id=p.goal_id
      JOIN users u ON u.id=p.user_id JOIN roles r ON r.id=u.role_id
      WHERE g.status='ACTIVE' AND u.status='ACTIVE' AND u.deleted_at IS NULL AND r.code='STUDENT'
        AND p.replanned_after_placement_at IS NULL
        AND ($1::timestamptz AT TIME ZONE g.timezone)::date BETWEEN p.starts_on AND p.ends_on
        AND ($1::timestamptz AT TIME ZONE g.timezone)::date < g.start_date+g.duration_days
        AND EXISTS(SELECT 1 FROM study_plan_items i WHERE i.plan_id=p.id AND i.reason='PLACEMENT')
        AND (SELECT count(DISTINCT a.component) FROM test_attempts a WHERE a.student_id=p.user_id
          AND a.status='SUBMITTED' AND a.scope='FULL_SKILL' AND a.submitted_at<=$1 AND a.result->>'method'='OBJECTIVE'
          AND a.component IN ('GRAMMAR_VOCAB','READING','LISTENING')
          AND (a.estimated_cefr IN ('A1','A2','B1','B2','C','C1','C2') OR
            (a.score IS NOT NULL AND a.max_score>0 AND a.score BETWEEN 0 AND a.max_score AND
              (a.component='GRAMMAR_VOCAB' OR (a.component='READING' AND
                (SELECT count(DISTINCT (part->>'partNumber')::int) FROM jsonb_array_elements(COALESCE(a.result->'parts','[]'::jsonb)) part
                  WHERE (part->>'partNumber')::int BETWEEN 1 AND 4 AND (part->>'maxScore')::numeric>0)=4)))))=3
      ORDER BY p.starts_on,p.id LIMIT 50`,
      [this.clock.now()],
    );
    let updated = 0;
    for (const row of rows) {
      try {
        await this.db.transaction(async (manager) => {
          // User first, plan second: same order as sync/report/learning transactions.
          const [user] = await manager.query(
            "SELECT id FROM users WHERE id=$1 FOR UPDATE SKIP LOCKED",
            [row.user_id],
          );
          if (!user) return;
          await this.goals.lockUser(manager, row.user_id);
          const [goal] = await manager.query<LearningGoalRow[]>(
            "SELECT *,start_date::text start_date FROM learning_goals WHERE id=$1 AND user_id=$2 AND status='ACTIVE'",
            [row.goal_id, row.user_id],
          );
          const [plan] = await manager.query<StudyPlanRow[]>(
            "SELECT *,starts_on::text starts_on,ends_on::text ends_on FROM study_plans WHERE id=$1 FOR UPDATE SKIP LOCKED",
            [row.id],
          );
          if (
            goal &&
            plan &&
            (await this.replanAfterPlacementLocked(manager, goal, plan))
          )
            updated++;
        });
      } catch {
        this.logger.warn("Placement replan deferred; continuing the batch.");
      }
    }
    return updated;
  }

  async current(actor: AuthUser, profile?: AbilityProfile) {
    const [goal] = await this.db.query<LearningGoalRow[]>(
      "SELECT *,start_date::text start_date FROM learning_goals WHERE user_id=$1 AND status='ACTIVE'",
      [actor.id],
    );
    if (!goal) return { plan: null, today: null, needsPlacementReplan: false };
    const today = localDay(this.clock.now(), goal.timezone);
    if (today >= addDays(goal.start_date, goal.duration_days))
      return { plan: null, today, needsPlacementReplan: false };
    const week =
      Math.floor((dayNumber(today) - dayNumber(goal.start_date)) / 7) + 1;
    const plan = await this.plans.findWeek(actor.id, goal.id, week);
    return plan
      ? {
          ...(await this.presentPlan(
            this.db.manager,
            actor,
            goal,
            plan,
            today,
          )),
          needsPlacementReplan: await this.placementReplanNeeded(
            this.db.manager,
            goal,
            plan,
            profile,
          ),
        }
      : { plan: null, today, needsPlacementReplan: false };
  }

  async sync(actor: AuthUser) {
    return this.db.transaction(async (manager) => {
      await this.goals.lockUser(manager, actor.id);
      const active = await this.goals.reconcile(
        manager,
        actor.id,
        this.clock.now(),
      );
      return active
        ? this.ensureLocked(manager, actor, active.goal)
        : { plan: null, today: null };
    });
  }

  async afterGoalCreated(actor: AuthUser) {
    try {
      await this.sync(actor);
      if (this.reports)
        await this.db.transaction(async (manager) => {
          await this.goals.lockUser(manager, actor.id);
          const active = await this.goals.reconcile(
            manager,
            actor.id,
            this.clock.now(),
          );
          if (active)
            await this.reports!.queueStartLocked(manager, active.goal);
        });
    } catch {
      this.logger.warn(
        "Initial study plan or AI job deferred to reconciliation.",
      );
    }
  }

  async ensureLocked(
    manager: EntityManager,
    actor: AuthUser,
    goal: LearningGoalRow,
  ) {
    const today = localDay(this.clock.now(), goal.timezone);
    const week =
      Math.floor((dayNumber(today) - dayNumber(goal.start_date)) / 7) + 1;
    const startsOn = addDays(goal.start_date, (week - 1) * 7);
    const endsOn = [
      addDays(startsOn, 6),
      addDays(goal.start_date, goal.duration_days - 1),
    ].sort()[0];
    let plan = await this.plans.findWeek(actor.id, goal.id, week, manager);
    if (!plan) {
      const snapshot = await this.snapshots.build(
        actor,
        goal,
        { kind: "GOAL" },
        this.clock.now(),
        manager,
      );
      const candidates = await this.candidates.build(
        manager,
        actor.id,
        snapshot,
        week,
      );
      const remaining = Math.max(
        0,
        goal.target_test_count - (snapshot.goal?.completed ?? 0),
      );
      const items = buildRulePlan(
        candidates,
        today,
        endsOn,
        snapshot.goal?.requiredPace ?? 1,
        remaining,
      );
      plan = await this.plans.create(
        actor.id,
        { goalId: goal.id, weekIndex: week, startsOn, endsOn, source: "RULE" },
        items,
        manager,
      );
      await this.progress.syncPlan(manager, goal, plan, this.clock.now());
    }
    await this.replanAfterPlacementLocked(manager, goal, plan);
    return this.presentPlan(manager, actor, goal, plan, today);
  }

  private async presentPlan(
    manager: EntityManager,
    actor: AuthUser,
    goal: LearningGoalRow,
    plan: StudyPlanRow,
    today: string,
  ) {
    const items = await this.plans.findItems(actor.id, plan.id, manager);
    // Progress records the submission time of the attempt that completed the item.
    const reviews = items.some(i => i.completed_at && i.test_id)
      ? await manager.query<Array<{ item_id: string; attempt_id: string; purpose: string }>>(
          `SELECT i.id item_id, a.id attempt_id, a.purpose FROM study_plan_items i
           JOIN test_snapshots s ON s.test_id=i.test_id
           JOIN test_attempts a ON a.snapshot_id=s.id AND a.student_id=$2 AND a.status='SUBMITTED'
             AND a.submitted_at >= date_trunc('milliseconds',i.completed_at)
             AND a.submitted_at < date_trunc('milliseconds',i.completed_at) + interval '1 millisecond'
             AND (a.part_number IS NULL OR a.part_number=i.part_number)
           WHERE i.plan_id=$1 AND i.activity_type IN ('TEST','TOPIC_REVIEW')
           ORDER BY i.id,a.submitted_at,a.id`, [plan.id, actor.id])
      : [];
    const tests = await manager.query<
      Array<{ id: string; title: string; purpose: string; available: boolean }>
    >(
      `SELECT id,title,purpose,(status='PUBLISHED' AND archived_at IS NULL AND published_snapshot_id IS NOT NULL) available
      FROM tests WHERE id=ANY($1::uuid[])`,
      [items.flatMap((item) => (item.test_id ? [item.test_id] : []))],
    );
    const eligibleTopics = items.some(
      (item) => item.activity_type === "TOPIC_REVIEW",
    )
      ? await manager.query<
          Array<{ id: string; name: string; test_id: string }>
        >(
          `WITH catalog AS MATERIALIZED (SELECT * FROM topic_question_catalog), coverage AS (${TOPIC_COVERAGE_SQL.replaceAll("topic_question_catalog", "catalog")})
      SELECT DISTINCT p.id,p.name,t.id test_id FROM learning_topics p JOIN coverage c ON c.component=p.component
      JOIN question_topics l ON l.topic_id=p.id AND l.status='APPROVED'
      JOIN catalog q ON q.id=l.question_id AND q.question_hash=l.question_hash
      JOIN tests t ON t.id=q.test_id AND t.status='PUBLISHED' AND t.archived_at IS NULL
      JOIN topic_snapshot_questions sq ON sq.snapshot_id=t.published_snapshot_id AND sq.question_id=q.id AND sq.question_hash=q.question_hash
      WHERE p.is_active AND c.total>0 AND c.approved::numeric/c.total>=0.8 AND t.id=ANY($1::uuid[])`,
          [
            items.flatMap((item) =>
              item.activity_type === "TOPIC_REVIEW" && item.test_id
                ? [item.test_id]
                : [],
            ),
          ],
        )
      : [];
    return {
      today,
      timezone: goal.timezone,
      plan: {
        id: plan.id,
        goalId: goal.id,
        weekIndex: plan.week_index,
        startsOn: plan.starts_on,
        endsOn: plan.ends_on,
        source: plan.source,
        replannedAfterPlacementAt: plan.replanned_after_placement_at ?? null,
        items: items.map((item) => {
          const matches = reviews.filter(row => row.item_id === item.id);
          const review = matches.length === 1 ? matches[0] : null;
          const test = tests.find((test) => test.id === item.test_id);
          return {
            id: item.id,
            scheduledOn: item.scheduled_on,
            activityType: item.activity_type,
            component: item.component,
            partNumber: item.part_number,
            testId: item.test_id,
            title: test?.title ?? null,
            retrieval: item.retrieval
              ? {
                  tier: item.retrieval.tier,
                  matchCount: item.retrieval.matchCount,
                  matchedTopics: item.retrieval.matchedTopics,
                }
              : null,
            purpose: test?.purpose ?? null,
            available:
              (!["TEST", "TOPIC_REVIEW"].includes(item.activity_type) ||
                !!test?.available) &&
              (item.activity_type !== "TOPIC_REVIEW" ||
                eligibleTopics.some(
                  (t) => t.id === item.topic_id && t.test_id === item.test_id,
                )),
            topicId: item.topic_id,
            topicName:
              eligibleTopics.find((t) => t.id === item.topic_id)?.name ?? null,
            targetCount: item.target_count,
            doneCount: item.done_count,
            completedAt: item.completed_at,
            reviewAttempt: review ? { id: review.attempt_id, purpose: review.purpose } : null,
            reason: item.reason,
            questionCount: item.question_keys?.length ?? null,
          };
        }),
      },
    };
  }

  async markReviewed(actor: AuthUser, itemId: string) {
    return this.db.transaction(async (manager) => {
      await this.goals.lockUser(manager, actor.id);
      await this.goals.reconcile(manager, actor.id, this.clock.now());
      const item = await this.ownedItem(manager, actor.id, itemId);
      if (item.activity_type !== "MISTAKE_REVIEW")
        throw new ApplicationError(
          "PLAN_ITEM_AUTOMATIC",
          "This activity is completed automatically.",
          400,
        );
      if (item.completed_at) return { done: true };
      const today = localDay(this.clock.now(), item.timezone);
      if (
        item.goal_status !== "ACTIVE" ||
        today < item.starts_on ||
        today > item.ends_on
      )
        throw new ApplicationError(
          "PLAN_ITEM_NOT_CURRENT",
          "This activity is outside its active schedule.",
          409,
        );
      await manager.query(
        "UPDATE study_plan_items SET done_count=target_count,completed_at=$2 WHERE id=$1",
        [itemId, this.clock.now()],
      );
      return { done: true };
    });
  }

  async review(actor: AuthUser, itemId: string) {
    const item = await this.ownedItem(this.db.manager, actor.id, itemId);
    if (item.activity_type !== "MISTAKE_REVIEW" || !item.source_attempt_id)
      throw new ApplicationError(
        "MISTAKE_ITEM_REQUIRED",
        "Choose a mistake review activity.",
        400,
      );
    const [attempt] = await this.db.query<Array<{ purpose: string }>>(
      "SELECT purpose FROM test_attempts WHERE id=$1 AND student_id=$2 AND status='SUBMITTED'",
      [item.source_attempt_id, actor.id],
    );
    if (!attempt)
      throw new ApplicationError(
        "MISTAKE_SOURCE_UNAVAILABLE",
        "The submitted attempt is unavailable.",
        404,
      );
    const keys = new Set(item.question_keys ?? []);
    const parts = [
      ...new Set(
        [...keys]
          .map((key) => Number(/^p([1-4]):[qs]\d+$/.exec(key)?.[1]))
          .filter(Boolean),
      ),
    ];
    const details = [];
    for (const part of parts) {
      const detail = await this.mistakes.details(
        actor,
        item.source_attempt_id,
        attempt.purpose,
        part,
      );
      details.push({
        ...detail,
        items: detail.items.filter((question) => keys.has(question.key)),
      });
    }
    return {
      itemId,
      attemptId: item.source_attempt_id,
      ragEnabled:
        String(this.config?.get("PERSONALIZATION_RAG_ENABLED", false)) ===
        "true",
      purpose: attempt.purpose,
      component: item.component,
      done: item.completed_at !== null,
      canMarkDone:
        item.goal_status === "ACTIVE" &&
        localDay(this.clock.now(), item.timezone) >= item.starts_on &&
        localDay(this.clock.now(), item.timezone) <= item.ends_on,
      details,
    };
  }

  private async ownedItem(
    manager: EntityManager,
    userId: string,
    itemId: string,
  ) {
    const [item] = await manager.query<
      Array<
        StudyPlanItemRow & {
          timezone: string;
          goal_status: string;
          starts_on: string;
          ends_on: string;
        }
      >
    >(
      `SELECT i.*,i.scheduled_on::text scheduled_on,p.starts_on::text starts_on,p.ends_on::text ends_on,g.timezone,g.status goal_status
      FROM study_plan_items i JOIN study_plans p ON p.id=i.plan_id JOIN learning_goals g ON g.id=p.goal_id
      WHERE i.id=$1 AND p.user_id=$2 AND g.user_id=$2`,
      [itemId, userId],
    );
    if (!item)
      throw new ApplicationError(
        "PLAN_ITEM_NOT_FOUND",
        "Study activity not found.",
        404,
      );
    return item;
  }
}
