export const WRITING_CRITERIA = [
  'TASK',
  'GRAMMAR',
  'VOCABULARY',
  'COHERENCE',
  'REGISTER',
  'MECHANICS',
] as const;
export type WritingCriterion = (typeof WRITING_CRITERIA)[number];
export type FeedbackLocale = 'vi' | 'en';
export type Finding = {
  criterion: WritingCriterion;
  comment: string;
  evidence: Array<{ questionKey: string; quote: string }>;
};
export type WritingQuestionFeedback = {
  questionKey: string;
  responseStatus: 'ANSWERED' | 'BLANK' | 'TOO_SHORT';
  comment: string;
  criteria: Array<{
    criterion: WritingCriterion;
    judgment: 'STRONG' | 'ADEQUATE' | 'NEEDS_IMPROVEMENT' | 'NOT_APPLICABLE' | 'NOT_ASSESSABLE';
    comment: string;
    evidenceQuotes: string[];
  }>;
  strengths: Finding[];
  weaknesses: Finding[];
  corrections: Array<{
    kind: 'ERROR' | 'SUGGESTION';
    criterion: WritingCriterion;
    original: string;
    replacement: string;
    explanation: string;
  }>;
  taskIssues: string[];
  suggestions: string[];
  suggestedRevision: string | null;
};
export type WritingPartFeedback = {
  partNumber: number;
  overview: string;
  strengths: Finding[];
  weaknesses: Finding[];
  suggestions: string[];
  questions: WritingQuestionFeedback[];
};
export type WritingAssessment = {
  schemaVersion: 1;
  scope: 'FULL_SKILL' | 'PART';
  feedbackLocale: FeedbackLocale;
  cefr: {
    level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | null;
    status: 'ESTIMATED' | 'NOT_APPLICABLE' | 'INSUFFICIENT_EVIDENCE';
    reason: string | null;
    rationale: string | null;
    evidence: Array<{
      questionKey: string;
      quote: string;
      explanation: string;
    }>;
    limitations: string[];
  };
  summary: {
    overallComment: string;
    partSummaries: Array<{ partNumber: number; comment: string }>;
    priorities: string[];
  };
  details: { parts: WritingPartFeedback[] };
  metadata?: {
    provider: string;
    model: string;
    rubricVersion: string;
    promptVersion: string;
    assessedAt: string;
    assessmentRevision: number;
  };
};
