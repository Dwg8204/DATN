import { TestPurpose } from '../../../common/tests/test-purpose';
import { RoleCode } from '../../auth/types/auth-user.type';

export type ReadingTestMode = 'part1' | 'part2' | 'part3' | 'part4' | 'full';
export type ReadingTestStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type ReadingTestAggregate = {
  creationReplayed?: boolean;
  id?: string;
  mode: ReadingTestMode;
  purpose: TestPurpose;
  details: { title: string; pictureUrl?: string };
  parts: Record<string, any>;
  status?: ReadingTestStatus;
  version?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

export type ReadingActor = { id: string; role: RoleCode };
export type ReadingAudit = { requestId?: string; ipAddress?: string };
