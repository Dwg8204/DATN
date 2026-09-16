import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { AuthUser, RoleCode } from '../types/auth-user.type';

export interface UserCredential extends AuthUser {
  passwordHash: string;
}

export interface StoredRefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface PasswordResetChallenge {
  id: string;
  userId: string;
  email: string;
  challengeHash: string;
  expiresAt: Date;
  failedAttempts: number;
  verifiedAt: Date | null;
  usedAt: Date | null;
  revokedAt: Date | null;
}

type UserRow = {
  id: string; email: string; first_name: string; last_name: string; role: RoleCode;
  status: AuthUser['status']; password_hash: string;
};

@Injectable()
export class AuthRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findCredentialByEmail(email: string): Promise<UserCredential | null> {
    const rows = await this.dataSource.query<UserRow[]>(
      `SELECT u.id, u.email::text, u.first_name, u.last_name, u.status, u.password_hash, r.code AS role
       FROM users u JOIN roles r ON r.id = u.role_id
       WHERE u.email = $1 AND u.deleted_at IS NULL LIMIT 1`, [email],
    );
    return rows[0] ? this.toCredential(rows[0]) : null;
  }

  async findAuthUserById(id: string): Promise<AuthUser | null> {
    const rows = await this.dataSource.query<UserRow[]>(
      `SELECT u.id, u.email::text, u.first_name, u.last_name, u.status, u.password_hash, r.code AS role
       FROM users u JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1 AND u.deleted_at IS NULL LIMIT 1`, [id],
    );
    return rows[0] ? this.toUser(rows[0]) : null;
  }

  async createStudent(input: { email: string; passwordHash: string; firstName: string; lastName: string }): Promise<AuthUser> {
    return this.dataSource.transaction(async manager => {
      const rows = await manager.query<UserRow[]>(
        `INSERT INTO users(email, password_hash, first_name, last_name, role_id, status, email_verified_at)
         SELECT $1, $2, $3, $4, id, 'ACTIVE', now() FROM roles WHERE code='STUDENT'
         RETURNING id, email::text, first_name, last_name, status, password_hash,
           (SELECT code FROM roles WHERE id=users.role_id) AS role`,
        [input.email, input.passwordHash, input.firstName, input.lastName],
      );
      if (!rows[0]) throw new Error('STUDENT role has not been seeded.');
      return this.toUser(rows[0]);
    });
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.dataSource.query('UPDATE users SET last_login_at=now(), updated_at=now() WHERE id=$1', [userId]);
  }

  async storeRefreshToken(input: {
    id: string; userId: string; hash: string; familyId: string; expiresAt: Date; userAgent?: string; ipAddress?: string;
  }): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO refresh_tokens(id,user_id,token_hash,family_id,expires_at,user_agent,ip_address)
       VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [input.id, input.userId, input.hash, input.familyId, input.expiresAt, input.userAgent ?? null, input.ipAddress ?? null],
    );
  }

  async rotateRefreshToken(input: {
    currentId: string; currentHash: string; nextId: string; nextHash: string; userId: string;
    familyId: string; expiresAt: Date; userAgent?: string; ipAddress?: string;
  }): Promise<'ROTATED' | 'REUSED' | 'INVALID'> {
    return this.dataSource.transaction(async manager => {
      const rows = await manager.query<(StoredRefreshToken & { token_hash: string; family_id: string; user_id: string; expires_at: Date; revoked_at: Date | null })[]>(
        `SELECT id, user_id, token_hash, family_id, expires_at, revoked_at
         FROM refresh_tokens WHERE id=$1 FOR UPDATE`, [input.currentId],
      );
      const current = rows[0];
      if (!current || current.token_hash !== input.currentHash || current.user_id !== input.userId || current.family_id !== input.familyId) return 'INVALID';
      if (current.revoked_at || new Date(current.expires_at) <= new Date()) {
        await manager.query('UPDATE refresh_tokens SET revoked_at=COALESCE(revoked_at,now()) WHERE family_id=$1', [input.familyId]);
        return 'REUSED';
      }
      await manager.query(
        `INSERT INTO refresh_tokens(id,user_id,token_hash,family_id,expires_at,user_agent,ip_address)
         VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [input.nextId, input.userId, input.nextHash, input.familyId, input.expiresAt, input.userAgent ?? null, input.ipAddress ?? null],
      );
      await manager.query('UPDATE refresh_tokens SET revoked_at=now(), replaced_by_id=$1, last_used_at=now() WHERE id=$2', [input.nextId, input.currentId]);
      return 'ROTATED';
    });
  }

  async revokeRefreshToken(hash: string): Promise<void> {
    await this.dataSource.query('UPDATE refresh_tokens SET revoked_at=COALESCE(revoked_at,now()) WHERE token_hash=$1', [hash]);
  }

  async revokeAllRefreshTokens(userId: string, manager: EntityManager = this.dataSource.manager): Promise<void> {
    await manager.query('UPDATE refresh_tokens SET revoked_at=COALESCE(revoked_at,now()) WHERE user_id=$1', [userId]);
  }

  async createPasswordReset(input: { userId: string; challengeHash: string; expiresAt: Date }): Promise<void> {
    await this.dataSource.transaction(async manager => {
      await manager.query('UPDATE password_reset_tokens SET revoked_at=COALESCE(revoked_at,now()) WHERE user_id=$1 AND used_at IS NULL', [input.userId]);
      await manager.query(
        'INSERT INTO password_reset_tokens(user_id,challenge_hash,expires_at) VALUES($1,$2,$3)',
        [input.userId, input.challengeHash, input.expiresAt],
      );
    });
  }

  async findActivePasswordReset(email: string): Promise<PasswordResetChallenge | null> {
    const rows = await this.dataSource.query<Array<{
      id: string; user_id: string; email: string; challenge_hash: string; expires_at: Date; failed_attempts: number;
      verified_at: Date | null; used_at: Date | null; revoked_at: Date | null;
    }>>(
      `SELECT p.id,p.user_id,u.email::text,p.challenge_hash,p.expires_at,p.failed_attempts,p.verified_at,p.used_at,p.revoked_at
       FROM password_reset_tokens p JOIN users u ON u.id=p.user_id
       WHERE u.email=$1 AND u.deleted_at IS NULL AND p.used_at IS NULL AND p.revoked_at IS NULL
       ORDER BY p.created_at DESC LIMIT 1`, [email],
    );
    const row = rows[0];
    return row ? {
      id: row.id, userId: row.user_id, email: row.email, challengeHash: row.challenge_hash,
      expiresAt: row.expires_at, failedAttempts: row.failed_attempts, verifiedAt: row.verified_at,
      usedAt: row.used_at, revokedAt: row.revoked_at,
    } : null;
  }

  async recordFailedOtp(id: string, revoke: boolean): Promise<void> {
    await this.dataSource.query(
      `UPDATE password_reset_tokens SET failed_attempts=failed_attempts+1,
       revoked_at=CASE WHEN $2 THEN now() ELSE revoked_at END WHERE id=$1`, [id, revoke],
    );
  }

  async verifyPasswordReset(id: string, grantHash: string, grantExpiresAt: Date): Promise<void> {
    await this.dataSource.query(
      'UPDATE password_reset_tokens SET verified_at=now(),reset_grant_hash=$2,reset_grant_expires_at=$3 WHERE id=$1',
      [id, grantHash, grantExpiresAt],
    );
  }

  async resetPassword(grantHash: string, passwordHash: string): Promise<boolean> {
    return this.dataSource.transaction(async manager => {
      const rows = await manager.query<Array<{ id: string; user_id: string }>>(
        `SELECT id,user_id FROM password_reset_tokens WHERE reset_grant_hash=$1 AND verified_at IS NOT NULL
         AND reset_grant_expires_at>now() AND used_at IS NULL AND revoked_at IS NULL FOR UPDATE`, [grantHash],
      );
      if (!rows[0]) return false;
      await manager.query('UPDATE users SET password_hash=$1,password_changed_at=now(),updated_at=now() WHERE id=$2', [passwordHash, rows[0].user_id]);
      await manager.query('UPDATE password_reset_tokens SET used_at=now(),reset_grant_hash=NULL WHERE id=$1', [rows[0].id]);
      await this.revokeAllRefreshTokens(rows[0].user_id, manager);
      return true;
    });
  }

  async changePassword(userId: string, passwordHash: string): Promise<void> {
    await this.dataSource.transaction(async manager => {
      await manager.query('UPDATE users SET password_hash=$1,password_changed_at=now(),updated_at=now() WHERE id=$2', [passwordHash, userId]);
      await this.revokeAllRefreshTokens(userId, manager);
    });
  }

  private toUser(row: UserRow): AuthUser {
    return { id: row.id, email: row.email, firstName: row.first_name, lastName: row.last_name, role: row.role, status: row.status };
  }

  private toCredential(row: UserRow): UserCredential {
    return { ...this.toUser(row), passwordHash: row.password_hash };
  }
}
