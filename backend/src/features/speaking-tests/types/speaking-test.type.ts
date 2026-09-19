import { RoleCode } from '../../auth/types/auth-user.type';

export type SpeakingTestMode = 'part1' | 'part2' | 'part3' | 'part4' | 'full';
export type SpeakingTestStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type SpeakingQuestion = {
  id: string;
  text: string;
};

export type SpeakingPart1 = {
  questions: SpeakingQuestion[];
};

export type SpeakingPart2 = {
  imageUrl?: string;
  questions: SpeakingQuestion[];
};

export type SpeakingPart3 = {
  imageUrls: [string, string] | [];
  questions: SpeakingQuestion[];
};

export type SpeakingPart4 = {
  topic: string;
  imageUrl?: string;
  questions: SpeakingQuestion[];
};

export type SpeakingTestAggregate = {
  id?: string;
  mode: SpeakingTestMode;
  details: { title: string; pictureUrl?: string };
  parts: {
    1?: SpeakingPart1;
    2?: SpeakingPart2;
    3?: SpeakingPart3;
    4?: SpeakingPart4;
  };
  status?: SpeakingTestStatus;
  version?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type SpeakingTestSummary = {
  id: string;
  title: string;
  name: string;
  mode: SpeakingTestMode;
  section: string;
  component: 'Speaking';
  status: SpeakingTestStatus;
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

export type SpeakingActor = { id: string; role: RoleCode };
export type SpeakingAudit = { requestId?: string; ipAddress?: string };
