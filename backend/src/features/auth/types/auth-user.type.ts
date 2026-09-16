export type RoleCode = 'ADMIN' | 'TEACHER' | 'STUDENT';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: RoleCode;
  status: 'INACTIVE' | 'ACTIVE' | 'BANNED';
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: RoleCode;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  family: string;
  type: 'refresh';
}
