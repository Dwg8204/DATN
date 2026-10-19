export interface LearningAttempt {
  id?: string;
  component: string;
  purpose?: string;
  scope?: string;
  part_number?: number | null;
  submitted_at?: Date | string | null;
  score?: number | string | null;
  max_score?: number | string | null;
  result?: {
    method?: string;
    parts?: Array<{
      partNumber: number;
      score?: number | null;
      maxScore: number;
    }>;
    writing?: {
      details?: {
        parts?: Array<{
          questions?: Array<{
            criteria?: Array<{ criterion: string; judgment: string }>;
          }>;
        }>;
      };
    };
    speaking?: {
      provider?: string;
      version?: string;
      criteria?: Record<string, number>;
    };
  } | null;
}

export interface PartStatistics {
  partNumber: number;
  earned: number;
  possible: number;
  attempts: number;
}

export interface WritingCriterionStatistics {
  criterion: string;
  observations: number;
  needsImprovement: number;
}

export interface LearningStatisticsGroup {
  component: string;
  purpose?: string;
  scope?: string;
  partNumber?: number | null;
  sampleSize: number;
  recentScores: Array<{
    attemptId?: string;
    date?: Date | string | null;
    score: number;
    maxScore: number;
  }>;
  parts: Array<PartStatistics & { percent: number }>;
  writingCriteria: WritingCriterionStatistics[];
  speakingCriteria: Array<{
    attemptId?: string;
    version?: string;
    date?: Date | string | null;
    percentages?: Record<string, number>;
  }>;
}
