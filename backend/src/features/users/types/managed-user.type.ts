import { RoleCode } from '../../auth/types/auth-user.type';

export type AccountStatus = 'INACTIVE' | 'ACTIVE' | 'BANNED';

export interface ManagedUserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: RoleCode;
  status: AccountStatus;
  createdAt: Date;
  lastLoginAt: Date | null;
}

export interface ManagedUserDetail extends ManagedUserSummary {
  avatar: unknown | null;
  phone: string | null;
  bio: string | null;
  timezone: string;
  emailVerifiedAt: Date | null;
}

export interface AuditMetadata {
  requestId?: string;
  ipAddress?: string;
}

export type MutationResult<T> =
  | { outcome: 'SUCCESS'; value: T }
  | { outcome: 'NOT_FOUND' | 'ADMIN_PROTECTED' | 'INVALID_ROLE_TRANSITION' };
