export type SkillComponent = 'GRAMMAR_VOCAB' | 'READING' | 'LISTENING' | 'WRITING' | 'SPEAKING';
export type AttemptPurpose = 'EXAM' | 'PRACTICE';
export type AnswerKind = 'CHOICE' | 'MATCH' | 'TEXT' | 'AUDIO';
export type Answer =
  | { kind: 'CHOICE' | 'MATCH'; optionId: string }
  | { kind: 'TEXT'; text: string }
  | { kind: 'AUDIO'; mediaKey: string };
export type Answers = Record<string, Answer>;

export type AssessableItem = {
  key: string;
  partNumber: number;
  kind: AnswerKind;
  optionIds?: string[];
  correctOptionId?: string;
  points: number;
  explanation?: string;
  sampleAnswer?: string;
  maxCharacters?: number;
};

export type AssessmentPaper = {
  component: SkillComponent;
  title: string;
  mode: string;
  parts: Record<string, unknown>;
  items: AssessableItem[];
};

export type AttemptRow = {
  id: string;
  student_id: string;
  snapshot_id: string;
  test_id: string;
  version: number;
  component: SkillComponent;
  purpose: AttemptPurpose;
  scope: 'PART' | 'FULL_SKILL';
  part_number: number | null;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'ABANDONED';
  grading_status: string;
  assessment_revision: number;
  result: AssessmentResult | Record<string, unknown> | null;
  score: string | null;
  max_score: string | null;
  estimated_cefr: string | null;
  started_at: Date;
  expires_at: Date | null;
  submitted_at: Date | null;
  completed_at: Date | null;
};

export type LockedAttemptRow = Omit<AttemptRow, 'test_id' | 'version'> & {
  test_id?: string;
  version?: number;
  test_title?: string;
};
export type AttemptMetadata = Pick<AttemptRow, 'id' | 'snapshot_id' | 'component' | 'purpose'>;

export type ProgressRow = {
  attempt_id: string;
  answers: Answers;
  progress: Record<string, unknown>;
  revision: number;
  saved_at: Date;
  sealed_at: Date | null;
};
export type SavedProgressRow = Pick<ProgressRow, 'revision' | 'saved_at' | 'progress'>;

export type ItemOutcome = {
  key: string;
  partNumber: number;
  outcome: 'CORRECT' | 'INCORRECT' | 'SKIPPED' | 'PENDING';
  score: number;
  maxScore: number;
  /** Response-only field. Answers remain canonical in attempt_progress.answers. */
  selectedAnswer?: Answer | null;
};
export type AssessmentResult = {
  schemaVersion: 1;
  method: 'OBJECTIVE' | 'PENDING_AI' | 'UNASSESSED';
  score: number | null;
  maxScore: number | null;
  counts: { correct: number; incorrect: number; skipped: number };
  parts: Array<{ partNumber: number; score: number | null; maxScore: number | null }>;
  items: ItemOutcome[];
  assistance?: { revealedKeys: string[] };
};
