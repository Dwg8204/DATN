import { RoleCode } from '../../auth/types/auth-user.type';

export type GrammarTestMode = 'part1' | 'part2' | 'full';
export type GrammarTestStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type GrammarCover = {
  url: string;
  publicId?: string;
  width?: number;
  height?: number;
  bytes?: number;
  format?: string;
};

export type GrammarQuestion = {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
};

export type VocabularyTarget = {
  id: number;
  word: string;
  correctAnswer: string;
  explanation?: string;
};

export type VocabularySet = {
  setId: number;
  instruction: string;
  targetWords: VocabularyTarget[];
  options: Array<{ label: string; text: string }>;
};

export type GrammarTestAggregate = {
  id?: string;
  mode: GrammarTestMode;
  details: { title: string; pictureUrl?: string; cover?: GrammarCover | null };
  parts: {
    1?: { instruction: string; questions: GrammarQuestion[] };
    2?: { sets: VocabularySet[] };
  };
  status?: GrammarTestStatus;
  version?: number;
  createdAt?: Date;
  updatedAt?: Date;
};

export type GrammarTestSummary = {
  id: string;
  title: string;
  name: string;
  mode: GrammarTestMode;
  section: string;
  component: 'Grammar & Vocab';
  status: GrammarTestStatus;
  attempts: number;
  questionType: string;
  pictureUrl: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  dateAdded: Date;
  canEdit: boolean;
  canDelete: boolean;
};

export type GrammarActor = { id: string; role: RoleCode };
export type GrammarAudit = { requestId?: string; ipAddress?: string };

