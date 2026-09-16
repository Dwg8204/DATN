import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { ListUsersQueryDto } from '../dto/list-users-query.dto';
import {
  AuditMetadata,
  ManagedUserDetail,
  ManagedUserSummary,
  MutationResult,
} from '../types/managed-user.type';
import { RoleCode } from '../../auth/types/auth-user.type';

type UserRow = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: RoleCode;
  status: ManagedUserSummary['status'];
  avatar?: unknown | null;
  phone?: string | null;
  bio?: string | null;
  timezone?: string;
  email_verified_at?: Date | null;
  created_at: Date;
  last_login_at: Date | null;
};

type LockedUserRow = UserRow & { role_id: string };

@Injectable()
export class UsersRepository {
  constructor(private readonly dataSource: DataSource) {}

  async list(query: ListUsersQueryDto): Promise<{ users: ManagedUserSummary[]; total: number }> {
    const values: unknown[] = [];
    const where = ['u.deleted_at IS NULL'];

    if (query.role) {
      values.push(query.role);
      where.push(`r.code = $${values.length}`);
    }
    if (query.status) {
      values.push(query.status);
      where.push(`u.status = $${values.length}`);
    }
    if (query.search) {
      values.push(query.search);
      const parameter = `$${values.length}`;
      where.push(`(
        strpos(lower(u.email::text), lower(${parameter})) > 0 OR
        strpos(lower(concat_ws(' ', u.first_name, u.last_name)), lower(${parameter})) > 0
      )`);
    }

    const whereSql = where.join(' AND ');
    const offset = (query.page - 1) * query.pageSize;
    const dataValues = [...values, query.pageSize, offset];
    const limitParameter = `$${values.length + 1}`;
    const offsetParameter = `$${values.length + 2}`;
    const baseJoin = 'FROM users u JOIN roles r ON r.id = u.role_id';

    const [rows, countRows] = await Promise.all([
      this.dataSource.query<UserRow[]>(
        `SELECT u.id, u.email::text, u.first_name, u.last_name, r.code AS role, u.status,
                u.created_at, u.last_login_at
         ${baseJoin}
         WHERE ${whereSql}
         ORDER BY u.created_at DESC, u.id DESC
         LIMIT ${limitParameter} OFFSET ${offsetParameter}`,
        dataValues,
      ),
      this.dataSource.query<Array<{ total: string }>>(
        `SELECT count(*)::text AS total ${baseJoin} WHERE ${whereSql}`,
        values,
      ),
    ]);

    return {
      users: rows.map(row => this.toSummary(row)),
      total: Number(countRows[0]?.total ?? 0),
    };
  }

  async findById(id: string): Promise<ManagedUserDetail | null> {
    const rows = await this.dataSource.query<UserRow[]>(
      `SELECT u.id, u.email::text, u.first_name, u.last_name, r.code AS role, u.status,
              u.avatar, u.phone, u.bio, u.timezone, u.email_verified_at, u.created_at, u.last_login_at
       FROM users u JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1 AND u.deleted_at IS NULL
       LIMIT 1`,
      [id],
    );
    return rows[0] ? this.toDetail(rows[0]) : null;
  }

  async emailExists(email: string): Promise<boolean> {
    const rows = await this.dataSource.query<Array<{ exists: boolean }>>(
      'SELECT EXISTS(SELECT 1 FROM users WHERE email = $1) AS exists',
      [email],
    );
    return rows[0]?.exists ?? false;
  }

  async createTeacher(input: {
    actorId: string;
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    audit: AuditMetadata;
  }): Promise<ManagedUserSummary | null> {
    return this.dataSource.transaction(async manager => {
      const rows = await manager.query<UserRow[]>(
        `INSERT INTO users(email, password_hash, first_name, last_name, role_id, status, email_verified_at)
         SELECT $1, $2, $3, $4, id, 'ACTIVE', now()
         FROM roles WHERE code = 'TEACHER'
         RETURNING id, email::text, first_name, last_name, status, created_at, last_login_at,
           (SELECT code FROM roles WHERE id = users.role_id) AS role`,
        [input.email, input.passwordHash, input.firstName, input.lastName],
      );
      const row = rows[0];
      if (!row) return null;

      await this.insertAuditLog(manager, {
        actorId: input.actorId,
        action: 'USER_CREATED',
        entityId: row.id,
        changes: { role: 'TEACHER', status: 'ACTIVE', email: input.email },
        ...input.audit,
      });
      return this.toSummary(row);
    });
  }

  async promoteStudentToTeacher(
    targetId: string,
    actorId: string,
    audit: AuditMetadata,
  ): Promise<MutationResult<ManagedUserSummary>> {
    return this.dataSource.transaction(async manager => {
      const target = await this.lockUser(manager, targetId);
      if (!target) return { outcome: 'NOT_FOUND' };
      if (target.role === 'ADMIN') return { outcome: 'ADMIN_PROTECTED' };
      if (target.role !== 'STUDENT') return { outcome: 'INVALID_ROLE_TRANSITION' };

      const rows = await manager.query<UserRow[]>(
        `UPDATE users
         SET role_id = (SELECT id FROM roles WHERE code = 'TEACHER'), updated_at = now()
         WHERE id = $1
         RETURNING id, email::text, first_name, last_name, status, created_at, last_login_at,
           (SELECT code FROM roles WHERE id = users.role_id) AS role`,
        [targetId],
      );
      const updated = rows[0];
      if (!updated) return { outcome: 'NOT_FOUND' };

      await this.insertAuditLog(manager, {
        actorId,
        action: 'USER_ROLE_CHANGED',
        entityId: targetId,
        changes: { role: { from: 'STUDENT', to: 'TEACHER' } },
        ...audit,
      });
      return { outcome: 'SUCCESS', value: this.toSummary(updated) };
    });
  }

  async softDelete(
    targetId: string,
    actorId: string,
    audit: AuditMetadata,
  ): Promise<MutationResult<void>> {
    return this.dataSource.transaction(async manager => {
      const target = await this.lockUser(manager, targetId);
      if (!target) return { outcome: 'NOT_FOUND' };
      if (target.role === 'ADMIN') return { outcome: 'ADMIN_PROTECTED' };

      await manager.query(
        `UPDATE users
         SET deleted_at = now(), updated_at = now(),
             email_verification_token_hash = NULL, email_verification_expires_at = NULL
         WHERE id = $1`,
        [targetId],
      );
      await manager.query(
        'UPDATE refresh_tokens SET revoked_at = COALESCE(revoked_at, now()) WHERE user_id = $1',
        [targetId],
      );
      await manager.query(
        `UPDATE password_reset_tokens
         SET revoked_at = COALESCE(revoked_at, now()), reset_grant_hash = NULL, reset_grant_expires_at = NULL
         WHERE user_id = $1 AND used_at IS NULL`,
        [targetId],
      );
      await this.insertAuditLog(manager, {
        actorId,
        action: 'USER_DELETED',
        entityId: targetId,
        changes: { deleted: true, previousRole: target.role },
        ...audit,
      });
      return { outcome: 'SUCCESS', value: undefined };
    });
  }

  private async lockUser(manager: EntityManager, id: string): Promise<LockedUserRow | null> {
    const rows = await manager.query<LockedUserRow[]>(
      `SELECT u.id, u.email::text, u.first_name, u.last_name, u.role_id, r.code AS role, u.status,
              u.created_at, u.last_login_at
       FROM users u JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1 AND u.deleted_at IS NULL
       FOR UPDATE OF u`,
      [id],
    );
    return rows[0] ?? null;
  }

  private async insertAuditLog(manager: EntityManager, input: {
    actorId: string;
    action: string;
    entityId: string;
    changes: unknown;
    requestId?: string;
    ipAddress?: string;
  }): Promise<void> {
    await manager.query(
      `INSERT INTO audit_logs(actor_id, action, entity_type, entity_id, changes, request_id, ip_address)
       VALUES($1, $2, 'USER', $3, $4::jsonb, $5, $6)`,
      [
        input.actorId,
        input.action,
        input.entityId,
        JSON.stringify(input.changes),
        input.requestId ?? null,
        input.ipAddress ?? null,
      ],
    );
  }

  private toSummary(row: UserRow): ManagedUserSummary {
    return {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      fullName: `${row.first_name} ${row.last_name}`.trim(),
      role: row.role,
      status: row.status,
      createdAt: row.created_at,
      lastLoginAt: row.last_login_at,
    };
  }

  private toDetail(row: UserRow): ManagedUserDetail {
    return {
      ...this.toSummary(row),
      avatar: row.avatar ?? null,
      phone: row.phone ?? null,
      bio: row.bio ?? null,
      timezone: row.timezone ?? 'Asia/Bangkok',
      emailVerifiedAt: row.email_verified_at ?? null,
    };
  }
}
