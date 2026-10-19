import { SkillComponent } from '../../test-attempts/types/attempt.type';

export type GoalStatus =
  'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED' | 'REPLACED';
export type TargetCefr = 'A1' | 'A2' | 'B1' | 'B2' | 'C';
export type InsightKind =
  'COMMENT' | 'PLAN_START' | 'WEEKLY' | 'MIDTERM' | 'FINAL';
export type InsightStatus = 'PENDING' | 'READY' | 'FAILED' | 'FALLBACK';
export type PlanActivity =
  'TEST' | 'VOCAB_REVIEW' | 'MISTAKE_REVIEW' | 'TOPIC_REVIEW';
export type TopicLabelStatus = 'SUGGESTED' | 'APPROVED' | 'REJECTED';

// Repository projections cast calendar dates to text; timestamps remain Date.
export interface LearningGoalRow {
  id: string;
  user_id: string;
  target_cefr: TargetCefr;
  target_test_count: number;
  duration_days: number;
  start_date: string;
  timezone: string;
  status: GoalStatus;
  replaced_by_goal_id: string | null;
  target_reached_at: Date | null;
  ended_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface LearnerPreferencesRow {
  user_id: string;
  reminder_enabled: boolean;
  reminder_time: string;
  email_reminder_enabled: boolean;
  email_report_enabled: boolean;
  last_reminded_on: string | null;
  updated_at: Date;
}

export interface LearningInsightRow {
  id: string;
  user_id: string;
  goal_id: string | null;
  kind: InsightKind;
  period_key: string;
  week_index: number | null;
  covers_from: string | null;
  covers_to: string | null;
  status: InsightStatus;
  snapshot_version: number;
  input_hash: string;
  snapshot: Record<string, unknown>;
  content: Record<string, unknown> | null;
  ai_request_id: string | null;
  retry_count: number;
  next_retry_at: Date | null;
  deliver_at: Date | null;
  notified_at: Date | null;
  emailed_at: Date | null;
  read_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface StudyPlanRow {
  id: string;
  goal_id: string;
  user_id: string;
  week_index: number;
  starts_on: string;
  ends_on: string;
  source: 'AI' | 'RULE';
  insight_id: string | null;
  created_at: Date;
}

export interface StudyPlanItemRow {
  id: string;
  plan_id: string;
  scheduled_on: string;
  sort_order: number;
  activity_type: PlanActivity;
  component: SkillComponent | null;
  part_number: number | null;
  test_id: string | null;
  topic_id: string | null;
  source_attempt_id: string | null;
  question_keys: string[] | null;
  target_count: number;
  done_count: number;
  completed_at: Date | null;
  reason: string | null;
}

export interface LearningTopicRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  component: SkillComponent | null;
  topic_type: 'KNOWLEDGE' | 'STRATEGY' | 'CRITERION';
  parent_id: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface QuestionTopicRow {
  id: string;
  question_id: string;
  topic_id: string;
  weight: string;
  created_at: Date;
  status: TopicLabelStatus;
  source: 'AI' | 'ADMIN';
  confidence: string | null;
  ai_request_id: string | null;
  reviewed_by: string | null;
  reviewed_at: Date | null;
}

export interface CreateGoalInput {
  targetCefr: TargetCefr;
  targetTests: number;
  durationDays: number;
  startDate: string;
  timezone: string;
}

export interface SavePreferencesInput {
  reminderEnabled: boolean;
  reminderTime: string;
  emailReminderEnabled: boolean;
  emailReportEnabled: boolean;
}

export type CreateInsightInput = {
  periodKey: string;
  weekIndex?: number;
  coversFrom?: string;
  coversTo?: string;
  snapshotVersion: number;
  inputHash: string;
  snapshot: Record<string, unknown>;
  deliverAt?: Date;
} & (
  | { kind: 'COMMENT'; goalId?: never }
  | { kind: Exclude<InsightKind, 'COMMENT'>; goalId: string }
);

export interface CreatePlanInput {
  goalId: string;
  weekIndex: number;
  startsOn: string;
  endsOn: string;
  source: StudyPlanRow['source'];
  insightId?: string;
}

export type CreatePlanItemInput = {
  scheduledOn: string;
  sortOrder: number;
  targetCount: number;
  reason?: string;
} & (
  | {
      activityType: 'TEST';
      component: SkillComponent;
      partNumber?: number;
      testId?: string;
    }
  | { activityType: 'VOCAB_REVIEW' }
  | {
      activityType: 'MISTAKE_REVIEW';
      sourceAttemptId: string;
      questionKeys: string[];
      component?: SkillComponent;
      partNumber?: number;
    }
  | {
      activityType: 'TOPIC_REVIEW';
      topicId: string;
      component?: SkillComponent;
      partNumber?: number;
      testId?: string;
    }
);
