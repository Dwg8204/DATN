import { RoleCode } from '../../auth/types/auth-user.type';
import { AccountStatus } from '../../users/types/managed-user.type';

export interface AvatarMeta {
  publicId: string;
  url: string;
  width: number;
  height: number;
  format: string;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: RoleCode;
  status: AccountStatus;
  avatar: AvatarMeta | null;
  phone: string | null;
  bio: string | null;
  timezone: string;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  lastLoginAt: Date | null;
}
