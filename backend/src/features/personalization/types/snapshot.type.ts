import { AbilityProfile } from '../../ai-shared/ability-profile';
import { LearningAttempt } from '../../ai-shared/learning-statistics.types';
import { SkillComponent } from '../../test-attempts/types/attempt.type';

export type SnapshotWindow =
  | { kind: 'COMMENT' }
  | { kind: 'GOAL' | 'FINAL' }
  | { kind: 'WEEKLY' | 'MIDTERM'; from: string; to: string };

export interface SnapshotAttempt extends LearningAttempt {
  id: string;
  student_id: string;
  component: SkillComponent;
  status: string;
  submitted_at: Date | string;
  estimated_cefr?: string | null;
}
export interface MistakeReference {
  attemptId: string;
  questionKey: string;
  component: SkillComponent;
  partNumber: number;
}
export interface SnapshotRows {
  abilityProfile?: AbilityProfile;
  weakTopics?: Array<{topicId:string;code:string;name:string;component:string;opportunities:number;errors:number;errorRatio:number;distinctTests:number}>;
  /** All lightweight metadata in the goal window; never truncate progress counts. */
  attempts: SnapshotAttempt[];
  /** Assessment payloads can be bounded independently of progress. */
  scoredAttempts: SnapshotAttempt[];
  reviewDates: Array<Date | string>;
  learningCount: number;
  activeCount?: number;
  mistakes: MistakeReference[];
  planItems: Array<{
    scheduledOn: string;
    targetCount: number;
    doneCount: number;
  }>;
}
