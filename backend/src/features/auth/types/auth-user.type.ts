export type RoleCode = 'ADMIN' | 'TEACHER' | 'STUDENT';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: RoleCode;
  status: 'INACTIVE' | 'ACTIVE' | 'BANNED';
  authVersion?: number;
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: RoleCode;
  type: 'access';
  family: string;
  version: number;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  family: string;
  type: 'refresh';
  version: number;
}
