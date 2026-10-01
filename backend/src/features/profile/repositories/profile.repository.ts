import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AvatarMeta, UserProfile } from '../types/profile.type';
import { RoleCode } from '../../auth/types/auth-user.type';
import { AccountStatus } from '../../users/types/managed-user.type';

type UserRow = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: RoleCode;
  status: AccountStatus;
  avatar: AvatarMeta | null;
  phone: string | null;
  bio: string | null;
  timezone: string;
  email_verified_at: Date | null;
  created_at: Date;
  last_login_at: Date | null;
};

@Injectable()
export class ProfileRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findByUserId(id: string): Promise<UserProfile | null> {
    const rows = await this.dataSource.query<UserRow[]>(
      `SELECT u.id, u.email::text, u.first_name, u.last_name, r.code AS role, u.status,
              u.avatar, u.phone, u.bio, u.timezone, u.email_verified_at, u.created_at, u.last_login_at
       FROM users u JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1 AND u.deleted_at IS NULL
       LIMIT 1`,
      [id],
    );
    return rows[0] ? this.toProfile(rows[0]) : null;
  }

  async updateProfile(id: string, fields: { firstName?: string; lastName?: string; phone?: string; bio?: string; timezone?: string }): Promise<UserProfile | null> {
    const setClauses: string[] = [];
    const values: unknown[] = [id];
    let paramIndex = 2;

    if (fields.firstName !== undefined) {
      setClauses.push(`first_name = $${paramIndex++}`);
      values.push(fields.firstName);
    }
    if (fields.lastName !== undefined) {
      setClauses.push(`last_name = $${paramIndex++}`);
      values.push(fields.lastName);
    }
    if (fields.phone !== undefined) {
      setClauses.push(`phone = $${paramIndex++}`);
      values.push(fields.phone);
    }
    if (fields.bio !== undefined) {
      setClauses.push(`bio = $${paramIndex++}`);
      values.push(fields.bio);
    }
    if (fields.timezone !== undefined) {
      setClauses.push(`timezone = $${paramIndex++}`);
      values.push(fields.timezone);
    }

    if (setClauses.length === 0) return this.findByUserId(id);

    setClauses.push('updated_at = now()');

    const query = `
      UPDATE users 
      SET ${setClauses.join(', ')} 
      WHERE id = $1 AND deleted_at IS NULL 
      RETURNING id, email::text, first_name, last_name, status, avatar, phone, bio, timezone, email_verified_at, created_at, last_login_at, (SELECT code FROM roles WHERE id = users.role_id) AS role
    `;

    const rows = await this.dataSource.query<UserRow[]>(query, values);
    return rows[0] ? this.toProfile(rows[0]) : null;
  }

  async updateAvatar(id: string, avatar: AvatarMeta): Promise<void> {
    await this.dataSource.query(
      `UPDATE users SET avatar = $2::jsonb, updated_at = now() WHERE id = $1 AND deleted_at IS NULL`,
      [id, JSON.stringify(avatar)]
    );
  }

  async removeAvatar(id: string): Promise<{ previousPublicId: string | null }> {
    const rows = await this.dataSource.query<{ avatar: AvatarMeta | null }[]>(
      `UPDATE users SET avatar = NULL, updated_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING avatar`,
      [id]
    );
    const avatar = rows[0]?.avatar;
    return { previousPublicId: avatar?.publicId ?? null };
  }

  private toProfile(row: UserRow): UserProfile {
    return {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      fullName: `${row.first_name} ${row.last_name}`.trim(),
      role: row.role,
      status: row.status,
      avatar: row.avatar,
      phone: row.phone,
      bio: row.bio,
      timezone: row.timezone,
      emailVerifiedAt: row.email_verified_at,
      createdAt: row.created_at,
      lastLoginAt: row.last_login_at,
    };
  }
}
