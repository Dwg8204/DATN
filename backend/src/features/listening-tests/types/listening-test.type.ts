import { RoleCode } from '../../auth/types/auth-user.type';

export type ListeningTestMode = 'part1' | 'part2' | 'part3' | 'part4' | 'full';
export type ListeningTestStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type ListeningQuestion = {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  audioUrl?: string;
};

export type ListeningPart1 = {
  questions: ListeningQuestion[];
};

export type ListeningPart2 = {
  id: number;
  instruction: string;
  audioUrl?: string;
  speakers: string[];
  options: string[];
  answers: string[];
  explanations?: Record<string, string>;
};

export type ListeningPart3 = {
  id: number;
  context: string;
  subTitle: string;
  audioUrl?: string;
  options: string[];
  statements: Array<{ id: string; text: string; answer: string; explanation?: string }>;
};

export type ListeningPart4 = {
  recordings: Array<{
    id: number;
    audioUrl?: string;
    context: string;
    subQuestions: ListeningQuestion[];
  }>;
};

export type ListeningTestAggregate = {
  id?: string;
  mode: ListeningTestMode;
  details: { title: string; pictureUrl?: string };
  parts: {
    1?: ListeningPart1;
    2?: ListeningPart2;
    3?: ListeningPart3;
    4?: ListeningPart4;
  };
  status?: ListeningTestStatus;
  version?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type ListeningTestSummary = {
  id: string;
  title: string;
  name: string;
  mode: ListeningTestMode;
  section: string;
  component: 'Listening';
  status: ListeningTestStatus;
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

export type ListeningActor = { id: string; role: RoleCode };
export type ListeningAudit = { requestId?: string; ipAddress?: string };
