import { COMMENT_PROMPT_VERSION } from "../ai/comment.contract";
import { Injectable } from "@nestjs/common";
import { DataSource, EntityManager } from "typeorm";
import { AuthUser } from "../../auth/types/auth-user.type";
import { LearningGoalsRepository } from "../repositories/learning-goals.repository";
import { LearningInsightsRepository } from "../repositories/learning-insights.repository";
import { LearningInsightRow } from "../types/personalization.type";
import { localDay } from "../policies/calendar";
import { goalProgress, snapshotHash } from "../policies/learner-snapshot";
import { commentSnapshot } from "../ai/comment.contract";
import { GoalsService } from "./goals.service";
import { SnapshotService } from "./snapshot.service";
import { PersonalizationClock } from "./personalization-clock";
import { PersonalizationAiService } from "./personalization-ai.service";

@Injectable()
export class CommentsService {
  constructor(
    private readonly db: DataSource,
    private readonly goals: GoalsService,
    private readonly goalRepository: LearningGoalsRepository,
    private readonly insights: LearningInsightsRepository,
    private readonly snapshots: SnapshotService,
    private readonly clock: PersonalizationClock,
    private readonly ai: PersonalizationAiService,
  ) {}

  async current(actor: AuthUser) {
    if (!this.ai.enabled) return { status: "HIDDEN", comment: null };
    const [row] = await this.db.query<LearningInsightRow[]>(
      "SELECT * FROM learning_insights WHERE user_id=$1 AND kind='COMMENT' ORDER BY created_at DESC,id DESC LIMIT 1",
      [actor.id],
    );
    return row ? this.present(row) : { status: "HIDDEN", comment: null };
  }

  async needsSync(actor: AuthUser) {
    if (!this.ai.enabled) return false;
    const [state] = await this.db.query<{ needed: boolean }[]>(
      `SELECT EXISTS(
      SELECT 1 FROM test_attempts WHERE student_id=$1 AND status='SUBMITTED' AND submitted_at<=$2 AND result->>'method' IN ('OBJECTIVE','AI'))
      AND NOT EXISTS(SELECT 1 FROM learning_insights WHERE user_id=$1 AND kind='COMMENT' AND period_key=($2::timestamptz AT TIME ZONE (SELECT timezone FROM users WHERE id=$1))::date::text)
      AND COALESCE((SELECT snapshot->>'gradingFingerprint' FROM learning_insights WHERE user_id=$1 AND kind='COMMENT' ORDER BY created_at DESC,id DESC LIMIT 1),'') IS DISTINCT FROM
      (SELECT md5(string_agg(id::text || ':' || md5(COALESCE(result::text,'')) || ':' || COALESCE(score::text,'') || ':' || COALESCE(max_score::text,'') || ':' || COALESCE(estimated_cefr,''),',' ORDER BY submitted_at DESC,id ASC)) FROM (SELECT * FROM test_attempts WHERE student_id=$1 AND status='SUBMITTED' AND submitted_at<=$2 ORDER BY submitted_at DESC,id ASC LIMIT 20) scored WHERE result->>'method' IN ('OBJECTIVE','AI')) needed`,
      [actor.id, this.clock.now()],
    );
    return state.needed;
  }

  async syncLocked(actor: AuthUser, manager: EntityManager, timezone: string) {
    if (!this.ai.enabled) return { status: "HIDDEN", comment: null };
    const now = this.clock.now();
    const day = localDay(now, timezone);
    const rows = await manager.query<LearningInsightRow[]>(
      "SELECT * FROM learning_insights WHERE user_id=$1 AND kind='COMMENT' ORDER BY created_at DESC,id DESC LIMIT 1",
      [actor.id],
    );
    const latest = rows[0];
    const [today] = await manager.query<LearningInsightRow[]>(
      "SELECT * FROM learning_insights WHERE user_id=$1 AND kind='COMMENT' AND period_key=$2",
      [actor.id, day],
    );
    if (today) return this.present(today);

    // Fingerprint only scored attempts: vocabulary/time changes must not trigger a new comment.
    // SQL hashes the result locally; answers and grading text never leave the database here.
    const [graded] = await manager.query<
      Array<{ count: number; fingerprint: string | null }>
    >(
      `SELECT count(*)::int count,md5(string_agg(id::text || ':' || md5(COALESCE(result::text,'')) || ':' || COALESCE(score::text,'') || ':' || COALESCE(max_score::text,'') || ':' || COALESCE(estimated_cefr,''),',' ORDER BY submitted_at DESC,id ASC)) fingerprint
        FROM (SELECT id,result,score,max_score,estimated_cefr,submitted_at FROM test_attempts
          WHERE student_id=$1 AND status='SUBMITTED' AND submitted_at<=$2
          ORDER BY submitted_at DESC,id ASC LIMIT 20) scored WHERE result->>'method' IN ('OBJECTIVE','AI')`,
      [actor.id, now],
    );
    if (!graded.count) return { status: "HIDDEN", comment: null };
    if (latest?.snapshot.gradingFingerprint === graded.fingerprint)
      return this.present(latest);

    const full = await this.snapshots.build(
      actor,
      null,
      { kind: "COMMENT" },
      now,
      manager,
    );
    const snapshot = commentSnapshot(full);
    const goal = await this.goalRepository.findActive(actor.id, manager);
    if (goal) {
      const counts = await this.goals.count(manager, goal, now);
      snapshot.goal = goalProgress(goal, counts.completed, now);
      snapshot.band.target = goal.target_cefr;
    }
    const inputHash = snapshotHash({
      ...snapshot,
      promptVersion: COMMENT_PROMPT_VERSION,
    });
    const [cached] = await manager.query<LearningInsightRow[]>(
      "SELECT * FROM learning_insights WHERE user_id=$1 AND kind='COMMENT' AND input_hash=$2 AND status='READY' ORDER BY created_at DESC LIMIT 1",
      [actor.id, inputHash],
    );
    const queued = await this.insights.createPending(
      actor.id,
      {
        kind: "COMMENT",
        periodKey: day,
        snapshotVersion: snapshot.snapshotVersion,
        inputHash,
        snapshot: { ...snapshot, gradingFingerprint: graded.fingerprint },
      },
      manager,
    );
    if (!queued) return { status: "PENDING", comment: null };
    if (cached) {
      await manager.query(
        "UPDATE learning_insights SET status='READY',content=$2,ai_request_id=$3,updated_at=now() WHERE id=$1",
        [queued.id, cached.content, cached.ai_request_id],
      );
      return this.present({
        ...queued,
        status: "READY",
        content: cached.content,
      });
    }
    // A newer dashboard request supersedes an unprocessed historical comment.
    await manager.query(
      "UPDATE learning_insights SET status='FALLBACK',next_retry_at=NULL WHERE user_id=$1 AND kind='COMMENT' AND id<>$2 AND status IN ('PENDING','FAILED')",
      [actor.id, queued.id],
    );
    return this.present(queued);
  }

  private present(row: LearningInsightRow) {
    if (row.status === "READY")
      return {
        status: "READY",
        comment: {
          id: row.id,
          content: row.content,
          createdAt: row.created_at,
        },
      };
    if (row.status === "PENDING") return { status: "PENDING", comment: null };
    if (row.status === "FAILED" && row.retry_count <= 3)
      return {
        status: "RETRYING",
        comment: null,
        nextRetryAt: row.next_retry_at,
      };
    if (row.status === "FALLBACK") return { status: "FALLBACK", comment: null };
    return { status: "HIDDEN", comment: null };
  }
}
