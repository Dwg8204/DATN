import { RoleCode } from '../../auth/types/auth-user.type';

export type WritingTestMode = 'part1' | 'part2' | 'part3' | 'part4' | 'full';
export type WritingTestStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type WritingPart1 = {
  context: string;
  questions: string[];
  sampleAnswers: string[];
};
export type WritingPart2 = {
  instruction: string;
  prompt: string;
  sampleAnswer: string;
};
export type WritingPart3 = {
  context: string;
  messages: string[];
  sampleAnswers: string[];
};
export type WritingPart4 = {
  context: string;
  informalPrompt: string;
  informalSample: string;
  formalPrompt: string;
  formalSample: string;
};

export type WritingTestAggregate = {
  id?: string;
  mode: WritingTestMode;
  details: { title: string; pictureUrl?: string };
  parts: {
    1?: WritingPart1;
    2?: WritingPart2;
    3?: WritingPart3;
    4?: WritingPart4;
  };
  status?: WritingTestStatus;
  version?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type WritingTestSummary = {
  id: string;
  title: string;
  name: string;
  mode: WritingTestMode;
  section: string;
  component: 'Writing';
  status: WritingTestStatus;
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

export type WritingActor = { id: string; role: RoleCode };
export type WritingAudit = { requestId?: string; ipAddress?: string };

